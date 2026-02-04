import { Location } from '../types';
import { calculateDistance } from '../utils/helper';
import { logger } from '../utils/logger';

// ============================================
// ROUTE OVERLAP TYPES
// ============================================

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface UserRoute {
  userId: string;
  pickup: Location;
  destination: Location;
  routeCoords: Coordinate[]; // Decoded polyline coordinates
}

export interface TwoUserOverlapResult {
  overlapPercentage: number;          // 0-100
  sharedSegmentLengthKm: number;
  userAFullyContained: boolean;       // A's journey fits entirely in B's route
  userBFullyContained: boolean;       // B's journey fits entirely in A's route
  overlapType: 'FULL_CONTAINMENT' | 'PARTIAL_OVERLAP' | 'NO_OVERLAP';
  details: {
    aPickupOnB: boolean;
    aDestOnB: boolean;
    bPickupOnA: boolean;
    bDestOnA: boolean;
    routeALengthKm: number;
    routeBLengthKm: number;
  };
}

export interface PoolOverlapResult {
  overlapPercentage: number;              // Overall pool compatibility (0-100)
  commonCorridorLengthKm: number;         // Length of route all users share
  pairwiseOverlaps: Map<string, number>;  // userId pair → overlap %
  fullyContainedUsers: string[];          // Users whose entire journey fits in combined route
  optimalPickupOrder: string[];           // Best order to pick up users
  routeEfficiency: number;                // Combined route vs sum of individual routes (higher = better)
  isViablePool: boolean;                  // Whether this pool makes sense
  details: {
    totalUsersCount: number;
    minPairwiseOverlap: number;
    maxPairwiseOverlap: number;
    avgPairwiseOverlap: number;
  };
}

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_THRESHOLD_METERS = 150; // Distance threshold for "on route" check
const MIN_VIABLE_OVERLAP_PERCENT = 30; // Minimum overlap to consider pool viable
const COORDINATE_SAMPLE_INTERVAL = 5; // Sample every Nth coordinate for performance

// ============================================
// ROUTE OVERLAP SERVICE
// ============================================

export class RouteOverlapService {
  private thresholdMeters: number;

  constructor(thresholdMeters: number = DEFAULT_THRESHOLD_METERS) {
    this.thresholdMeters = thresholdMeters;
  }

