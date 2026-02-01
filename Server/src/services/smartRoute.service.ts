import { Location, VehicleType } from '../types';
import { googleMapsService, GoogleMapsRoute } from './googleMaps.service';
import { unifiedCacheService } from './unifiedCache.service';
import { calculateDistance } from '../utils/helper';
import { logger } from '../utils/logger';
import * as h3 from 'h3-js';

// ============================================
// SMART ROUTE TYPES
// ============================================

export interface PoolMemberRoute {
  userId: string;
  pickup: Location;
  dropoff: Location;
  pickupAddress?: string;
  dropoffAddress?: string;
}

export interface RouteWaypoint {
  id: string;
  type: 'pickup' | 'dropoff' | 'driver';
  userId: string;
  location: Location;
  address?: string;
  order: number;
  estimatedArrivalMinutes: number;
  distanceFromPreviousKm: number;
}

export interface CombinedSmartRoute {
  // Route geometry for map display
  polyline: string;
  coordinates: Array<{ lat: number; lng: number }>;
  
  // Route metrics
  totalDistanceKm: number;
  totalDurationMinutes: number;
  durationInTraffic: number;
  trafficLevel: 'low' | 'moderate' | 'high';
  
  // Ordered waypoints (pickup and dropoff sequence)
  waypoints: RouteWaypoint[];
  
  // Route legs between waypoints
  legs: Array<{
    from: RouteWaypoint;
    to: RouteWaypoint;
    distanceKm: number;
    durationMinutes: number;
    polyline: string;
    instruction: string;
  }>;
  
  // Optimization info
  optimizationScore: number; // 0-100 score indicating route efficiency
  savingsVsIndividual: number; // Percentage savings vs individual routes
  routeSummary: string;
  
  // Cache info
  fromCache: boolean;
  cacheKey?: string;
  calculatedAt: string;
}

export interface SmartRouteOptions {
  driverLocation?: Location;
  optimizeFor: 'time' | 'distance' | 'balanced';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  useCoarseDriverLocation?: boolean;
}

// ============================================
// SMART ROUTE SERVICE
// ============================================

const SMART_ROUTE_CACHE_TTL = 300; // 5 minutes cache (default)
const ACTIVE_ROUTE_CACHE_TTL = 900; // 15 minutes cache for active trips
const MAX_WAYPOINTS_PER_REQUEST = 23; // Google Maps limit is 25 waypoints

export class SmartRouteService {
  private requestCount = 0;
  private cacheHits = 0;

  /**
   * Calculate a combined smart route for all pool members
   * Uses Google Maps Directions API with waypoint optimization
   * Implements caching to minimize API costs
   */
  async calculateCombinedRoute(
    members: PoolMemberRoute[],
    options: SmartRouteOptions = { optimizeFor: 'balanced' }
  ): Promise<CombinedSmartRoute | null> {
    if (members.length === 0) {
      logger.warn('[SmartRoute] No members provided for route calculation');
      return null;
    }

    this.requestCount++;

    // Generate cache key based on all member locations
    const cacheKey = this.generateCacheKey(members, options);
    
    // Check cache first
    const cached = await unifiedCacheService.get<CombinedSmartRoute>(cacheKey);
    if (cached) {
      this.cacheHits++;
      logger.debug(`[SmartRoute] Cache hit for ${members.length} members route`);
      
      const elapsedMinutes = (Date.now() - new Date(cached.calculatedAt).getTime()) / 60000;
      if (elapsedMinutes > 1) {
        return {
          ...cached,
          durationInTraffic: Math.max(1, Math.round(cached.durationInTraffic - elapsedMinutes)),
          totalDurationMinutes: Math.max(1, Math.round(cached.totalDurationMinutes - elapsedMinutes)),
          fromCache: true,
          cacheKey,
        };
      }
      
      return { ...cached, fromCache: true, cacheKey };
    }

    try {
      // Build ordered waypoints using intelligent ordering algorithm
      const orderedWaypoints = this.orderWaypointsOptimally(members, options.driverLocation);

      if (orderedWaypoints.length === 0) {
        logger.warn('[SmartRoute] Could not order waypoints');
        return null;
      }

      // Calculate route using Google Maps
      const route = await this.fetchOptimizedRoute(orderedWaypoints, options);
      
      if (!route) {
        logger.warn('[SmartRoute] Failed to fetch route from Google Maps, using fallback');
        return this.calculateFallbackRoute(orderedWaypoints, options);
      }

      // Cache the result
      const ttl = options.useCoarseDriverLocation ? ACTIVE_ROUTE_CACHE_TTL : SMART_ROUTE_CACHE_TTL;
      await unifiedCacheService.set(cacheKey, route, ttl);
      logger.info(`[SmartRoute] Calculated and cached route for ${members.length} members (TTL: ${ttl}s)`);

      return { ...route, fromCache: false, cacheKey, calculatedAt: new Date().toISOString() };
    } catch (error) {
      logger.error('[SmartRoute] Error calculating combined route:', error);
      return this.calculateFallbackRoute(
        this.orderWaypointsOptimally(members, options.driverLocation),
        options
      );
    }
  }

