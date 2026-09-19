import crypto from 'crypto';
import { Location } from '../types';
import {
  googleMapsService,
  GoogleMapsRoute,
  TrafficMatrixCell,
  TrafficRouteMatrix,
} from './googleMaps.service';
import { unifiedCacheService } from './unifiedCache.service';
import { calculateDistance, estimateTravelTime } from '../utils/helper';
import { logger } from '../utils/logger';

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

export interface DetourViolation {
  userId: string;
  directDurationMinutes: number;
  combinedDurationMinutes: number;
  extraMinutes: number;
  extraPercent: number;
  exceededByMinutes: number;
  exceededByPercent: number;
}

export type SmartRouteProvider =
  | 'google_routes'
  | 'google_routes_matrix'
  | 'google_routes_matrix_directions'
  | 'google_directions_preview'
  | 'google_directions_fallback'
  | 'geometric_preview'
  | 'geometric_fallback';

export interface CombinedSmartRoute {
  polyline: string;
  coordinates: Array<{ lat: number; lng: number }>;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  baseDurationMinutes: number;
  durationInTraffic: number;
  trafficLevel: 'low' | 'moderate' | 'high';
  trafficAware: boolean;
  trafficCapturedAt?: string;
  waypoints: RouteWaypoint[];
  legs: Array<{
    from: RouteWaypoint;
    to: RouteWaypoint;
    distanceKm: number;
    durationMinutes: number;
    baseDurationMinutes?: number;
    polyline: string;
    instruction: string;
  }>;
  optimizationScore: number;
  savingsVsIndividual: number;
  optimizationObjective: 'traffic_time';
  constraintsSatisfied: boolean;
  detourViolations: DetourViolation[];
  routeSummary: string;
  routingProvider: SmartRouteProvider;
  routeVersion: string;
  degraded: boolean;
  pendingDriver: boolean;
  fromCache: boolean;
  cacheKey?: string;
  calculatedAt: string;
  topologyFingerprint?: string;
}

export interface SmartRouteOptions {
  driverLocation?: Location;
  optimizeFor: 'time' | 'distance' | 'balanced';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  useCoarseDriverLocation?: boolean;
}

interface OptimizationCandidate {
  order: number[];
  durationSeconds: number;
  baseDurationSeconds: number;
  distanceMeters: number;
  constraintsSatisfied: boolean;
  detourViolations: DetourViolation[];
  maxViolationRatio: number;
}

const ONE_SHOT_ROUTE_CACHE_TTL = 7200;
const MAX_POOL_MEMBERS = 4;
const MAX_EXTRA_DETOUR_SECONDS = 7 * 60;
const MAX_EXTRA_DETOUR_PERCENT = 25;
const ROUTE_VERSION = 'traffic-matrix-v5';

export class RouteCapacityError extends Error {
  readonly code = 'ROUTE_CAPACITY_EXCEEDED';
  readonly maxMembers = MAX_POOL_MEMBERS;

  constructor(memberCount: number) {
    super(`Combined routing supports at most ${MAX_POOL_MEMBERS} active members; received ${memberCount}`);
    this.name = 'RouteCapacityError';
  }
}

export class SmartRouteService {
  private requestCount = 0;
  private cacheHits = 0;
  private readonly inFlight = new Map<string, Promise<CombinedSmartRoute | null>>();

