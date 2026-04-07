import { describe, it, expect } from 'vitest';
import { PoolMatchingService } from '../../src/services/poolMatching.service';
import { Ride, Pool } from '../../src/types';
import { h3Utils } from '../../src/utils/h3.utils';
import { calculateDistance } from '../../src/utils/helper';

/**
 * Unit tests for pool matching scoring, specifically:
 *  - Pickup distance affects score (closer pickup → higher score)
 *  - Exact pickup H3 match gives bonus points
 *  - Compatibility check returns real pickupDistance / pickupHexMatch
 *  - No regression in destination / route-overlap / gender / vehicle filtering
 */

// ============================================
// TEST FIXTURES — Dhaka coordinates
// ============================================

// Dhanmondi area – used as "base" pickup
const BASE_LAT = 23.7461;
const BASE_LNG = 90.3742;

// ~200m from base (same H3 res-9 hex, same pickup area)
const NEAR_LAT = 23.7475;
const NEAR_LNG = 90.3750;

// ~2km from base (different H3 res-9 hex, but within search ring)
const MID_LAT = 23.7600;
const MID_LNG = 90.3900;

// ~6km from base (far, likely outside pickup range)
const FAR_LAT = 23.7900;
const FAR_LNG = 90.4200;

// Shared destination (Gulshan-2)
const DEST_LAT = 23.7937;
const DEST_LNG = 90.4141;

function makeRide(overrides: Partial<Ride> = {}): Ride {
  return {
    id: 'ride-1',
    user_id: 'user-1',
    pool_id: null,
    pickup_lat: BASE_LAT,
    pickup_lng: BASE_LNG,
    pickup_address: 'Dhanmondi',
    pickup_h3_index: h3Utils.latLngToH3({ latitude: BASE_LAT, longitude: BASE_LNG }, 9),
    dropoff_lat: DEST_LAT,
    dropoff_lng: DEST_LNG,
    dropoff_address: 'Gulshan-2',
    dropoff_h3_index: h3Utils.latLngToH3({ latitude: DEST_LAT, longitude: DEST_LNG }, 7),
    vehicle_type: 'CAR',
    gender_restriction: 'ANY',
    status: 'SEARCHING',
    fare: null,
    distance_km: null,
    is_on_front_route: false,
    route_deviation_km: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    cancelled_reason: null,
    ...overrides,
  } as Ride;
}

function makePool(pickupLat: number, pickupLng: number, overrides: Partial<Pool> = {}): Pool {
  return {
    id: 'pool-1',
    creator_user_id: 'user-2',
    driver_id: null,
    vehicle_id: null,
    status: 'WAITING_FOR_RIDERS',
    pickup_lat: pickupLat,
    pickup_lng: pickupLng,
    pickup_address: null,
    pickup_h3_index: h3Utils.latLngToH3({ latitude: pickupLat, longitude: pickupLng }, 9),
    destination_lat: DEST_LAT,
    destination_lng: DEST_LNG,
    destination_address: 'Gulshan-2',
    destination_h3_index: h3Utils.latLngToH3({ latitude: DEST_LAT, longitude: DEST_LNG }, 7),
    vehicle_type: 'CAR',
    gender_restriction: 'ANY',
    current_passengers: 1,
    max_passengers: 4,
    viability_score: null,
    base_distance_km: null,
    base_duration_minutes: null,
    extended_search_h3: null,
    extended_pickup_h3: null,
    fare_per_person: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    deleted_at: null,
    ...overrides,
  } as Pool;
}

// ============================================
// TESTS
// ============================================

