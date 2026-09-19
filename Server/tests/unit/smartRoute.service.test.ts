import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PoolMemberRoute,
  RouteCapacityError,
  SmartRouteService,
} from '../../src/services/smartRoute.service';
import {
  GoogleMapsRoute,
  TrafficRouteMatrix,
} from '../../src/services/googleMaps.service';
import { unifiedCacheService } from '../../src/services/unifiedCache.service';
import { googleMapsService } from '../../src/services/googleMaps.service';

vi.mock('../../src/services/unifiedCache.service', () => ({
  unifiedCacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    deletePattern: vi.fn(),
  },
}));

vi.mock('../../src/services/googleMaps.service', () => ({
  googleMapsService: {
    isAvailable: vi.fn(),
    shouldRefreshDegradedRoute: vi.fn(),
    computeTrafficRouteMatrix: vi.fn(),
    computeFixedOrderTrafficRoute: vi.fn(),
    getRoute: vi.fn(),
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const members: PoolMemberRoute[] = [
  {
    userId: 'a',
    pickup: { latitude: 23.81, longitude: 90.41 },
    dropoff: { latitude: 23.82, longitude: 90.42 },
    pickupAddress: 'Pickup A',
    dropoffAddress: 'Dropoff A',
  },
  {
    userId: 'b',
    pickup: { latitude: 23.83, longitude: 90.43 },
    dropoff: { latitude: 23.84, longitude: 90.44 },
    pickupAddress: 'Pickup B',
    dropoffAddress: 'Dropoff B',
  },
];

const driver = { latitude: 23.80, longitude: 90.40 };

function createMatrix(size: number, defaultSeconds = 1_000): TrafficRouteMatrix {
  return Array.from({ length: size }, (_, originIndex) =>
    Array.from({ length: size }, (_, destinationIndex) => ({
      originIndex,
      destinationIndex,
      distanceMeters: originIndex === destinationIndex ? 0 : defaultSeconds,
      durationSeconds: originIndex === destinationIndex ? 0 : defaultSeconds,
      staticDurationSeconds: originIndex === destinationIndex ? 0 : Math.max(1, defaultSeconds - 10),
      condition: 'ROUTE_EXISTS',
    }))
  );
}

function setEdge(
  matrix: TrafficRouteMatrix,
  from: number,
  to: number,
  seconds: number,
  distanceMeters = seconds
): void {
  matrix[from][to] = {
    originIndex: from,
    destinationIndex: to,
    distanceMeters,
    durationSeconds: seconds,
    staticDurationSeconds: Math.max(1, seconds - 10),
    condition: 'ROUTE_EXISTS',
  };
}

function createFastMatrix(): TrafficRouteMatrix {
  // Waypoint indexes: 0 driver, 1 pickup-a, 2 dropoff-a,
  // 3 pickup-b, 4 dropoff-b. This intentionally makes the globally fastest
  // valid order driver -> B pickup -> A pickup -> A dropoff -> B dropoff.
  const matrix = createMatrix(5);
  setEdge(matrix, 0, 3, 60, 600);
  setEdge(matrix, 3, 1, 60, 600);
  setEdge(matrix, 1, 2, 60, 600);
  setEdge(matrix, 2, 4, 60, 600);
  setEdge(matrix, 3, 4, 180, 1_800); // B's direct baseline
  return matrix;
}

function createFinalRoute(): GoogleMapsRoute {
  return {
    distance: 2.4,
    duration: 3,
    durationInTraffic: 4,
    geometry: {
      encoded: 'encoded-final-route',
      coordinates: [
        { lat: driver.latitude, lng: driver.longitude },
        { lat: members[1].dropoff.latitude, lng: members[1].dropoff.longitude },
      ],
    },
    bounds: {
      northeast: { latitude: 23.84, longitude: 90.44 },
      southwest: { latitude: 23.80, longitude: 90.40 },
    },
    legs: Array.from({ length: 4 }, () => ({
      distance: 0.6,
      duration: 1,
      baseDuration: 0.8,
      polyline: 'leg',
    })),
    summary: 'Exact traffic route',
    trafficLevel: 'moderate',
  };
}

describe('SmartRouteService', () => {
  let service: SmartRouteService;

  beforeEach(() => {
    service = new SmartRouteService();
    vi.clearAllMocks();
    vi.mocked(unifiedCacheService.get).mockResolvedValue(null);
    vi.mocked(unifiedCacheService.set).mockResolvedValue(true);
    vi.mocked(unifiedCacheService.delete).mockResolvedValue(true);
    vi.mocked(unifiedCacheService.deletePattern).mockResolvedValue(0);
    vi.mocked(googleMapsService.isAvailable).mockReturnValue(true);
    vi.mocked(googleMapsService.shouldRefreshDegradedRoute).mockReturnValue(false);
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockResolvedValue(createFastMatrix());
    vi.mocked(googleMapsService.computeFixedOrderTrafficRoute).mockResolvedValue(createFinalRoute());
    vi.mocked(googleMapsService.getRoute).mockResolvedValue(createFinalRoute());
  });

  it('returns null when there are no members', async () => {
    await expect(service.calculateCombinedRoute([])).resolves.toBeNull();
  });

  it('returns a cached traffic-matrix optimized route before driver assignment', async () => {
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockResolvedValue(createMatrix(4, 60));
    const route = await service.calculateCombinedRoute(members, { optimizeFor: 'time' }, 'pool-1');

    expect(route).not.toBeNull();
    expect(route?.pendingDriver).toBe(true);
    expect(route?.trafficAware).toBe(true);
    expect(route?.routingProvider).toBe('google_routes');
    expect(route?.trafficCapturedAt).toBeDefined();
    expect(route?.coordinates.length).toBeGreaterThan(1);
    expect(route?.polyline).toBe('encoded-final-route');
    expect(googleMapsService.computeTrafficRouteMatrix).toHaveBeenCalledOnce();
    expect(googleMapsService.computeFixedOrderTrafficRoute).toHaveBeenCalledOnce();
    expect(googleMapsService.getRoute).not.toHaveBeenCalled();
    expect(unifiedCacheService.set).toHaveBeenCalledWith(
      expect.stringMatching(/^smart-route:v5:pool:pool-1:[a-f0-9]{20}:preview$/),
      expect.any(Object),
      7200
    );

    for (const member of members) {
      const pickup = route!.waypoints.findIndex((waypoint) => waypoint.id === `pickup-${member.userId}`);
      const dropoff = route!.waypoints.findIndex((waypoint) => waypoint.id === `dropoff-${member.userId}`);
      expect(pickup).toBeLessThan(dropoff);
    }
  });

  it('selects the globally fastest first pickup and final drop-off before driver assignment', async () => {
    // No-driver indexes: 0 pickup-a, 1 dropoff-a, 2 pickup-b, 3 dropoff-b.
    const matrix = createMatrix(4, 1_000);
    setEdge(matrix, 2, 0, 20, 200);
    setEdge(matrix, 0, 1, 20, 200);
    setEdge(matrix, 1, 3, 20, 200);
    setEdge(matrix, 2, 3, 120, 1_200); // B's direct comparison baseline.
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockResolvedValue(matrix);

    const route = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time' },
      'pool-pre-driver-order'
    );

    expect(route?.waypoints.map((waypoint) => waypoint.id)).toEqual([
      'pickup-b',
      'pickup-a',
      'dropoff-a',
      'dropoff-b',
    ]);
    expect(route?.constraintsSatisfied).toBe(true);
    expect(route?.pendingDriver).toBe(true);
    expect(route?.trafficAware).toBe(true);
  });

  it('does not fabricate or cache preview geometry when traffic and Directions providers fail', async () => {
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockResolvedValue(null);
    vi.mocked(googleMapsService.getRoute).mockResolvedValue(null);

    const route = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time' },
      'pool-preview-failure'
    );

    expect(route?.routingProvider).toBe('geometric_preview');
    expect(route?.degraded).toBe(true);
    expect(route?.coordinates).toEqual([]);
    expect(route?.polyline).toBe('');
    expect(unifiedCacheService.set).not.toHaveBeenCalled();
  });

  it('selects the globally fastest valid matrix order and preserves it in the final request', async () => {
    const route = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-1'
    );

    expect(route?.waypoints.map((waypoint) => waypoint.id)).toEqual([
      'driver-start',
      'pickup-b',
      'pickup-a',
      'dropoff-a',
      'dropoff-b',
    ]);
    expect(route?.constraintsSatisfied).toBe(true);
    expect(route?.trafficAware).toBe(true);
    expect(route?.routingProvider).toBe('google_routes');
    expect(route?.polyline).toBe('encoded-final-route');
    expect(route?.legs).toHaveLength(4);
    expect(route?.waypoints.map((waypoint) => waypoint.order)).toEqual([0, 1, 2, 3, 4]);

    const orderedLocations = vi.mocked(googleMapsService.computeFixedOrderTrafficRoute).mock.calls[0][0];
    expect(orderedLocations).toEqual(route?.waypoints.map((waypoint) => waypoint.location));
  });

  it('uses distance as the tie-breaker when traffic duration is equal', async () => {
    const matrix = createMatrix(5, 600);
    // Two valid routes have the same four-minute duration. The B-first route is shorter.
    for (const [from, to] of [[0, 1], [1, 2], [2, 3], [3, 4]] as Array<[number, number]>) {
      setEdge(matrix, from, to, 60, 900);
    }
    for (const [from, to] of [[0, 3], [3, 4], [4, 1], [1, 2]] as Array<[number, number]>) {
      setEdge(matrix, from, to, 60, 300);
    }
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockResolvedValue(matrix);

    const route = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-distance-tie'
    );

    expect(route?.waypoints[1].id).toBe('pickup-b');
  });

  it('chooses a slower route when the raw fastest route violates a passenger detour cap', async () => {
    const matrix = createMatrix(5, 1_000);
    // Raw fastest: driver -> A pickup -> B pickup -> B dropoff -> A dropoff.
    setEdge(matrix, 0, 1, 30);
    setEdge(matrix, 1, 3, 30);
    setEdge(matrix, 3, 4, 30);
    setEdge(matrix, 4, 2, 600); // A is onboard > 7 minutes beyond direct.
    setEdge(matrix, 1, 2, 60); // A direct baseline.
    setEdge(matrix, 3, 4, 30); // B direct baseline.
    // Feasible but slower service-one-at-a-time route.
    setEdge(matrix, 2, 3, 900);
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockResolvedValue(matrix);

    const route = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-caps'
    );

    expect(route?.constraintsSatisfied).toBe(true);
    expect(route?.waypoints.map((waypoint) => waypoint.id)).toEqual([
      'driver-start',
      'pickup-a',
      'dropoff-a',
      'pickup-b',
      'dropoff-b',
    ]);
  });

  it('returns the least-violating connected route with explicit warnings when caps are infeasible', async () => {
    const matrix = createMatrix(5, 1_000);
    // Remove all travel edges, then expose exactly one complete order. Direct
    // pickup/dropoff cells remain available only as comparison baselines.
    for (let from = 0; from < 5; from++) {
      for (let to = 0; to < 5; to++) {
        if (from !== to) matrix[from][to] = null;
      }
    }
    setEdge(matrix, 0, 1, 30);
    setEdge(matrix, 1, 3, 30);
    setEdge(matrix, 3, 2, 600);
    setEdge(matrix, 2, 4, 30);
    setEdge(matrix, 1, 2, 60); // A direct comparison
    setEdge(matrix, 3, 4, 60); // B direct comparison
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockResolvedValue(matrix);

    const route = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-infeasible'
    );

    expect(route?.constraintsSatisfied).toBe(false);
    expect(route?.detourViolations.map((violation) => violation.userId)).toContain('a');
    expect(route?.waypoints).toHaveLength(5);
  });

  it('keeps cached duration immutable regardless of elapsed wall-clock time', async () => {
    const initial = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-cache'
    );
    expect(initial).not.toBeNull();
    const cached = { ...initial!, calculatedAt: '2020-01-01T00:00:00.000Z' };
    vi.mocked(unifiedCacheService.get).mockResolvedValue(cached);
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockClear();

    const result = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-cache'
    );

    expect(result?.fromCache).toBe(true);
    expect(result?.durationInTraffic).toBe(cached.durationInTraffic);
    expect(result?.totalDurationMinutes).toBe(cached.totalDurationMinutes);
    expect(googleMapsService.computeTrafficRouteMatrix).not.toHaveBeenCalled();
  });

  it('retries and replaces a degraded cache when the Routes provider becomes retryable', async () => {
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockResolvedValueOnce(null);
    const degraded = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-provider-recovery'
    );
    expect(degraded?.degraded).toBe(true);

    vi.mocked(unifiedCacheService.get).mockResolvedValue(degraded);
    vi.mocked(googleMapsService.shouldRefreshDegradedRoute).mockReturnValue(true);
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockClear();
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockResolvedValue(createFastMatrix());

    const recovered = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-provider-recovery'
    );

    expect(googleMapsService.computeTrafficRouteMatrix).toHaveBeenCalledOnce();
    expect(recovered?.routingProvider).toBe('google_routes');
    expect(recovered?.trafficAware).toBe(true);
    expect(recovered?.degraded).toBe(false);
    expect(recovered?.fromCache).toBe(false);
  });

  it('does not reuse a cached route when exact member topology changed', async () => {
    const initial = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-topology'
    );
    vi.mocked(unifiedCacheService.get).mockResolvedValue(initial);
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockClear();
    const moved = structuredClone(members);
    moved[0].pickup.latitude += 0.001;

    await service.calculateCombinedRoute(
      moved,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-topology'
    );

    expect(googleMapsService.computeTrafficRouteMatrix).toHaveBeenCalledOnce();
  });

  it('coalesces simultaneous cold requests into one matrix and final route calculation', async () => {
    let resolveMatrix!: (matrix: TrafficRouteMatrix) => void;
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockImplementation(
      () => new Promise((resolve) => { resolveMatrix = resolve; })
    );

    const first = service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-concurrent'
    );
    const second = service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-concurrent'
    );
    await vi.waitFor(() => expect(googleMapsService.computeTrafficRouteMatrix).toHaveBeenCalledOnce());
    resolveMatrix(createFastMatrix());

    const [firstRoute, secondRoute] = await Promise.all([first, second]);
    expect(firstRoute?.fromCache).toBe(false);
    expect(secondRoute?.fromCache).toBe(true);
    expect(googleMapsService.computeFixedOrderTrafficRoute).toHaveBeenCalledOnce();
  });

  it('falls back without falsely claiming traffic awareness when Routes API fails', async () => {
    vi.mocked(googleMapsService.computeTrafficRouteMatrix).mockResolvedValue(null);

    const route = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-fallback'
    );

    expect(route?.trafficAware).toBe(false);
    expect(route?.degraded).toBe(true);
    expect(route?.routingProvider).toBe('google_directions_fallback');
    expect(route?.coordinates.length).toBeGreaterThan(1);
    expect(route?.trafficCapturedAt).toBeUndefined();
    expect(googleMapsService.getRoute).toHaveBeenCalledOnce();
    expect(unifiedCacheService.set).toHaveBeenCalledWith(
      expect.stringMatching(/^smart-route:v5:pool:pool-fallback:[a-f0-9]{20}:final$/),
      expect.objectContaining({ degraded: true }),
      7200
    );
  });

  it('retains matrix traffic metrics and uses fixed-order Directions geometry if Routes geometry fails', async () => {
    vi.mocked(googleMapsService.computeFixedOrderTrafficRoute).mockResolvedValue(null);

    const route = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-matrix-only'
    );

    expect(route?.trafficAware).toBe(true);
    expect(route?.degraded).toBe(false);
    expect(route?.routingProvider).toBe('google_routes_matrix_directions');
    expect(route?.polyline).toBe('encoded-final-route');
    expect(googleMapsService.getRoute).toHaveBeenCalledOnce();
  });

  it('never turns stop coordinates into straight-line route geometry when providers fail', async () => {
    vi.mocked(googleMapsService.computeFixedOrderTrafficRoute).mockResolvedValue(null);
    vi.mocked(googleMapsService.getRoute).mockResolvedValue(null);

    const route = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-no-geometry'
    );

    expect(route?.routingProvider).toBe('google_routes_matrix');
    expect(route?.degraded).toBe(true);
    expect(route?.coordinates).toEqual([]);
    expect(route?.polyline).toBe('');
    expect(unifiedCacheService.set).not.toHaveBeenCalled();
  });

  it('rejects more than four active members instead of truncating stops', async () => {
    const tooMany = Array.from({ length: 5 }, (_, index): PoolMemberRoute => ({
      userId: `user-${index}`,
      pickup: { latitude: 23.8 + index * 0.001, longitude: 90.4 },
      dropoff: { latitude: 23.9 + index * 0.001, longitude: 90.5 },
    }));

    await expect(service.calculateCombinedRoute(tooMany)).rejects.toBeInstanceOf(RouteCapacityError);
  });

  it('never recalculates for location or off-route updates under one-shot policy', async () => {
    const route = await service.calculateCombinedRoute(
      members,
      { optimizeFor: 'time', driverLocation: driver },
      'pool-one-shot'
    );

    await expect(service.checkAndRecalculateIfOffRoute('pool-one-shot', driver, 0)).resolves.toEqual({
      recalculated: false,
    });
    await expect(service.updateRouteWithDriverLocation(route!, driver, 0)).resolves.toEqual({
      needsRecalculation: false,
    });
  });

  it('clears every exact topology key and the legacy pool cache key', async () => {
    await service.clearPoolRoute('pool-clear');
    expect(unifiedCacheService.deletePattern).toHaveBeenCalledWith('smart-route:v5:pool:pool-clear:*');
    expect(unifiedCacheService.deletePattern).toHaveBeenCalledWith('smart-route:v4:pool:pool-clear:*');
    expect(unifiedCacheService.deletePattern).toHaveBeenCalledWith('smart-route:v3:pool:pool-clear:*');
    expect(unifiedCacheService.deletePattern).toHaveBeenCalledWith('smart-route:v2:pool:pool-clear:*');
    expect(unifiedCacheService.delete).toHaveBeenCalledWith('smart-route:pool:pool-clear');
  });
});