  async calculateCombinedRoute(
    members: PoolMemberRoute[],
    options: SmartRouteOptions = { optimizeFor: 'balanced' },
    poolId?: string
  ): Promise<CombinedSmartRoute | null> {
    if (members.length === 0) {
      logger.warn('[SmartRoute] No members provided for route calculation');
      return null;
    }
    if (members.length > MAX_POOL_MEMBERS) {
      throw new RouteCapacityError(members.length);
    }

    this.requestCount++;
    const topologyFingerprint = this.createTopologyFingerprint(members);
    const cacheKey = this.createCacheKey(members, options.driverLocation, poolId);
    const cached = await unifiedCacheService.get<CombinedSmartRoute>(cacheKey);
    const shouldRefreshDegradedRoute = Boolean(
      cached?.degraded
      && googleMapsService.shouldRefreshDegradedRoute(cached.calculatedAt)
    );
    if (
      cached
      && cached.topologyFingerprint === topologyFingerprint
      && !shouldRefreshDegradedRoute
    ) {
      this.cacheHits++;
      return { ...cached, fromCache: true, cacheKey };
    }
    if (shouldRefreshDegradedRoute) {
      logger.info(`[SmartRoute] Retrying traffic matrix for degraded snapshot ${cacheKey}`);
    }

    const pending = this.inFlight.get(cacheKey);
    if (pending) {
      this.cacheHits++;
      const route = await pending;
      return route ? { ...route, fromCache: true, cacheKey } : null;
    }

    const calculation = this.calculateUncached(members, options, topologyFingerprint)
      .then(async (route) => {
        // A final route without road geometry is deliberately not cached. This
        // lets the next request recover when Google has a transient failure,
        // while never exposing stop-to-stop straight lines as a real route.
        if (route && (route.polyline.length > 0 || route.coordinates.length > 1)) {
          await unifiedCacheService.set(cacheKey, route, ONE_SHOT_ROUTE_CACHE_TTL);
          return { ...route, cacheKey };
        }
        return route ? { ...route, cacheKey } : null;
      })
      .finally(() => this.inFlight.delete(cacheKey));

    this.inFlight.set(cacheKey, calculation);
    return calculation;
  }

  async clearPoolRoute(poolId: string): Promise<void> {
    await Promise.all([
      unifiedCacheService.deletePattern(`smart-route:v5:pool:${poolId}:*`),
      unifiedCacheService.deletePattern(`smart-route:v4:pool:${poolId}:*`),
      unifiedCacheService.deletePattern(`smart-route:v3:pool:${poolId}:*`),
      unifiedCacheService.deletePattern(`smart-route:v2:pool:${poolId}:*`),
      unifiedCacheService.delete(`smart-route:pool:${poolId}`),
    ]);
    logger.info(`[SmartRoute] Cleared route snapshots for pool ${poolId}`);
  }

  /** One-shot policy: location updates never create another billable route. */
  async checkAndRecalculateIfOffRoute(
    _poolId: string,
    _driverLocation: Location,
    _thresholdKm = 0.3
  ): Promise<{ recalculated: boolean; newRoute?: CombinedSmartRoute }> {
    return { recalculated: false };
  }

  /** One-shot policy: expose that the immutable route should be retained. */
  async updateRouteWithDriverLocation(
    _existingRoute: CombinedSmartRoute,
    _driverLocation: Location,
    _threshold = 0.5
  ): Promise<{ needsRecalculation: boolean; updatedRoute?: CombinedSmartRoute }> {
    return { needsRecalculation: false };
  }

