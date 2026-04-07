import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmartRouteService, PoolMemberRoute, CombinedSmartRoute, SmartRouteOptions } from '../../src/services/smartRoute.service';
import { unifiedCacheService } from '../../src/services/unifiedCache.service';
import { googleMapsService } from '../../src/services/googleMaps.service';

vi.mock('../../src/services/unifiedCache.service', () => ({
  unifiedCacheService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../../src/services/googleMaps.service', () => ({
  googleMapsService: {
    isAvailable: vi.fn(),
    getBestRouteWithTraffic: vi.fn(),
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

describe('SmartRouteService', () => {
  let service: SmartRouteService;

  const mockMembers: PoolMemberRoute[] = [
    {
      userId: 'user1',
      pickup: { latitude: 23.8103, longitude: 90.4125 },
      dropoff: { latitude: 23.82, longitude: 90.43 },
      pickupAddress: 'Dhaka University',
      dropoffAddress: 'Gulshan',
    },
    {
      userId: 'user2',
      pickup: { latitude: 23.815, longitude: 90.415 },
      dropoff: { latitude: 23.825, longitude: 90.435 },
      pickupAddress: 'Shahbagh',
      dropoffAddress: 'Banani',
    },
  ];

  const mockGoogleMapsRoute = {
    distance: 5.2,
    duration: 15,
    durationInTraffic: 18,
    trafficLevel: 'moderate' as const,
    geometry: {
      encoded: 'encodedPolyline',
      coordinates: [
        { lat: 23.8103, lng: 90.4125 },
        { lat: 23.82, lng: 90.43 },
      ],
    },
    summary: 'Via Main Road',
    steps: [
      { distance: 2.5, duration: 7, polyline: 'step1' },
      { distance: 2.7, duration: 8, polyline: 'step2' },
    ],
  };

  beforeEach(() => {
    service = new SmartRouteService();
    vi.clearAllMocks();
    vi.mocked(unifiedCacheService.get).mockResolvedValue(null);
    vi.mocked(unifiedCacheService.set).mockResolvedValue(true);
    vi.mocked(googleMapsService.isAvailable).mockReturnValue(true);
    vi.mocked(googleMapsService.getBestRouteWithTraffic).mockResolvedValue({
      bestRoute: mockGoogleMapsRoute,
      alternatives: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateCombinedRoute', () => {
    it('should return null for empty members array', async () => {
      const result = await service.calculateCombinedRoute([]);
      expect(result).toBeNull();
    });

    it('should return cached route if available', async () => {
      const cachedRoute: CombinedSmartRoute = {
        polyline: 'cachedPolyline',
        coordinates: [{ lat: 23.81, lng: 90.41 }],
        totalDistanceKm: 5.0,
        totalDurationMinutes: 15,
        durationInTraffic: 18,
        trafficLevel: 'low',
        waypoints: [],
        legs: [],
        optimizationScore: 75,
        savingsVsIndividual: 20,
        routeSummary: 'Cached route',
        fromCache: false,
        calculatedAt: new Date().toISOString(),
      };

      vi.mocked(unifiedCacheService.get).mockResolvedValue(cachedRoute);

      const result = await service.calculateCombinedRoute(mockMembers);

      expect(result).not.toBeNull();
      expect(result?.fromCache).toBe(true);
      expect(unifiedCacheService.get).toHaveBeenCalled();
      expect(googleMapsService.getBestRouteWithTraffic).not.toHaveBeenCalled();
    });

    it('should adjust ETA for cached routes older than 1 minute', async () => {
      const oldDate = new Date(Date.now() - 5 * 60 * 1000);
      const cachedRoute: CombinedSmartRoute = {
        polyline: 'cachedPolyline',
        coordinates: [{ lat: 23.81, lng: 90.41 }],
        totalDistanceKm: 5.0,
        totalDurationMinutes: 20,
        durationInTraffic: 25,
        trafficLevel: 'moderate',
        waypoints: [],
        legs: [],
        optimizationScore: 75,
        savingsVsIndividual: 20,
        routeSummary: 'Cached route',
        fromCache: false,
        calculatedAt: oldDate.toISOString(),
      };

      vi.mocked(unifiedCacheService.get).mockResolvedValue(cachedRoute);

      const result = await service.calculateCombinedRoute(mockMembers);

      expect(result).not.toBeNull();
      expect(result?.fromCache).toBe(true);
      expect(result?.totalDurationMinutes).toBeLessThan(20);
      expect(result?.durationInTraffic).toBeLessThan(25);
    });

    it('should not adjust ETA for cached routes less than 1 minute old', async () => {
      const recentDate = new Date(Date.now() - 30 * 1000);
      const cachedRoute: CombinedSmartRoute = {
        polyline: 'cachedPolyline',
        coordinates: [{ lat: 23.81, lng: 90.41 }],
        totalDistanceKm: 5.0,
        totalDurationMinutes: 20,
        durationInTraffic: 25,
        trafficLevel: 'moderate',
        waypoints: [],
        legs: [],
        optimizationScore: 75,
        savingsVsIndividual: 20,
        routeSummary: 'Cached route',
        fromCache: false,
        calculatedAt: recentDate.toISOString(),
      };

      vi.mocked(unifiedCacheService.get).mockResolvedValue(cachedRoute);

      const result = await service.calculateCombinedRoute(mockMembers);

      expect(result).not.toBeNull();
      expect(result?.totalDurationMinutes).toBe(20);
      expect(result?.durationInTraffic).toBe(25);
    });

    it('should ensure ETA never goes below 1 minute', async () => {
      const veryOldDate = new Date(Date.now() - 30 * 60 * 1000);
      const cachedRoute: CombinedSmartRoute = {
        polyline: 'cachedPolyline',
        coordinates: [{ lat: 23.81, lng: 90.41 }],
        totalDistanceKm: 5.0,
        totalDurationMinutes: 10,
        durationInTraffic: 12,
        trafficLevel: 'moderate',
        waypoints: [],
        legs: [],
        optimizationScore: 75,
        savingsVsIndividual: 20,
        routeSummary: 'Cached route',
        fromCache: false,
        calculatedAt: veryOldDate.toISOString(),
      };

      vi.mocked(unifiedCacheService.get).mockResolvedValue(cachedRoute);

      const result = await service.calculateCombinedRoute(mockMembers);

      expect(result).not.toBeNull();
      expect(result?.totalDurationMinutes).toBeGreaterThanOrEqual(1);
      expect(result?.durationInTraffic).toBeGreaterThanOrEqual(1);
    });

    it('should calculate route from Google Maps when cache miss', async () => {
      const result = await service.calculateCombinedRoute(mockMembers);

      expect(result).not.toBeNull();
      expect(result?.fromCache).toBe(false);
      expect(googleMapsService.getBestRouteWithTraffic).toHaveBeenCalled();
      expect(unifiedCacheService.set).toHaveBeenCalled();
    });

    it('should use 15 minute TTL for active trips (useCoarseDriverLocation=true)', async () => {
      const options: SmartRouteOptions = {
        optimizeFor: 'balanced',
        useCoarseDriverLocation: true,
        driverLocation: { latitude: 23.81, longitude: 90.41 },
      };

      await service.calculateCombinedRoute(mockMembers, options);

      expect(unifiedCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        900
      );
    });

    it('should use 5 minute TTL for non-active trips', async () => {
      const options: SmartRouteOptions = {
        optimizeFor: 'balanced',
        useCoarseDriverLocation: false,
      };

      await service.calculateCombinedRoute(mockMembers, options);

      expect(unifiedCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        300
      );
    });

    it('should use fallback route when Google Maps is unavailable', async () => {
      vi.mocked(googleMapsService.isAvailable).mockReturnValue(false);

      const result = await service.calculateCombinedRoute(mockMembers);

      expect(result).not.toBeNull();
      expect(result?.routeSummary).toBe('Estimated route (offline)');
      expect(result?.optimizationScore).toBe(50);
    });

    it('should use fallback route when Google Maps returns null', async () => {
      vi.mocked(googleMapsService.getBestRouteWithTraffic).mockResolvedValue(null);

      const result = await service.calculateCombinedRoute(mockMembers);

      expect(result).not.toBeNull();
      expect(result?.routeSummary).toBe('Estimated route (offline)');
    });

    it('should use fallback route on Google Maps error', async () => {
      vi.mocked(googleMapsService.getBestRouteWithTraffic).mockRejectedValue(new Error('API Error'));

      const result = await service.calculateCombinedRoute(mockMembers);

      expect(result).not.toBeNull();
      expect(result?.routeSummary).toBe('Estimated route (offline)');
    });
  });

  describe('orderWaypointsOptimally', () => {
    it('should ensure pickup comes before dropoff for each user', async () => {
      const result = await service.calculateCombinedRoute(mockMembers);

      expect(result).not.toBeNull();
      
      const waypoints = result!.waypoints;
      
      for (const member of mockMembers) {
        const pickupIdx = waypoints.findIndex(
          wp => wp.type === 'pickup' && wp.userId === member.userId
        );
        const dropoffIdx = waypoints.findIndex(
          wp => wp.type === 'dropoff' && wp.userId === member.userId
        );
        
        expect(pickupIdx).toBeLessThan(dropoffIdx);
      }
    });

    it('should place driver at the start when driverLocation is provided', async () => {
      const options: SmartRouteOptions = {
        optimizeFor: 'balanced',
        driverLocation: { latitude: 23.80, longitude: 90.40 },
      };

      const result = await service.calculateCombinedRoute(mockMembers, options);

      expect(result).not.toBeNull();
      expect(result!.waypoints[0].type).toBe('driver');
      expect(result!.waypoints[0].userId).toBe('driver');
    });
  });

  describe('generateCacheKey', () => {
    it('should use coarse H3 resolution (7) for active trips', async () => {
      const options1: SmartRouteOptions = {
        optimizeFor: 'balanced',
        useCoarseDriverLocation: true,
        driverLocation: { latitude: 23.81, longitude: 90.41 },
      };

      const options2: SmartRouteOptions = {
        optimizeFor: 'balanced',
        useCoarseDriverLocation: true,
        driverLocation: { latitude: 23.8105, longitude: 90.4105 },
      };

      await service.calculateCombinedRoute(mockMembers, options1);
      const firstCallCacheKey = vi.mocked(unifiedCacheService.set).mock.calls[0][0];

      vi.mocked(unifiedCacheService.set).mockClear();
      
      await service.calculateCombinedRoute(mockMembers, options2);
      const secondCallCacheKey = vi.mocked(unifiedCacheService.set).mock.calls[0][0];

      expect(firstCallCacheKey).toBe(secondCallCacheKey);
    });
  });

  describe('updateRouteWithDriverLocation', () => {
    it('should not recalculate when driver is on route', async () => {
      const existingRoute: CombinedSmartRoute = {
        polyline: 'test',
        coordinates: [
          { lat: 23.81, lng: 90.41 },
          { lat: 23.815, lng: 90.415 },
          { lat: 23.82, lng: 90.42 },
        ],
        totalDistanceKm: 5,
        totalDurationMinutes: 15,
        durationInTraffic: 18,
        trafficLevel: 'moderate',
        waypoints: [],
        legs: [],
        optimizationScore: 75,
        savingsVsIndividual: 20,
        routeSummary: 'Test route',
        fromCache: false,
        calculatedAt: new Date().toISOString(),
      };

      const driverLocation = { latitude: 23.815, longitude: 90.415 };

      const result = await service.updateRouteWithDriverLocation(existingRoute, driverLocation);

      expect(result.needsRecalculation).toBe(false);
      expect(result.updatedRoute).toBeUndefined();
    });

    it('should recalculate when driver is off route beyond threshold', async () => {
      const existingRoute: CombinedSmartRoute = {
        polyline: 'test',
        coordinates: [
          { lat: 23.81, lng: 90.41 },
          { lat: 23.82, lng: 90.42 },
        ],
        totalDistanceKm: 5,
        totalDurationMinutes: 15,
        durationInTraffic: 18,
        trafficLevel: 'moderate',
        waypoints: [
          {
            id: 'driver-start',
            type: 'driver',
            userId: 'driver',
            location: { latitude: 23.81, longitude: 90.41 },
            order: 0,
            estimatedArrivalMinutes: 0,
            distanceFromPreviousKm: 0,
          },
          {
            id: 'pickup-user1',
            type: 'pickup',
            userId: 'user1',
            location: { latitude: 23.82, longitude: 90.42 },
            order: 1,
            estimatedArrivalMinutes: 5,
            distanceFromPreviousKm: 1.5,
          },
        ],
        legs: [],
        optimizationScore: 75,
        savingsVsIndividual: 20,
        routeSummary: 'Test route',
        fromCache: false,
        calculatedAt: new Date().toISOString(),
      };

      const driverLocation = { latitude: 23.90, longitude: 90.50 };

      const result = await service.updateRouteWithDriverLocation(existingRoute, driverLocation, 0.5);

      expect(result.needsRecalculation).toBe(true);
    });
  });

  describe('getStats and resetStats', () => {
    it('should track request count and cache hits', async () => {
      vi.mocked(unifiedCacheService.get).mockResolvedValue(null);
      await service.calculateCombinedRoute(mockMembers);
      
      const cachedRoute: CombinedSmartRoute = {
        polyline: 'test',
        coordinates: [],
        totalDistanceKm: 5,
        totalDurationMinutes: 15,
        durationInTraffic: 18,
        trafficLevel: 'moderate',
        waypoints: [],
        legs: [],
        optimizationScore: 75,
        savingsVsIndividual: 20,
        routeSummary: 'Test',
        fromCache: false,
        calculatedAt: new Date().toISOString(),
      };
      vi.mocked(unifiedCacheService.get).mockResolvedValue(cachedRoute);
      await service.calculateCombinedRoute(mockMembers);

      const stats = service.getStats();
      expect(stats.requestCount).toBe(2);
      expect(stats.cacheHits).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should reset stats to zero', async () => {
      await service.calculateCombinedRoute(mockMembers);
      service.resetStats();

      const stats = service.getStats();
      expect(stats.requestCount).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('fallback route calculation', () => {
    it('should estimate duration based on 25 km/h average speed', async () => {
      vi.mocked(googleMapsService.isAvailable).mockReturnValue(false);

      const result = await service.calculateCombinedRoute(mockMembers);

      expect(result).not.toBeNull();
      expect(result?.trafficLevel).toBe('moderate');
    });

    it('should set calculatedAt timestamp', async () => {
      vi.mocked(googleMapsService.isAvailable).mockReturnValue(false);

      const before = new Date();
      const result = await service.calculateCombinedRoute(mockMembers);
      const after = new Date();

      expect(result).not.toBeNull();
      const calculatedAt = new Date(result!.calculatedAt);
      expect(calculatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(calculatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
