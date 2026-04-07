import { routeOverlapService, UserRoute, Coordinate } from '../../src/services/routeOverlap.service';

describe('RouteOverlapService', () => {
  // Helper to create a simple route (straight line between two points)
  const createSimpleRoute = (pickup: { lat: number; lng: number }, destination: { lat: number; lng: number }, points = 10): Coordinate[] => {
    const coords: Coordinate[] = [];
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      coords.push({
        lat: pickup.lat + t * (destination.lat - pickup.lat),
        lng: pickup.lng + t * (destination.lng - pickup.lng),
      });
    }
    return coords;
  };

  describe('calculateTwoUserOverlap', () => {
    it('should return 100% when User A journey is fully contained in User B route', () => {
      // User B: Long route from (23.7, 90.3) to (23.8, 90.4)
      // User A: Short route from (23.72, 90.32) to (23.78, 90.38) - both points on B's route
      const userB: UserRoute = {
        userId: 'userB',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.8, longitude: 90.4 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.8, lng: 90.4 }, 20),
      };

      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.72, longitude: 90.32 },
        destination: { latitude: 23.78, longitude: 90.38 },
        routeCoords: createSimpleRoute({ lat: 23.72, lng: 90.32 }, { lat: 23.78, lng: 90.38 }, 10),
      };

      const result = routeOverlapService.calculateTwoUserOverlap(userA, userB);

      expect(result.overlapType).toBe('FULL_CONTAINMENT');
      expect(result.overlapPercentage).toBe(100);
      expect(result.userAFullyContained).toBe(true);
    });

    it('should return 100% when User B journey is fully contained in User A route', () => {
      // User A: Long route
      // User B: Short route fully within A's route
      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.9, longitude: 90.5 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.9, lng: 90.5 }, 30),
      };

      const userB: UserRoute = {
        userId: 'userB',
        pickup: { latitude: 23.75, longitude: 90.35 },
        destination: { latitude: 23.85, longitude: 90.45 },
        routeCoords: createSimpleRoute({ lat: 23.75, lng: 90.35 }, { lat: 23.85, lng: 90.45 }, 10),
      };

      const result = routeOverlapService.calculateTwoUserOverlap(userA, userB);

      expect(result.overlapType).toBe('FULL_CONTAINMENT');
      expect(result.overlapPercentage).toBe(100);
      expect(result.userBFullyContained).toBe(true);
    });

    it('should return 0% for users going in opposite directions', () => {
      // User A: Going from (23.7, 90.3) to (23.8, 90.4)
      // User B: Going from (23.8, 90.4) to (23.7, 90.3) - opposite direction
      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.8, longitude: 90.4 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.8, lng: 90.4 }, 20),
      };

      const userB: UserRoute = {
        userId: 'userB',
        pickup: { latitude: 23.8, longitude: 90.4 },
        destination: { latitude: 23.7, longitude: 90.3 },
        routeCoords: createSimpleRoute({ lat: 23.8, lng: 90.4 }, { lat: 23.7, lng: 90.3 }, 20),
      };

      const result = routeOverlapService.calculateTwoUserOverlap(userA, userB);

      expect(result.overlapType).toBe('NO_OVERLAP');
      expect(result.overlapPercentage).toBe(0);
    });

    it('should return partial overlap for partially overlapping routes', () => {
      // User A: (23.7, 90.3) to (23.8, 90.4)
      // User B: (23.75, 90.35) to (23.85, 90.45) - overlaps in middle
      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.8, longitude: 90.4 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.8, lng: 90.4 }, 20),
      };

      const userB: UserRoute = {
        userId: 'userB',
        pickup: { latitude: 23.75, longitude: 90.35 },
        destination: { latitude: 23.85, longitude: 90.45 },
        routeCoords: createSimpleRoute({ lat: 23.75, lng: 90.35 }, { lat: 23.85, lng: 90.45 }, 20),
      };

      const result = routeOverlapService.calculateTwoUserOverlap(userA, userB);

      expect(result.overlapType).toBe('PARTIAL_OVERLAP');
      expect(result.overlapPercentage).toBeGreaterThan(0);
      expect(result.overlapPercentage).toBeLessThan(100);
    });

    it('should return 0% for completely separate routes', () => {
      // User A: Dhaka area
      // User B: Chittagong area (far away)
      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.8, longitude: 90.4 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.8, lng: 90.4 }, 10),
      };

      const userB: UserRoute = {
        userId: 'userB',
        pickup: { latitude: 22.3, longitude: 91.8 },
        destination: { latitude: 22.4, longitude: 91.9 },
        routeCoords: createSimpleRoute({ lat: 22.3, lng: 91.8 }, { lat: 22.4, lng: 91.9 }, 10),
      };

      const result = routeOverlapService.calculateTwoUserOverlap(userA, userB);

      expect(result.overlapType).toBe('NO_OVERLAP');
      expect(result.overlapPercentage).toBe(0);
    });
  });

  describe('calculatePoolOverlap (3+ users)', () => {
    it('should calculate overlap for 3 users with shared corridor', () => {
      // All three users going roughly same direction with overlapping routes
      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.85, longitude: 90.45 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.85, lng: 90.45 }, 20),
      };

      const userB: UserRoute = {
        userId: 'userB',
        pickup: { latitude: 23.72, longitude: 90.32 },
        destination: { latitude: 23.87, longitude: 90.47 },
        routeCoords: createSimpleRoute({ lat: 23.72, lng: 90.32 }, { lat: 23.87, lng: 90.47 }, 20),
      };

      const userC: UserRoute = {
        userId: 'userC',
        pickup: { latitude: 23.74, longitude: 90.34 },
        destination: { latitude: 23.82, longitude: 90.42 },
        routeCoords: createSimpleRoute({ lat: 23.74, lng: 90.34 }, { lat: 23.82, lng: 90.42 }, 15),
      };

      const result = routeOverlapService.calculatePoolOverlap([userA, userB, userC]);

      expect(result.details.totalUsersCount).toBe(3);
      expect(result.pairwiseOverlaps.size).toBe(3); // 3 pairs: A-B, A-C, B-C
      expect(result.optimalPickupOrder).toHaveLength(3);
      expect(result.overlapPercentage).toBeGreaterThanOrEqual(0);
    });

    it('should identify fully contained user in 3-user pool', () => {
      // User C's route is fully contained within both A and B's routes
      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.9, longitude: 90.5 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.9, lng: 90.5 }, 30),
      };

      const userB: UserRoute = {
        userId: 'userB',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.9, longitude: 90.5 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.9, lng: 90.5 }, 30),
      };

      const userC: UserRoute = {
        userId: 'userC',
        pickup: { latitude: 23.75, longitude: 90.35 },
        destination: { latitude: 23.85, longitude: 90.45 },
        routeCoords: createSimpleRoute({ lat: 23.75, lng: 90.35 }, { lat: 23.85, lng: 90.45 }, 10),
      };

      const result = routeOverlapService.calculatePoolOverlap([userA, userB, userC]);

      expect(result.fullyContainedUsers).toContain('userC');
      expect(result.isViablePool).toBe(true);
    });

    it('should return low overlap when one user is going different direction', () => {
      // Users A and B going same direction
      // User C going opposite direction
      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.8, longitude: 90.4 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.8, lng: 90.4 }, 20),
      };

      const userB: UserRoute = {
        userId: 'userB',
        pickup: { latitude: 23.72, longitude: 90.32 },
        destination: { latitude: 23.82, longitude: 90.42 },
        routeCoords: createSimpleRoute({ lat: 23.72, lng: 90.32 }, { lat: 23.82, lng: 90.42 }, 20),
      };

      const userC: UserRoute = {
        userId: 'userC',
        pickup: { latitude: 23.8, longitude: 90.4 },
        destination: { latitude: 23.7, longitude: 90.3 },
        routeCoords: createSimpleRoute({ lat: 23.8, lng: 90.4 }, { lat: 23.7, lng: 90.3 }, 20),
      };

      const result = routeOverlapService.calculatePoolOverlap([userA, userB, userC]);

      // C going opposite direction should reduce overall overlap
      expect(result.details.minPairwiseOverlap).toBe(0);
      expect(result.isViablePool).toBe(false);
    });
  });

  describe('isPointOnRoute', () => {
    it('should return true when point is on the route', () => {
      const route = createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.8, lng: 90.4 }, 10);
      const pointOnRoute = { latitude: 23.75, longitude: 90.35 }; // Midpoint

      const result = routeOverlapService.isPointOnRoute(pointOnRoute, route, 200);

      expect(result).toBe(true);
    });

    it('should return false when point is far from the route', () => {
      const route = createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.8, lng: 90.4 }, 10);
      const pointOffRoute = { latitude: 24.0, longitude: 91.0 }; // Far away

      const result = routeOverlapService.isPointOnRoute(pointOffRoute, route, 200);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty route coordinates gracefully', () => {
      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.8, longitude: 90.4 },
        routeCoords: [],
      };

      const userB: UserRoute = {
        userId: 'userB',
        pickup: { latitude: 23.72, longitude: 90.32 },
        destination: { latitude: 23.82, longitude: 90.42 },
        routeCoords: createSimpleRoute({ lat: 23.72, lng: 90.32 }, { lat: 23.82, lng: 90.42 }, 10),
      };

      const result = routeOverlapService.calculateTwoUserOverlap(userA, userB);

      expect(result.overlapType).toBe('NO_OVERLAP');
      expect(result.overlapPercentage).toBe(0);
    });

    it('should handle same pickup and destination (zero-length route)', () => {
      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.7, longitude: 90.3 }, // Same as pickup
        routeCoords: [{ lat: 23.7, lng: 90.3 }],
      };

      const userB: UserRoute = {
        userId: 'userB',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.8, longitude: 90.4 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.8, lng: 90.4 }, 10),
      };

      const result = routeOverlapService.calculateTwoUserOverlap(userA, userB);

      // A's single point should be on B's route
      expect(result.details.aPickupOnB).toBe(true);
    });

    it('should handle single user in pool calculation', () => {
      const userA: UserRoute = {
        userId: 'userA',
        pickup: { latitude: 23.7, longitude: 90.3 },
        destination: { latitude: 23.8, longitude: 90.4 },
        routeCoords: createSimpleRoute({ lat: 23.7, lng: 90.3 }, { lat: 23.8, lng: 90.4 }, 10),
      };

      const result = routeOverlapService.calculatePoolOverlap([userA]);

      expect(result.isViablePool).toBe(false);
      expect(result.optimalPickupOrder).toEqual(['userA']);
    });
  });
});