  private async calculateUncached(
    members: PoolMemberRoute[],
    options: SmartRouteOptions,
    topologyFingerprint: string
  ): Promise<CombinedSmartRoute | null> {
    const calculatedAt = new Date();
    const waypoints = this.createWaypoints(members, options.driverLocation);

    if (!options.driverLocation) {
      if (!googleMapsService.isAvailable()) {
        return this.buildPreDriverFallback(waypoints, calculatedAt, topologyFingerprint);
      }

      const matrix = await googleMapsService.computeTrafficRouteMatrix(
        waypoints.map((waypoint) => waypoint.location),
        calculatedAt
      );
      if (!matrix) {
        logger.warn('[SmartRoute] Pre-driver traffic matrix unavailable; using road preview fallback');
        return this.buildPreDriverFallback(waypoints, calculatedAt, topologyFingerprint);
      }

      // Without a driver, both the first pickup and final drop-off are free
      // optimizer decisions. Pickup-before-drop-off and detour caps still apply.
      const candidate = this.selectOptimalOrder(waypoints, matrix, undefined, true);
      if (!candidate) {
        logger.warn('[SmartRoute] Pre-driver traffic matrix has no connected all-stop route');
        return this.buildPreDriverFallback(waypoints, calculatedAt, topologyFingerprint);
      }

      const orderedWaypoints = candidate.order.map((index) => waypoints[index]);
      const trafficRoute = await googleMapsService.computeFixedOrderTrafficRoute(
        orderedWaypoints.map((waypoint) => waypoint.location),
        calculatedAt
      );

      if (trafficRoute) {
        const route = this.buildGoogleRoute(
          waypoints,
          matrix,
          candidate,
          trafficRoute,
          calculatedAt,
          topologyFingerprint
        );
        return {
          ...route,
          pendingDriver: true,
          routeSummary: 'Traffic-optimized passenger route — driver leg pending',
        };
      }

      const directionsRoute = await this.fetchFixedOrderRoadRoute(orderedWaypoints);
      return this.buildMatrixBackedRoute(
        waypoints,
        matrix,
        candidate,
        calculatedAt,
        {
          provider: directionsRoute
            ? 'google_routes_matrix_directions'
            : 'google_routes_matrix',
          trafficAware: true,
          degraded: !directionsRoute,
          pendingDriver: true,
          summary: directionsRoute
            ? 'Traffic-optimized passenger route — driver leg pending'
            : 'Traffic-optimized stops — road geometry unavailable',
          geometry: directionsRoute,
        },
        topologyFingerprint
      );
    }

    if (!googleMapsService.isAvailable()) {
      return this.buildGeometricFallback(waypoints, calculatedAt, topologyFingerprint);
    }

    const locations = waypoints.map((waypoint) => waypoint.location);
    const matrix = await googleMapsService.computeTrafficRouteMatrix(locations, calculatedAt);
    if (!matrix) {
      logger.warn('[SmartRoute] Google Routes matrix unavailable; using non-traffic fallback');
      return this.buildGeometricFallback(waypoints, calculatedAt, topologyFingerprint);
    }

    const candidate = this.selectOptimalOrder(waypoints, matrix, 0, true);
    if (!candidate) {
      logger.warn('[SmartRoute] No connected route covers every required stop');
      return this.buildGeometricFallback(waypoints, calculatedAt, topologyFingerprint);
    }

    const orderedWaypoints = candidate.order.map((index) => waypoints[index]);
    const finalRoute = await googleMapsService.computeFixedOrderTrafficRoute(
      orderedWaypoints.map((waypoint) => waypoint.location),
      calculatedAt
    );

    if (!finalRoute) {
      logger.warn('[SmartRoute] Routes geometry unavailable; trying fixed-order Directions geometry');
      const directionsRoute = await this.fetchFixedOrderRoadRoute(orderedWaypoints);
      return this.buildMatrixBackedRoute(
        waypoints,
        matrix,
        candidate,
        calculatedAt,
        {
          provider: directionsRoute
            ? 'google_routes_matrix_directions'
            : 'google_routes_matrix',
          trafficAware: true,
          degraded: !directionsRoute,
          pendingDriver: false,
          summary: directionsRoute
            ? 'Traffic-optimized route'
            : 'Traffic-optimized stops — road geometry unavailable',
          geometry: directionsRoute,
        },
        topologyFingerprint
      );
    }

    return this.buildGoogleRoute(
      waypoints,
      matrix,
      candidate,
      finalRoute,
      calculatedAt,
      topologyFingerprint
    );
  }