  /**
   * Calculate route overlap percentage between two users
   * 
   * Rules:
   * 1. If User A's pickup AND destination both lie on User B's route → 100%
   * 2. If User B's pickup AND destination both lie on User A's route → 100%
   * 3. Otherwise, calculate based on shared segment length relative to shorter route
   */
  calculateTwoUserOverlap(
    userA: UserRoute,
    userB: UserRoute,
    thresholdMeters: number = this.thresholdMeters
  ): TwoUserOverlapResult {
    // Validate inputs
    if (!userA.routeCoords?.length || !userB.routeCoords?.length) {
      logger.warn('[RouteOverlap] Missing route coordinates for overlap calculation');
      return this.createNoOverlapResult(userA, userB);
    }

    // Sample coordinates for performance (every Nth point)
    const routeACoordssampled = this.sampleCoordinates(userA.routeCoords);
    const routeBCoordssampled = this.sampleCoordinates(userB.routeCoords);

    // Check if A's pickup and destination lie on B's route
    const aPickupOnB = this.isPointOnRoute(userA.pickup, routeBCoordssampled, thresholdMeters);
    const aDestOnB = this.isPointOnRoute(userA.destination, routeBCoordssampled, thresholdMeters);
    const aFullyContained = aPickupOnB && aDestOnB;

    // Check if B's pickup and destination lie on A's route
    const bPickupOnA = this.isPointOnRoute(userB.pickup, routeACoordssampled, thresholdMeters);
    const bDestOnA = this.isPointOnRoute(userB.destination, routeACoordssampled, thresholdMeters);
    const bFullyContained = bPickupOnA && bDestOnA;

    // Check for opposite directions (both have points on each other but in wrong order)
    const oppositeDirections = this.checkOppositeDirections(userA, userB, routeACoordssampled, routeBCoordssampled, thresholdMeters);

    const routeALength = this.calculateRouteLength(userA.routeCoords);
    const routeBLength = this.calculateRouteLength(userB.routeCoords);

    const details = {
      aPickupOnB,
      aDestOnB,
      bPickupOnA,
      bDestOnA,
      routeALengthKm: routeALength,
      routeBLengthKm: routeBLength,
    };

    // If going in opposite directions, return low/no overlap
    if (oppositeDirections) {
      logger.debug(`[RouteOverlap] Users ${userA.userId} and ${userB.userId} are going in opposite directions`);
      return {
        overlapPercentage: 0,
        sharedSegmentLengthKm: 0,
        userAFullyContained: false,
        userBFullyContained: false,
        overlapType: 'NO_OVERLAP',
        details,
      };
    }

    // Rule 1 & 2: Full containment = 100%
    if (aFullyContained || bFullyContained) {
      const sharedLength = Math.min(routeALength, routeBLength);
      logger.debug(`[RouteOverlap] Full containment detected: A in B: ${aFullyContained}, B in A: ${bFullyContained}`);
      return {
        overlapPercentage: 100,
        sharedSegmentLengthKm: sharedLength,
        userAFullyContained: aFullyContained,
        userBFullyContained: bFullyContained,
        overlapType: 'FULL_CONTAINMENT',
        details,
      };
    }

    // Rule 3: Calculate partial overlap based on shared segment
    const sharedSegment = this.findSharedSegment(userA.routeCoords, userB.routeCoords, thresholdMeters);

    if (sharedSegment.lengthKm === 0) {
      return {
        overlapPercentage: 0,
        sharedSegmentLengthKm: 0,
        userAFullyContained: false,
        userBFullyContained: false,
        overlapType: 'NO_OVERLAP',
        details,
      };
    }

    // Calculate overlap relative to SHORTER route (fairer metric)
    const shorterRouteLength = Math.min(routeALength, routeBLength);
    const overlapPercentage = Math.min(100, (sharedSegment.lengthKm / shorterRouteLength) * 100);

    logger.debug(`[RouteOverlap] Partial overlap: ${overlapPercentage.toFixed(1)}% (shared: ${sharedSegment.lengthKm.toFixed(2)}km)`);

    return {
      overlapPercentage: Math.round(overlapPercentage),
      sharedSegmentLengthKm: Math.round(sharedSegment.lengthKm * 100) / 100,
      userAFullyContained: false,
      userBFullyContained: false,
      overlapType: 'PARTIAL_OVERLAP',
      details,
    };
  }