  /**
   * Update route with driver's real-time location
   * Only recalculates if driver is significantly off-route
   */
  async updateRouteWithDriverLocation(
    existingRoute: CombinedSmartRoute,
    driverLocation: Location,
    threshold: number = 0.5 // km
  ): Promise<{ needsRecalculation: boolean; updatedRoute?: CombinedSmartRoute }> {
    // Find distance from driver to nearest waypoint on route
    const distanceToRoute = this.calculateDistanceToRoute(driverLocation, existingRoute.coordinates);

    if (distanceToRoute <= threshold) {
      // Driver is on route, no recalculation needed
      return { needsRecalculation: false };
    }

    logger.info(`[SmartRoute] Driver is ${distanceToRoute.toFixed(2)}km off route, recalculating...`);

    // Recalculate route from driver's current position
    const remainingWaypoints = existingRoute.waypoints.filter(wp => wp.type !== 'driver');
    
    // Add driver as first waypoint
    const updatedWaypoints: RouteWaypoint[] = [
      {
        id: 'driver-current',
        type: 'driver',
        userId: 'driver',
        location: driverLocation,
        order: 0,
        estimatedArrivalMinutes: 0,
        distanceFromPreviousKm: 0,
      },
      ...remainingWaypoints.map((wp, idx) => ({ ...wp, order: idx + 1 })),
    ];

    const updatedRoute = await this.fetchOptimizedRoute(updatedWaypoints, { optimizeFor: 'time' });

    return {
      needsRecalculation: true,
      updatedRoute: updatedRoute || undefined,
    };
  }

  /**
   * Order waypoints optimally using nearest neighbor with pickup-before-dropoff constraint
   * This minimizes total travel distance while ensuring each passenger is picked up before dropped off
   */
  private orderWaypointsOptimally(
    members: PoolMemberRoute[],
    driverLocation?: Location
  ): RouteWaypoint[] {
    const waypoints: RouteWaypoint[] = [];
    const pickups: Map<string, RouteWaypoint> = new Map();
    const dropoffs: Map<string, RouteWaypoint> = new Map();

    // Create waypoints for all members
    members.forEach((member) => {
      const pickupWp: RouteWaypoint = {
        id: `pickup-${member.userId}`,
        type: 'pickup',
        userId: member.userId,
        location: member.pickup,
        address: member.pickupAddress,
        order: 0,
        estimatedArrivalMinutes: 0,
        distanceFromPreviousKm: 0,
      };
      pickups.set(member.userId, pickupWp);

      const dropoffWp: RouteWaypoint = {
        id: `dropoff-${member.userId}`,
        type: 'dropoff',
        userId: member.userId,
        location: member.dropoff,
        address: member.dropoffAddress,
        order: 0,
        estimatedArrivalMinutes: 0,
        distanceFromPreviousKm: 0,
      };
      dropoffs.set(member.userId, dropoffWp);
    });

    // Start from driver location or first pickup
    let currentLocation: Location;
    if (driverLocation) {
      const driverWp: RouteWaypoint = {
        id: 'driver-start',
        type: 'driver',
        userId: 'driver',
        location: driverLocation,
        order: 0,
        estimatedArrivalMinutes: 0,
        distanceFromPreviousKm: 0,
      };
      waypoints.push(driverWp);
      currentLocation = driverLocation;
    } else {
      // Find closest pickup to center of all pickups
      const centerLat = members.reduce((sum, m) => sum + m.pickup.latitude, 0) / members.length;
      const centerLng = members.reduce((sum, m) => sum + m.pickup.longitude, 0) / members.length;
      
      let closestPickup: RouteWaypoint | null = null;
      let closestDistance = Infinity;

      pickups.forEach((pickup) => {
        const dist = calculateDistance(centerLat, centerLng, pickup.location.latitude, pickup.location.longitude);
        if (dist < closestDistance) {
          closestDistance = dist;
          closestPickup = pickup;
        }
      });

      if (closestPickup !== null) {
        const firstPickup = closestPickup as RouteWaypoint;
        currentLocation = firstPickup.location;
        waypoints.push(firstPickup);
        pickups.delete(firstPickup.userId);
      } else {
        return [];
      }
    }

    const pickedUp = new Set<string>();
    waypoints.filter(wp => wp.type === 'pickup').forEach(wp => pickedUp.add(wp.userId));

    // Greedy nearest neighbor with constraints
    while (pickups.size > 0 || dropoffs.size > 0) {
      let bestWaypoint: RouteWaypoint | null = null;
      let bestDistance = Infinity;

      // Consider remaining pickups
      pickups.forEach((pickup) => {
        const dist = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          pickup.location.latitude,
          pickup.location.longitude
        );
        if (dist < bestDistance) {
          bestDistance = dist;
          bestWaypoint = pickup;
        }
      });

      // Consider dropoffs only for picked-up passengers
      dropoffs.forEach((dropoff, userId) => {
        if (pickedUp.has(userId)) {
          const dist = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            dropoff.location.latitude,
            dropoff.location.longitude
          );
          if (dist < bestDistance) {
            bestDistance = dist;
            bestWaypoint = dropoff;
          }
        }
      });