  private createWaypoints(members: PoolMemberRoute[], driverLocation?: Location): RouteWaypoint[] {
    const waypoints: RouteWaypoint[] = [];
    if (driverLocation) {
      waypoints.push({
        id: 'driver-start',
        type: 'driver',
        userId: 'driver',
        location: driverLocation,
        order: 0,
        estimatedArrivalMinutes: 0,
        distanceFromPreviousKm: 0,
      });
    }

    [...members]
      .sort((left, right) => left.userId.localeCompare(right.userId))
      .forEach((member) => {
        waypoints.push({
          id: `pickup-${member.userId}`,
          type: 'pickup',
          userId: member.userId,
          location: member.pickup,
          address: member.pickupAddress,
          order: 0,
          estimatedArrivalMinutes: 0,
          distanceFromPreviousKm: 0,
        });
        waypoints.push({
          id: `dropoff-${member.userId}`,
          type: 'dropoff',
          userId: member.userId,
          location: member.dropoff,
          address: member.dropoffAddress,
          order: 0,
          estimatedArrivalMinutes: 0,
          distanceFromPreviousKm: 0,
        });
      });

    return waypoints;
  }

  private selectOptimalOrder(
    waypoints: RouteWaypoint[],
    matrix: TrafficRouteMatrix,
    fixedOriginIndex?: number,
    enforceDetourCaps = true
  ): OptimizationCandidate | null {
    const pickupIndex = new Map<string, number>();
    waypoints.forEach((waypoint, index) => {
      if (waypoint.type === 'pickup') pickupIndex.set(waypoint.userId, index);
    });

    const visited = Array<boolean>(waypoints.length).fill(false);
    const initialOrder: number[] = [];
    if (fixedOriginIndex !== undefined) {
      visited[fixedOriginIndex] = true;
      initialOrder.push(fixedOriginIndex);
    }

    let best: OptimizationCandidate | null = null;
    const visit = (
      order: number[],
      durationSeconds: number,
      baseDurationSeconds: number,
      distanceMeters: number
    ) => {
      if (order.length === waypoints.length) {
        const candidate = this.evaluateCandidate(
          order,
          waypoints,
          matrix,
          durationSeconds,
          baseDurationSeconds,
          distanceMeters,
          enforceDetourCaps
        );
        if (candidate && this.isBetterCandidate(candidate, best)) best = candidate;
        return;
      }

      if (best?.constraintsSatisfied && durationSeconds > best.durationSeconds) return;

      for (let index = 0; index < waypoints.length; index++) {
        if (visited[index] || waypoints[index].type === 'driver') continue;
        const waypoint = waypoints[index];
        if (waypoint.type === 'dropoff') {
          const requiredPickup = pickupIndex.get(waypoint.userId);
          if (requiredPickup === undefined || !visited[requiredPickup]) continue;
        }

        let nextDuration = durationSeconds;
        let nextBaseDuration = baseDurationSeconds;
        let nextDistance = distanceMeters;
        if (order.length > 0) {
          const edge = matrix[order[order.length - 1]]?.[index];
          if (!edge) continue;
          nextDuration += edge.durationSeconds;
          nextBaseDuration += edge.staticDurationSeconds;
          nextDistance += edge.distanceMeters;
        }

        visited[index] = true;
        order.push(index);
        visit(order, nextDuration, nextBaseDuration, nextDistance);
        order.pop();
        visited[index] = false;
      }
    };

    visit(initialOrder, 0, 0, 0);
    return best;
  }