  /**
   * Calculate route overlap for a pool of 3+ users
   * 
   * Strategy:
   * 1. Calculate all pairwise overlaps
   * 2. Find common corridor (points on ALL routes)
   * 3. Determine optimal pickup order
   * 4. Calculate overall pool viability
   */
  calculatePoolOverlap(
    users: UserRoute[],
    thresholdMeters: number = this.thresholdMeters
  ): PoolOverlapResult {
    const n = users.length;

    if (n < 2) {
      logger.warn('[RouteOverlap] Need at least 2 users for pool overlap calculation');
      return this.createEmptyPoolResult(users);
    }

    if (n === 2) {
      // For 2 users, delegate to two-user calculation
      const twoUserResult = this.calculateTwoUserOverlap(users[0], users[1], thresholdMeters);
      const pairwiseOverlaps = new Map<string, number>();
      pairwiseOverlaps.set(`${users[0].userId}:${users[1].userId}`, twoUserResult.overlapPercentage);

      const fullyContained: string[] = [];
      if (twoUserResult.userAFullyContained) fullyContained.push(users[0].userId);
      if (twoUserResult.userBFullyContained) fullyContained.push(users[1].userId);

      return {
        overlapPercentage: twoUserResult.overlapPercentage,
        commonCorridorLengthKm: twoUserResult.sharedSegmentLengthKm,
        pairwiseOverlaps,
        fullyContainedUsers: fullyContained,
        optimalPickupOrder: this.calculateOptimalPickupOrder(users),
        routeEfficiency: this.calculateRouteEfficiency(users),
        isViablePool: twoUserResult.overlapPercentage >= MIN_VIABLE_OVERLAP_PERCENT,
        details: {
          totalUsersCount: 2,
          minPairwiseOverlap: twoUserResult.overlapPercentage,
          maxPairwiseOverlap: twoUserResult.overlapPercentage,
          avgPairwiseOverlap: twoUserResult.overlapPercentage,
        },
      };
    }

    // For 3+ users
    const pairwiseOverlaps = new Map<string, number>();
    const fullyContainedUsers: Set<string> = new Set();
    const allOverlapValues: number[] = [];

    // Step 1: Calculate all pairwise overlaps
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const overlap = this.calculateTwoUserOverlap(users[i], users[j], thresholdMeters);
        const pairKey = `${users[i].userId}:${users[j].userId}`;
        pairwiseOverlaps.set(pairKey, overlap.overlapPercentage);
        allOverlapValues.push(overlap.overlapPercentage);

        if (overlap.userAFullyContained) {
          fullyContainedUsers.add(users[i].userId);
        }
        if (overlap.userBFullyContained) {
          fullyContainedUsers.add(users[j].userId);
        }
      }
    }

    // Step 2: Find common corridor - points that lie on ALL routes
    const commonCorridor = this.findCommonCorridor(users, thresholdMeters);

    // Step 3: Calculate overall pool overlap percentage
    // Method: For each user, find their minimum overlap with any other user, then average
    let minOverlapSum = 0;
    for (let i = 0; i < n; i++) {
      let minOverlapForUser = 100;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const pairKey = i < j
            ? `${users[i].userId}:${users[j].userId}`
            : `${users[j].userId}:${users[i].userId}`;
          const overlap = pairwiseOverlaps.get(pairKey) || 0;
          minOverlapForUser = Math.min(minOverlapForUser, overlap);
        }
      }
      minOverlapSum += minOverlapForUser;
    }
    const overallOverlap = minOverlapSum / n;

    // Step 4: Calculate optimal pickup order
    const optimalOrder = this.calculateOptimalPickupOrder(users);

    // Step 5: Calculate route efficiency
    const routeEfficiency = this.calculateRouteEfficiency(users);

    // Calculate stats
    const minPairwiseOverlap = Math.min(...allOverlapValues);
    const maxPairwiseOverlap = Math.max(...allOverlapValues);
    const avgPairwiseOverlap = allOverlapValues.reduce((a, b) => a + b, 0) / allOverlapValues.length;

    const result: PoolOverlapResult = {
      overlapPercentage: Math.round(overallOverlap),
      commonCorridorLengthKm: Math.round(commonCorridor.lengthKm * 100) / 100,
      pairwiseOverlaps,
      fullyContainedUsers: [...fullyContainedUsers],
      optimalPickupOrder: optimalOrder,
      routeEfficiency: Math.round(routeEfficiency),
      isViablePool: minPairwiseOverlap >= MIN_VIABLE_OVERLAP_PERCENT,
      details: {
        totalUsersCount: n,
        minPairwiseOverlap: Math.round(minPairwiseOverlap),
        maxPairwiseOverlap: Math.round(maxPairwiseOverlap),
        avgPairwiseOverlap: Math.round(avgPairwiseOverlap),
      },
    };

    logger.info(`[RouteOverlap] Pool overlap calculated for ${n} users: ${result.overlapPercentage}% overall, viable: ${result.isViablePool}`);

    return result;
  }

  /**
   * Check if a point lies on a route (within threshold distance)
   * Uses perpendicular distance to line segments for accuracy
   */
  isPointOnRoute(
    point: Location,
    routeCoords: Coordinate[],
    thresholdMeters: number
  ): boolean {
    if (routeCoords.length === 0) return false;

    // Check distance to each segment
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const distToSegment = this.pointToSegmentDistance(
        point,
        routeCoords[i],
        routeCoords[i + 1]
      );
      if (distToSegment <= thresholdMeters) {
        return true;
      }
    }

    // Also check distance to individual points (for sparse coordinates)
    for (const coord of routeCoords) {
      const dist = calculateDistance(point.latitude, point.longitude, coord.lat, coord.lng) * 1000;
      if (dist <= thresholdMeters) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find the position of a point along a route (0 = start, 1 = end)
   * Used to determine direction of travel
   */
  private findPositionOnRoute(
    point: Location,
    routeCoords: Coordinate[],
    thresholdMeters: number
  ): number | null {
    if (routeCoords.length === 0) return null;

    let minDist = Infinity;
    let bestPosition = -1;
    const totalLength = this.calculateRouteLength(routeCoords);
    let cumulativeLength = 0;

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const segmentLength = calculateDistance(
        routeCoords[i].lat, routeCoords[i].lng,
        routeCoords[i + 1].lat, routeCoords[i + 1].lng
      );

      const distToSegment = this.pointToSegmentDistance(point, routeCoords[i], routeCoords[i + 1]);

      if (distToSegment < minDist && distToSegment <= thresholdMeters) {
        minDist = distToSegment;
        // Estimate position within segment
        const distToStart = calculateDistance(point.latitude, point.longitude, routeCoords[i].lat, routeCoords[i].lng);
        const positionInSegment = Math.min(1, distToStart / segmentLength);
        bestPosition = (cumulativeLength + positionInSegment * segmentLength) / totalLength;
      }

      cumulativeLength += segmentLength;
    }

    return bestPosition >= 0 ? bestPosition : null;
  }

  /**
   * Check if two users are traveling in opposite directions
   */
  private checkOppositeDirections(
    userA: UserRoute,
    userB: UserRoute,
    routeACoordssampled: Coordinate[],
    routeBCoordssampled: Coordinate[],
    thresholdMeters: number
  ): boolean {
    // Find positions of A's pickup and destination on B's route
    const aPickupPosOnB = this.findPositionOnRoute(userA.pickup, routeBCoordssampled, thresholdMeters);
    const aDestPosOnB = this.findPositionOnRoute(userA.destination, routeBCoordssampled, thresholdMeters);

    // If both points are on B's route, check direction
    if (aPickupPosOnB !== null && aDestPosOnB !== null) {
      // A is going backwards on B's route if pickup position > destination position
      if (aPickupPosOnB > aDestPosOnB + 0.1) { // 0.1 tolerance
        return true;
      }
    }

    // Find positions of B's pickup and destination on A's route
    const bPickupPosOnA = this.findPositionOnRoute(userB.pickup, routeACoordssampled, thresholdMeters);
    const bDestPosOnA = this.findPositionOnRoute(userB.destination, routeACoordssampled, thresholdMeters);

    // If both points are on A's route, check direction
    if (bPickupPosOnA !== null && bDestPosOnA !== null) {
      if (bPickupPosOnA > bDestPosOnA + 0.1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find the shared segment between two routes
   */
  private findSharedSegment(
    routeA: Coordinate[],
    routeB: Coordinate[],
    thresholdMeters: number
  ): { lengthKm: number; coords: Coordinate[] } {
    const sharedPoints: Coordinate[] = [];

    // Sample route A and find points that are close to route B
    const sampledA = this.sampleCoordinates(routeA);
    const sampledB = this.sampleCoordinates(routeB);

    for (const pointA of sampledA) {
      const pointAsLocation: Location = { latitude: pointA.lat, longitude: pointA.lng };
      if (this.isPointOnRoute(pointAsLocation, sampledB, thresholdMeters)) {
        sharedPoints.push(pointA);
      }
    }

    if (sharedPoints.length < 2) {
      return { lengthKm: 0, coords: [] };
    }

    // Calculate length of shared segment
    let lengthKm = 0;
    for (let i = 0; i < sharedPoints.length - 1; i++) {
      lengthKm += calculateDistance(
        sharedPoints[i].lat, sharedPoints[i].lng,
        sharedPoints[i + 1].lat, sharedPoints[i + 1].lng
      );
    }

    return { lengthKm, coords: sharedPoints };
  }

  /**
   * Find common corridor for 3+ users
   * Returns points that are within threshold of ALL routes
   */
  private findCommonCorridor(
    users: UserRoute[],
    thresholdMeters: number
  ): { coords: Coordinate[]; lengthKm: number } {
    if (users.length === 0) return { coords: [], lengthKm: 0 };

    // Use first user's route as reference
    const referenceRoute = this.sampleCoordinates(users[0].routeCoords);
    const otherRoutes = users.slice(1).map(u => this.sampleCoordinates(u.routeCoords));

    // Find points on reference route that lie on ALL other routes
    const commonPoints = referenceRoute.filter(point => {
      const pointAsLocation: Location = { latitude: point.lat, longitude: point.lng };
      return otherRoutes.every(route => this.isPointOnRoute(pointAsLocation, route, thresholdMeters));
    });

    if (commonPoints.length < 2) {
      return { coords: [], lengthKm: 0 };
    }

    let lengthKm = 0;
    for (let i = 0; i < commonPoints.length - 1; i++) {
      lengthKm += calculateDistance(
        commonPoints[i].lat, commonPoints[i].lng,
        commonPoints[i + 1].lat, commonPoints[i + 1].lng
      );
    }

    return { coords: commonPoints, lengthKm };
  }

  /**
   * Calculate perpendicular distance from point to line segment (in meters)
   */
  private pointToSegmentDistance(
    point: Location,
    segStart: Coordinate,
    segEnd: Coordinate
  ): number {
    const A = point.latitude - segStart.lat;
    const B = point.longitude - segStart.lng;
    const C = segEnd.lat - segStart.lat;
    const D = segEnd.lng - segStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let nearestLat: number, nearestLng: number;

    if (param < 0) {
      nearestLat = segStart.lat;
      nearestLng = segStart.lng;
    } else if (param > 1) {
      nearestLat = segEnd.lat;
      nearestLng = segEnd.lng;
    } else {
      nearestLat = segStart.lat + param * C;
      nearestLng = segStart.lng + param * D;
    }

    // Return distance in meters
    return calculateDistance(point.latitude, point.longitude, nearestLat, nearestLng) * 1000;
  }

  /**
   * Calculate total route length in km
   */
  private calculateRouteLength(coords: Coordinate[]): number {
    if (coords.length < 2) return 0;

    let length = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      length += calculateDistance(
        coords[i].lat, coords[i].lng,
        coords[i + 1].lat, coords[i + 1].lng
      );
    }
    return length;
  }

  /**
   * Sample coordinates for performance (every Nth point)
   */
  private sampleCoordinates(coords: Coordinate[]): Coordinate[] {
    if (coords.length <= 20) return coords;

    const sampled: Coordinate[] = [];
    for (let i = 0; i < coords.length; i += COORDINATE_SAMPLE_INTERVAL) {
      sampled.push(coords[i]);
    }
    // Always include last point
    if (sampled[sampled.length - 1] !== coords[coords.length - 1]) {
      sampled.push(coords[coords.length - 1]);
    }
    return sampled;
  }

  /**
   * Calculate optimal pickup order using nearest neighbor heuristic
   */
  private calculateOptimalPickupOrder(users: UserRoute[]): string[] {
    if (users.length <= 1) return users.map(u => u.userId);

    const remaining = [...users];
    const order: string[] = [];

    // Find centroid of all pickups
    const centerLat = users.reduce((sum, u) => sum + u.pickup.latitude, 0) / users.length;
    const centerLng = users.reduce((sum, u) => sum + u.pickup.longitude, 0) / users.length;

    // Start with user closest to centroid
    let minDist = Infinity;
    let startIdx = 0;
    remaining.forEach((user, idx) => {
      const dist = calculateDistance(centerLat, centerLng, user.pickup.latitude, user.pickup.longitude);
      if (dist < minDist) {
        minDist = dist;
        startIdx = idx;
      }
    });

    let current = remaining.splice(startIdx, 1)[0];
    order.push(current.userId);

    // Greedy nearest neighbor
    while (remaining.length > 0) {
      minDist = Infinity;
      let nearestIdx = 0;

      remaining.forEach((user, idx) => {
        const dist = calculateDistance(
          current.pickup.latitude, current.pickup.longitude,
          user.pickup.latitude, user.pickup.longitude
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = idx;
        }
      });

      current = remaining.splice(nearestIdx, 1)[0];
      order.push(current.userId);
    }

    return order;
  }

  /**
   * Calculate route efficiency (individual routes sum / combined route length)
   * Higher = better (e.g., 150 means combined route is 50% shorter than individual routes)
   */
  private calculateRouteEfficiency(users: UserRoute[]): number {
    if (users.length < 2) return 100;

    // Sum of individual route lengths
    const individualSum = users.reduce((sum, user) => {
      return sum + calculateDistance(
        user.pickup.latitude, user.pickup.longitude,
        user.destination.latitude, user.destination.longitude
      );
    }, 0);

    // Estimate combined route length (simplified: first pickup to last destination via all points)
    const optimalOrder = this.calculateOptimalPickupOrder(users);
    const orderedUsers = optimalOrder.map(id => users.find(u => u.userId === id)!);

    let combinedLength = 0;
    // Pickup phase
    for (let i = 0; i < orderedUsers.length - 1; i++) {
      combinedLength += calculateDistance(
        orderedUsers[i].pickup.latitude, orderedUsers[i].pickup.longitude,
        orderedUsers[i + 1].pickup.latitude, orderedUsers[i + 1].pickup.longitude
      );
    }
    // Last pickup to first destination (rough estimate)
    const lastPickup = orderedUsers[orderedUsers.length - 1].pickup;
    const firstDest = orderedUsers[0].destination;
    combinedLength += calculateDistance(
      lastPickup.latitude, lastPickup.longitude,
      firstDest.latitude, firstDest.longitude
    );
    // Dropoff phase
    for (let i = 0; i < orderedUsers.length - 1; i++) {
      combinedLength += calculateDistance(
        orderedUsers[i].destination.latitude, orderedUsers[i].destination.longitude,
        orderedUsers[i + 1].destination.latitude, orderedUsers[i + 1].destination.longitude
      );
    }

    if (combinedLength === 0) return 100;

    return (individualSum / combinedLength) * 100;
  }

  /**
   * Create empty result for no overlap case
   */
  private createNoOverlapResult(userA: UserRoute, userB: UserRoute): TwoUserOverlapResult {
    return {
      overlapPercentage: 0,
      sharedSegmentLengthKm: 0,
      userAFullyContained: false,
      userBFullyContained: false,
      overlapType: 'NO_OVERLAP',
      details: {
        aPickupOnB: false,
        aDestOnB: false,
        bPickupOnA: false,
        bDestOnA: false,
        routeALengthKm: this.calculateRouteLength(userA.routeCoords || []),
        routeBLengthKm: this.calculateRouteLength(userB.routeCoords || []),
      },
    };
  }

  /**
   * Create empty pool result
   */
  private createEmptyPoolResult(users: UserRoute[]): PoolOverlapResult {
    return {
      overlapPercentage: 0,
      commonCorridorLengthKm: 0,
      pairwiseOverlaps: new Map(),
      fullyContainedUsers: [],
      optimalPickupOrder: users.map(u => u.userId),
      routeEfficiency: 100,
      isViablePool: false,
      details: {
        totalUsersCount: users.length,
        minPairwiseOverlap: 0,
        maxPairwiseOverlap: 0,
        avgPairwiseOverlap: 0,
      },
    };
  }

  /**
   * Utility: Convert Location to Coordinate
   */
  static locationToCoordinate(loc: Location): Coordinate {
    return { lat: loc.latitude, lng: loc.longitude };
  }

  /**
   * Utility: Convert Coordinate to Location
   */
  static coordinateToLocation(coord: Coordinate): Location {
    return { latitude: coord.lat, longitude: coord.lng };
  }
}

// Export singleton instance
export const routeOverlapService = new RouteOverlapService();