      if (!bestWaypoint) break;

      const selectedWaypoint = bestWaypoint as RouteWaypoint;
      selectedWaypoint.order = waypoints.length;
      selectedWaypoint.distanceFromPreviousKm = bestDistance;
      waypoints.push(selectedWaypoint);
      currentLocation = selectedWaypoint.location;

      if (selectedWaypoint.type === 'pickup') {
        pickedUp.add(selectedWaypoint.userId);
        pickups.delete(selectedWaypoint.userId);
      } else {
        dropoffs.delete(selectedWaypoint.userId);
      }
    }

    return waypoints;
  }

  /**
   * Fetch optimized route from Google Maps Directions API
   */
  private async fetchOptimizedRoute(
    waypoints: RouteWaypoint[],
    options: SmartRouteOptions
  ): Promise<CombinedSmartRoute | null> {
    if (!googleMapsService.isAvailable()) {
      logger.warn('[SmartRoute] Google Maps API not available');
      return null;
    }

    if (waypoints.length < 2) {
      logger.warn('[SmartRoute] Need at least 2 waypoints for route');
      return null;
    }

    // Limit waypoints to Google Maps maximum
    const limitedWaypoints = waypoints.slice(0, MAX_WAYPOINTS_PER_REQUEST);

    const origin = limitedWaypoints[0].location;
    const destination = limitedWaypoints[limitedWaypoints.length - 1].location;
    const intermediateWaypoints = limitedWaypoints.slice(1, -1).map(wp => wp.location);

    try {
      // Use optimized waypoints request
      const result = await googleMapsService.getBestRouteWithTraffic(
        origin,
        destination,
        intermediateWaypoints.length > 0 ? intermediateWaypoints : undefined
      );

      if (!result) {
        return null;
      }

      const { bestRoute } = result;

      // Build legs from route data
      const legs = this.buildRouteLegs(limitedWaypoints, bestRoute);

      // Calculate ETA for each waypoint
      let cumulativeMinutes = 0;
      limitedWaypoints.forEach((wp, idx) => {
        if (idx > 0 && legs[idx - 1]) {
          cumulativeMinutes += legs[idx - 1].durationMinutes;
        }
        wp.estimatedArrivalMinutes = Math.round(cumulativeMinutes);
      });

      // Calculate optimization metrics
      const individualRouteDistance = this.calculateIndividualRoutesTotal(
        waypoints.filter(wp => wp.type !== 'driver')
      );
      const savingsPercent = individualRouteDistance > 0
        ? Math.round(((individualRouteDistance - bestRoute.distance) / individualRouteDistance) * 100)
        : 0;

      return {
        polyline: bestRoute.geometry.encoded,
        coordinates: bestRoute.geometry.coordinates,
        totalDistanceKm: Math.round(bestRoute.distance * 10) / 10,
        totalDurationMinutes: bestRoute.duration,
        durationInTraffic: bestRoute.durationInTraffic,
        trafficLevel: bestRoute.trafficLevel,
        waypoints: limitedWaypoints,
        legs,
        optimizationScore: Math.min(100, 50 + savingsPercent),
        savingsVsIndividual: Math.max(0, savingsPercent),
        routeSummary: bestRoute.summary || 'Optimized pool route',
        fromCache: false,
        calculatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[SmartRoute] Error fetching route from Google Maps:', error);
      return null;
    }
  }

  /**
   * Build route legs from waypoints and Google Maps route data
   */
  private buildRouteLegs(
    waypoints: RouteWaypoint[],
    route: GoogleMapsRoute
  ): CombinedSmartRoute['legs'] {
    const legs: CombinedSmartRoute['legs'] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];

      // Use route steps if available, otherwise estimate
      const step = route.steps?.[i];
      
      legs.push({
        from,
        to,
        distanceKm: step?.distance || calculateDistance(
          from.location.latitude,
          from.location.longitude,
          to.location.latitude,
          to.location.longitude
        ),
        durationMinutes: step?.duration || 5, // Default 5 min per leg
        polyline: step?.polyline || '',
        instruction: this.generateLegInstruction(from, to),
      });
    }

    return legs;
  }

  /**
   * Generate human-readable instruction for a route leg
   */
  private generateLegInstruction(from: RouteWaypoint, to: RouteWaypoint): string {
    const fromDesc = from.type === 'driver' ? 'current location' : 
      `${from.type === 'pickup' ? 'pickup' : 'dropoff'} for passenger`;
    const toDesc = to.type === 'pickup' ? 'Pick up passenger' : 'Drop off passenger';
    
    return `${toDesc} at ${to.address || 'waypoint'}`;
  }

  /**
   * Calculate fallback route when Google Maps is unavailable
   */
  private calculateFallbackRoute(
    waypoints: RouteWaypoint[],
    options: SmartRouteOptions
  ): CombinedSmartRoute {
    let totalDistance = 0;
    const legs: CombinedSmartRoute['legs'] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      const distance = calculateDistance(
        from.location.latitude,
        from.location.longitude,
        to.location.latitude,
        to.location.longitude
      );
      totalDistance += distance;

      legs.push({
        from,
        to,
        distanceKm: distance,
        durationMinutes: Math.ceil((distance / 25) * 60), // Assume 25 km/h average
        polyline: '',
        instruction: this.generateLegInstruction(from, to),
      });
    }

    // Calculate ETA for each waypoint
    let cumulativeMinutes = 0;
    waypoints.forEach((wp, idx) => {
      if (idx > 0 && legs[idx - 1]) {
        cumulativeMinutes += legs[idx - 1].durationMinutes;
      }
      wp.estimatedArrivalMinutes = Math.round(cumulativeMinutes);
    });

    const totalDuration = Math.ceil((totalDistance / 25) * 60);

    // Generate simple polyline from waypoints
    const coordinates = waypoints.map(wp => ({
      lat: wp.location.latitude,
      lng: wp.location.longitude,
    }));

    return {
      polyline: '',
      coordinates,
      totalDistanceKm: Math.round(totalDistance * 10) / 10,
      totalDurationMinutes: totalDuration,
      durationInTraffic: totalDuration,
      trafficLevel: 'moderate',
      waypoints,
      legs,
      optimizationScore: 50, // Base score for fallback
      savingsVsIndividual: 0,
      routeSummary: 'Estimated route (offline)',
      fromCache: false,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate total distance if each rider took individual routes
   */
  private calculateIndividualRoutesTotal(waypoints: RouteWaypoint[]): number {
    let total = 0;
    const userPickups: Map<string, RouteWaypoint> = new Map();
    const userDropoffs: Map<string, RouteWaypoint> = new Map();

    waypoints.forEach(wp => {
      if (wp.type === 'pickup') {
        userPickups.set(wp.userId, wp);
      } else if (wp.type === 'dropoff') {
        userDropoffs.set(wp.userId, wp);
      }
    });

    userPickups.forEach((pickup, userId) => {
      const dropoff = userDropoffs.get(userId);
      if (dropoff) {
        total += calculateDistance(
          pickup.location.latitude,
          pickup.location.longitude,
          dropoff.location.latitude,
          dropoff.location.longitude
        );
      }
    });

    return total;
  }

  /**
   * Calculate distance from a point to the nearest point on the route
   */
  private calculateDistanceToRoute(
    point: Location,
    routeCoordinates: Array<{ lat: number; lng: number }>
  ): number {
    let minDistance = Infinity;

    for (const coord of routeCoordinates) {
      const dist = calculateDistance(
        point.latitude,
        point.longitude,
        coord.lat,
        coord.lng
      );
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    return minDistance;
  }

  /**
   * Generate cache key for route based on member locations
   */
  private generateCacheKey(members: PoolMemberRoute[], options: SmartRouteOptions): string {
    // Use H3 indexes at resolution 9 for location hashing
    const locationHashes = members.map(m => {
      const pickupH3 = h3.latLngToCell(m.pickup.latitude, m.pickup.longitude, 9);
      const dropoffH3 = h3.latLngToCell(m.dropoff.latitude, m.dropoff.longitude, 7);
      return `${pickupH3}:${dropoffH3}`;
    }).sort().join('|');

    const driverRes = options.useCoarseDriverLocation ? 7 : 9;
    const driverHash = options.driverLocation
      ? h3.latLngToCell(options.driverLocation.latitude, options.driverLocation.longitude, driverRes)
      : 'no-driver';

    return `smart-route:${locationHashes}:${driverHash}:${options.optimizeFor}`;
  }

  /**
   * Get service statistics
   */
  getStats(): { requestCount: number; cacheHits: number; hitRate: number } {
    return {
      requestCount: this.requestCount,
      cacheHits: this.cacheHits,
      hitRate: this.requestCount > 0 ? this.cacheHits / this.requestCount : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.requestCount = 0;
    this.cacheHits = 0;
  }
}

export const smartRouteService = new SmartRouteService();