  private evaluateCandidate(
    order: number[],
    waypoints: RouteWaypoint[],
    matrix: TrafficRouteMatrix,
    durationSeconds: number,
    baseDurationSeconds: number,
    distanceMeters: number,
    enforceDetourCaps: boolean
  ): OptimizationCandidate | null {
    const violations: DetourViolation[] = [];
    let maxViolationRatio = 0;

    for (const pickup of waypoints.filter((waypoint) => waypoint.type === 'pickup')) {
      const pickupPosition = order.findIndex((index) => waypoints[index].id === pickup.id);
      const dropoffPosition = order.findIndex(
        (index) => waypoints[index].type === 'dropoff' && waypoints[index].userId === pickup.userId
      );
      if (pickupPosition < 0 || dropoffPosition <= pickupPosition) return null;

      const pickupIndex = order[pickupPosition];
      const dropoffIndex = order[dropoffPosition];
      const direct = matrix[pickupIndex]?.[dropoffIndex];
      if (!direct) return null;

      let combinedSeconds = 0;
      for (let position = pickupPosition; position < dropoffPosition; position++) {
        const edge = matrix[order[position]]?.[order[position + 1]];
        if (!edge) return null;
        combinedSeconds += edge.durationSeconds;
      }

      const extraSeconds = Math.max(0, combinedSeconds - direct.durationSeconds);
      const extraPercent = direct.durationSeconds > 0
        ? (extraSeconds / direct.durationSeconds) * 100
        : 0;
      const minuteRatio = extraSeconds / MAX_EXTRA_DETOUR_SECONDS;
      const percentRatio = extraPercent / MAX_EXTRA_DETOUR_PERCENT;
      maxViolationRatio = Math.max(maxViolationRatio, minuteRatio, percentRatio);

      if (
        enforceDetourCaps &&
        (extraSeconds > MAX_EXTRA_DETOUR_SECONDS || extraPercent > MAX_EXTRA_DETOUR_PERCENT)
      ) {
        violations.push({
          userId: pickup.userId,
          directDurationMinutes: this.roundMinutes(direct.durationSeconds),
          combinedDurationMinutes: this.roundMinutes(combinedSeconds),
          extraMinutes: this.roundMinutes(extraSeconds),
          extraPercent: Math.round(extraPercent * 10) / 10,
          exceededByMinutes: this.roundMinutes(Math.max(0, extraSeconds - MAX_EXTRA_DETOUR_SECONDS)),
          exceededByPercent: Math.round(Math.max(0, extraPercent - MAX_EXTRA_DETOUR_PERCENT) * 10) / 10,
        });
      }
    }

    return {
      order: [...order],
      durationSeconds,
      baseDurationSeconds,
      distanceMeters,
      constraintsSatisfied: !enforceDetourCaps || violations.length === 0,
      detourViolations: violations,
      maxViolationRatio,
    };
  }

  private isBetterCandidate(
    candidate: OptimizationCandidate,
    current: OptimizationCandidate | null
  ): boolean {
    if (!current) return true;
    if (candidate.constraintsSatisfied !== current.constraintsSatisfied) {
      return candidate.constraintsSatisfied;
    }
    if (!candidate.constraintsSatisfied && candidate.maxViolationRatio !== current.maxViolationRatio) {
      return candidate.maxViolationRatio < current.maxViolationRatio;
    }
    if (candidate.durationSeconds !== current.durationSeconds) {
      return candidate.durationSeconds < current.durationSeconds;
    }
    if (candidate.distanceMeters !== current.distanceMeters) {
      return candidate.distanceMeters < current.distanceMeters;
    }
    return candidate.order.join(',') < current.order.join(',');
  }

  private buildGoogleRoute(
    sourceWaypoints: RouteWaypoint[],
    matrix: TrafficRouteMatrix,
    candidate: OptimizationCandidate,
    route: GoogleMapsRoute,
    calculatedAt: Date,
    topologyFingerprint: string
  ): CombinedSmartRoute {
    const ordered = candidate.order.map((index) => ({ ...sourceWaypoints[index] }));
    const legs = this.buildLegs(ordered, candidate.order, matrix, route);
    this.applyWaypointMetrics(ordered, legs);
    const savings = this.calculateDistanceSavings(sourceWaypoints, matrix, candidate.distanceMeters);

    return {
      polyline: route.geometry.encoded,
      coordinates: route.geometry.coordinates,
      totalDistanceKm: Math.round(route.distance * 10) / 10,
      totalDurationMinutes: route.duration,
      baseDurationMinutes: route.duration,
      durationInTraffic: route.durationInTraffic,
      trafficLevel: route.trafficLevel,
      trafficAware: true,
      trafficCapturedAt: calculatedAt.toISOString(),
      waypoints: ordered,
      legs,
      optimizationScore: candidate.constraintsSatisfied ? Math.min(100, 75 + Math.max(0, savings)) : 60,
      savingsVsIndividual: savings,
      optimizationObjective: 'traffic_time',
      constraintsSatisfied: candidate.constraintsSatisfied,
      detourViolations: candidate.detourViolations,
      routeSummary: route.summary || 'Traffic-optimized pool route',
      routingProvider: 'google_routes',
      routeVersion: ROUTE_VERSION,
      degraded: false,
      pendingDriver: false,
      fromCache: false,
      calculatedAt: calculatedAt.toISOString(),
      topologyFingerprint,
    };
  }