describe('PoolMatchingService', () => {
  const service = new PoolMatchingService();

  // ------------------------------------------
  // Pickup distance scoring
  // ------------------------------------------
  describe('isRideCompatibleWithPool – pickup distance scoring', () => {
    it('should score a near-pickup pool higher than a far-pickup pool (same destination)', () => {
      const ride = makeRide();
      const nearPool = makePool(NEAR_LAT, NEAR_LNG);
      const farPool = makePool(FAR_LAT, FAR_LNG);

      const nearResult = service.isRideCompatibleWithPool(ride, nearPool);
      const farResult = service.isRideCompatibleWithPool(ride, farPool);

      // Near pool should be compatible and have higher score
      expect(nearResult.compatible).toBe(true);
      expect(nearResult.score).toBeGreaterThan(0);

      // If far pool is compatible, its score must be lower
      if (farResult.compatible) {
        expect(nearResult.score!).toBeGreaterThan(farResult.score!);
      }
    });

    it('should report real pickupDistance in details (not zero)', () => {
      const ride = makeRide();
      const pool = makePool(MID_LAT, MID_LNG);

      const result = service.isRideCompatibleWithPool(ride, pool);

      // pickupDistance should be a real positive value, not hardcoded 0
      expect(result.details?.pickupDistance).toBeGreaterThan(0);

      // Verify it matches the actual haversine distance
      const expected = calculateDistance(BASE_LAT, BASE_LNG, MID_LAT, MID_LNG);
      expect(result.details?.pickupDistance).toBeCloseTo(expected, 4);
    });

    it('should give maximum distance score (25 pts) when pickup distance is 0', () => {
      const ride = makeRide();
      // Pool at exact same pickup location
      const pool = makePool(BASE_LAT, BASE_LNG);

      const result = service.isRideCompatibleWithPool(ride, pool);

      expect(result.compatible).toBe(true);
      expect(result.details?.pickupDistance).toBeCloseTo(0, 4);
      // Score should be high — distance (25) + dest proximity (10) + exact bonuses (10) + fill/overlap
      expect(result.score).toBeGreaterThanOrEqual(40);
    });
  });

  // ------------------------------------------
  // Pickup H3 hex match bonus
  // ------------------------------------------
  describe('isRideCompatibleWithPool – pickup H3 hex match bonus', () => {
    it('should give pickupHexMatch=true when ride and pool share same H3 res-9 hex', () => {
      const ride = makeRide();
      // Place pool within same H3 res-9 hex (~174m cell)
      const pool = makePool(NEAR_LAT, NEAR_LNG);

      // Verify they really share the same hex
      const rideH3 = h3Utils.latLngToH3({ latitude: BASE_LAT, longitude: BASE_LNG }, 9);
      const poolH3 = h3Utils.latLngToH3({ latitude: NEAR_LAT, longitude: NEAR_LNG }, 9);

      const result = service.isRideCompatibleWithPool(ride, pool);

      if (rideH3 === poolH3) {
        expect(result.details?.pickupHexMatch).toBe(true);
      }
      // Either way, the field should be a real boolean, not hardcoded false
      expect(typeof result.details?.pickupHexMatch).toBe('boolean');
    });

    it('should give pickupHexMatch=false when ride and pool are in different H3 res-9 hexes', () => {
      const ride = makeRide();
      const pool = makePool(MID_LAT, MID_LNG);

      const rideH3 = h3Utils.latLngToH3({ latitude: BASE_LAT, longitude: BASE_LNG }, 9);
      const poolH3 = h3Utils.latLngToH3({ latitude: MID_LAT, longitude: MID_LNG }, 9);

      // These should be different hexes at ~2km apart
      expect(rideH3).not.toBe(poolH3);

      const result = service.isRideCompatibleWithPool(ride, pool);
      expect(result.details?.pickupHexMatch).toBe(false);
    });

    it('exact pickup hex match should produce higher score than non-match (all else equal)', () => {
      const ride = makeRide();

      // Pool at exact same location (guaranteed same hex)
      const sameHexPool = makePool(BASE_LAT, BASE_LNG);
      // Pool at ~2km away (different hex but same destination)
      const diffHexPool = makePool(MID_LAT, MID_LNG);

      const sameResult = service.isRideCompatibleWithPool(ride, sameHexPool);
      const diffResult = service.isRideCompatibleWithPool(ride, diffHexPool);

      expect(sameResult.compatible).toBe(true);
      if (diffResult.compatible) {
        // Same-hex pool gets +5 bonus AND better distance score → strictly higher
        expect(sameResult.score!).toBeGreaterThan(diffResult.score!);
      }
    });
  });

  // ------------------------------------------
  // Regression: existing filters still work
  // ------------------------------------------
  describe('isRideCompatibleWithPool – existing filter regression', () => {
    it('should reject pool with mismatched vehicle type', () => {
      const ride = makeRide({ vehicle_type: 'CAR' });
      const pool = makePool(NEAR_LAT, NEAR_LNG, { vehicle_type: 'CNG' } as any);

      const result = service.isRideCompatibleWithPool(ride, pool);
      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('Vehicle type mismatch');
    });

    it('should reject pool when gender restriction conflicts', () => {
      const ride = makeRide({ gender_restriction: 'ANY' });
      const pool = makePool(NEAR_LAT, NEAR_LNG, { gender_restriction: 'FEMALE_ONLY' } as any);

      const result = service.isRideCompatibleWithPool(ride, pool);
      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('female-only');
    });

    it('should reject pool at capacity', () => {
      const ride = makeRide();
      const pool = makePool(NEAR_LAT, NEAR_LNG, {
        current_passengers: 4,
        max_passengers: 4,
      });

      const result = service.isRideCompatibleWithPool(ride, pool);
      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('capacity');
    });

    it('should reject pool with destination too far away', () => {
      const ride = makeRide();
      // Pool with a completely different destination (~20km away)
      const pool = makePool(NEAR_LAT, NEAR_LNG, {
        destination_lat: 24.0000,
        destination_lng: 90.6000,
        destination_h3_index: h3Utils.latLngToH3({ latitude: 24.0, longitude: 90.6 }, 7),
      });

      const result = service.isRideCompatibleWithPool(ride, pool);
      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('Destination too far');
    });

    it('should include destinationHexMatch in details', () => {
      const ride = makeRide();
      const pool = makePool(NEAR_LAT, NEAR_LNG);

      const result = service.isRideCompatibleWithPool(ride, pool);
      expect(typeof result.details?.destinationHexMatch).toBe('boolean');
    });

    it('should include routeOverlapPercentage in details for compatible pool', () => {
      const ride = makeRide();
      const pool = makePool(BASE_LAT, BASE_LNG);

      const result = service.isRideCompatibleWithPool(ride, pool);
      expect(result.compatible).toBe(true);
      expect(result.details?.routeOverlapPercentage).toBeGreaterThan(0);
    });
  });

  // ------------------------------------------
  // Score composition sanity checks
  // ------------------------------------------
  describe('score composition', () => {
    it('score should be between 0 and 100', () => {
      const ride = makeRide();
      const pool = makePool(BASE_LAT, BASE_LNG);

      const result = service.isRideCompatibleWithPool(ride, pool);
      expect(result.compatible).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('early-return details should still contain real pickupDistance', () => {
      const ride = makeRide();
      // Pool with far destination → triggers early "destination too far" return
      const pool = makePool(MID_LAT, MID_LNG, {
        destination_lat: 24.0000,
        destination_lng: 90.6000,
        destination_h3_index: h3Utils.latLngToH3({ latitude: 24.0, longitude: 90.6 }, 7),
      });

      const result = service.isRideCompatibleWithPool(ride, pool);
      expect(result.compatible).toBe(false);
      // Even for early-reject, pickupDistance should be computed
      const expectedDist = calculateDistance(BASE_LAT, BASE_LNG, MID_LAT, MID_LNG);
      expect(result.details?.pickupDistance).toBeCloseTo(expectedDist, 4);
    });
  });
});