  private buildMatrixBackedRoute(
    sourceWaypoints: RouteWaypoint[],
    matrix: TrafficRouteMatrix,
    candidate: OptimizationCandidate,
    calculatedAt: Date,
    status: {
      provider: SmartRouteProvider;
      trafficAware: boolean;
      degraded: boolean;
      pendingDriver: boolean;
      summary: string;
      geometry?: GoogleMapsRoute | null;
    },
    topologyFingerprint: string
  ): CombinedSmartRoute {
    const ordered = candidate.order.map((index) => ({ ...sourceWaypoints[index] }));
    const legs = this.buildLegs(
      ordered,
      candidate.order,
      matrix,
      status.trafficAware ? undefined : status.geometry ?? undefined
    );
    this.applyWaypointMetrics(ordered, legs);
    const savings = this.calculateDistanceSavings(sourceWaypoints, matrix, candidate.distanceMeters);
    const baseMinutes = status.geometry && !status.trafficAware
      ? status.geometry.duration
      : Math.round(candidate.baseDurationSeconds / 60);
    const trafficMinutes = status.trafficAware
      ? Math.round(candidate.durationSeconds / 60)
      : status.geometry?.durationInTraffic ?? baseMinutes;

    return {
      polyline: status.geometry?.geometry.encoded ?? '',
      coordinates: status.geometry?.geometry.coordinates ?? [],
      totalDistanceKm: status.geometry
        ? Math.round(status.geometry.distance * 10) / 10
        : Math.round(candidate.distanceMeters / 100) / 10,
      totalDurationMinutes: baseMinutes,
      baseDurationMinutes: baseMinutes,
      durationInTraffic: trafficMinutes,
      trafficLevel: status.trafficAware
        ? this.getTrafficLevel(candidate.baseDurationSeconds, candidate.durationSeconds)
        : 'moderate',
      trafficAware: status.trafficAware,
      trafficCapturedAt: status.trafficAware ? calculatedAt.toISOString() : undefined,
      waypoints: ordered,
      legs,
      optimizationScore: candidate.constraintsSatisfied ? Math.min(100, 75 + Math.max(0, savings)) : 60,
      savingsVsIndividual: savings,
      optimizationObjective: 'traffic_time',
      constraintsSatisfied: candidate.constraintsSatisfied,
      detourViolations: candidate.detourViolations,
      routeSummary: status.summary,
      routingProvider: status.provider,
      routeVersion: ROUTE_VERSION,
      degraded: status.degraded,
      pendingDriver: status.pendingDriver,
      fromCache: false,
      calculatedAt: calculatedAt.toISOString(),
      topologyFingerprint,
    };
  }

  private async buildGeometricFallback(
    waypoints: RouteWaypoint[],
    calculatedAt: Date,
    topologyFingerprint: string
  ): Promise<CombinedSmartRoute | null> {
    const matrix = this.createGeometricMatrix(waypoints);
    const fixedOrigin = waypoints[0]?.type === 'driver' ? 0 : undefined;
    const candidate = this.selectOptimalOrder(waypoints, matrix, fixedOrigin, true);
    if (!candidate) return null;

    const orderedWaypoints = candidate.order.map((index) => waypoints[index]);
    const roadRoute = googleMapsService.isAvailable()
      ? await this.fetchFixedOrderRoadRoute(orderedWaypoints)
      : null;

    return this.buildMatrixBackedRoute(
      waypoints,
      matrix,
      candidate,
      calculatedAt,
      {
        provider: roadRoute ? 'google_directions_fallback' : 'geometric_fallback',
        trafficAware: false,
        degraded: true,
        pendingDriver: false,
        summary: roadRoute
          ? 'Road route — live traffic optimization unavailable'
          : 'Stops available — road route unavailable',
        geometry: roadRoute,
      },
      topologyFingerprint
    );
  }

  private async buildPreDriverFallback(
    waypoints: RouteWaypoint[],
    calculatedAt: Date,
    topologyFingerprint: string
  ): Promise<CombinedSmartRoute | null> {
    const matrix = this.createGeometricMatrix(waypoints);
    const candidate = this.selectOptimalOrder(waypoints, matrix, undefined, true);
    if (!candidate) return null;

    const orderedWaypoints = candidate.order.map((index) => waypoints[index]);
    const roadPreview = googleMapsService.isAvailable()
      ? await this.fetchFixedOrderRoadRoute(orderedWaypoints)
      : null;

    return this.buildMatrixBackedRoute(
      waypoints,
      matrix,
      candidate,
      calculatedAt,
      {
        provider: roadPreview ? 'google_directions_preview' : 'geometric_preview',
        trafficAware: false,
        degraded: true,
        pendingDriver: true,
        summary: roadPreview
          ? 'Road route preview — traffic optimization unavailable'
          : 'Stops preview — road geometry unavailable',
        geometry: roadPreview,
      },
      topologyFingerprint
    );
  }

  private async fetchFixedOrderRoadRoute(
    orderedWaypoints: RouteWaypoint[]
  ): Promise<GoogleMapsRoute | null> {
    if (orderedWaypoints.length < 2) return null;

    const origin = orderedWaypoints[0].location;
    const destination = orderedWaypoints[orderedWaypoints.length - 1].location;
    const intermediates = orderedWaypoints
      .slice(1, -1)
      .map((waypoint) => waypoint.location);

    // Directions keeps waypoints in request order unless the `optimize:true`
    // prefix is sent. Never send that prefix: precedence was already enforced
    // by the exact optimizer.
    return googleMapsService.getRoute(origin, destination, {
      mode: 'driving',
      alternatives: false,
      waypoints: intermediates,
      trafficModel: 'best_guess',
    });
  }

  private buildLegs(
    ordered: RouteWaypoint[],
    order: number[],
    matrix: TrafficRouteMatrix,
    route?: GoogleMapsRoute
  ): CombinedSmartRoute['legs'] {
    const legs: CombinedSmartRoute['legs'] = [];
    for (let index = 0; index < ordered.length - 1; index++) {
      const matrixLeg = matrix[order[index]]?.[order[index + 1]];
      const routeLeg = route?.legs?.[index];
      const from = ordered[index];
      const to = ordered[index + 1];
      legs.push({
        from,
        to,
        distanceKm: routeLeg?.distance ?? (matrixLeg?.distanceMeters ?? 0) / 1000,
        durationMinutes: routeLeg?.duration ?? (matrixLeg?.durationSeconds ?? 0) / 60,
        baseDurationMinutes: routeLeg?.baseDuration ?? (matrixLeg?.staticDurationSeconds ?? 0) / 60,
        polyline: routeLeg?.polyline ?? '',
        instruction: this.generateLegInstruction(to),
      });
    }
    return legs;
  }

  private applyWaypointMetrics(
    ordered: RouteWaypoint[],
    legs: CombinedSmartRoute['legs']
  ): void {
    let eta = 0;
    ordered.forEach((waypoint, index) => {
      waypoint.order = index;
      if (index === 0) {
        waypoint.estimatedArrivalMinutes = 0;
        waypoint.distanceFromPreviousKm = 0;
        return;
      }
      const leg = legs[index - 1];
      eta += leg?.durationMinutes ?? 0;
      waypoint.estimatedArrivalMinutes = Math.round(eta);
      waypoint.distanceFromPreviousKm = leg?.distanceKm ?? 0;
    });
  }

  private generateLegInstruction(to: RouteWaypoint): string {
    if (to.type === 'pickup') return `Pick up passenger at ${to.address || 'waypoint'}`;
    if (to.type === 'dropoff') return `Drop off passenger at ${to.address || 'waypoint'}`;
    return 'Continue to driver location';
  }

  private createGeometricMatrix(waypoints: RouteWaypoint[]): TrafficRouteMatrix {
    return waypoints.map((origin, originIndex) =>
      waypoints.map((destination, destinationIndex): TrafficMatrixCell => {
        const distanceKm = originIndex === destinationIndex
          ? 0
          : calculateDistance(
              origin.location.latitude,
              origin.location.longitude,
              destination.location.latitude,
              destination.location.longitude
            );
        const durationSeconds = estimateTravelTime(distanceKm) * 60;
        return {
          originIndex,
          destinationIndex,
          distanceMeters: distanceKm * 1000,
          durationSeconds,
          staticDurationSeconds: durationSeconds,
          condition: 'ROUTE_EXISTS',
        };
      })
    );
  }

  private calculateDistanceSavings(
    waypoints: RouteWaypoint[],
    matrix: TrafficRouteMatrix,
    combinedDistanceMeters: number
  ): number {
    let individualDistance = 0;
    for (let index = 0; index < waypoints.length; index++) {
      const pickup = waypoints[index];
      if (pickup.type !== 'pickup') continue;
      const dropoffIndex = waypoints.findIndex(
        (waypoint) => waypoint.type === 'dropoff' && waypoint.userId === pickup.userId
      );
      individualDistance += matrix[index]?.[dropoffIndex]?.distanceMeters ?? 0;
    }
    if (individualDistance <= 0) return 0;
    return Math.max(0, Math.round(((individualDistance - combinedDistanceMeters) / individualDistance) * 100));
  }

  private getTrafficLevel(
    baseDurationSeconds: number,
    trafficDurationSeconds: number
  ): 'low' | 'moderate' | 'high' {
    if (baseDurationSeconds <= 0) return 'low';
    const ratio = trafficDurationSeconds / baseDurationSeconds;
    if (ratio <= 1.1) return 'low';
    if (ratio <= 1.3) return 'moderate';
    return 'high';
  }

  private createTopologyFingerprint(members: PoolMemberRoute[]): string {
    const value = [...members]
      .sort((left, right) => left.userId.localeCompare(right.userId))
      .map((member) => [
        member.userId,
        member.pickup.latitude.toFixed(6),
        member.pickup.longitude.toFixed(6),
        member.dropoff.latitude.toFixed(6),
        member.dropoff.longitude.toFixed(6),
      ].join(':'))
      .join('|');
    return crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);
  }

  private createCacheKey(
    members: PoolMemberRoute[],
    driverLocation: Location | undefined,
    poolId?: string
  ): string {
    const phase = driverLocation ? 'final' : 'preview';
    const topology = this.createTopologyFingerprint(members);
    if (poolId) return `smart-route:v5:pool:${poolId}:${topology}:${phase}`;
    const driver = driverLocation
      ? `${driverLocation.latitude.toFixed(6)},${driverLocation.longitude.toFixed(6)}`
      : 'no-driver';
    return `smart-route:v5:${topology}:${driver}:${phase}`;
  }

  private roundMinutes(seconds: number): number {
    return Math.round((seconds / 60) * 10) / 10;
  }

  getStats(): { requestCount: number; cacheHits: number; hitRate: number } {
    return {
      requestCount: this.requestCount,
      cacheHits: this.cacheHits,
      hitRate: this.requestCount > 0 ? this.cacheHits / this.requestCount : 0,
    };
  }

  resetStats(): void {
    this.requestCount = 0;
    this.cacheHits = 0;
  }
}

export const smartRouteService = new SmartRouteService();
