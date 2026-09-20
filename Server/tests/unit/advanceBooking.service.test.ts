import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PoolMatchingService } from '../../src/services/poolMatching.service';
import { advanceWindow } from '../../src/utils/advanceWindow';
import { config } from '../../src/config/env';
import { CONSTANTS } from '../../src/config/constants';
import { Pool } from '../../src/types';
import { h3Utils } from '../../src/utils/h3.utils';

/**
 * Unit tests for the rules that decide whether an advance pool is visible to
 * an instant rider, and for the time windows those rules are built on.
 *
 * These cover the discovery half of the feature (spec scenarios 1-8 and 17-18).
 * The atomicity guarantees they lean on - the last seat, duplicate joins, a
 * range that closes mid-join - live in atomic_join_pool and are exercised
 * against a real database.
 */

const DEST_LAT = 23.7937;
const DEST_LNG = 90.4141;
const PICKUP_LAT = 23.7461;
const PICKUP_LNG = 90.3742;

function makeAdvancePool(overrides: Partial<Pool> = {}): Pool {
  const pickupAt = new Date(Date.now() + 10 * 60 * 1000);

  return {
    id: 'pool-advance-1',
    creator_user_id: 'user-2',
    driver_id: null,
    vehicle_id: null,
    status: 'SCHEDULED',
    pickup_lat: PICKUP_LAT,
    pickup_lng: PICKUP_LNG,
    pickup_address: 'Dhanmondi',
    pickup_h3_index: h3Utils.latLngToH3({ latitude: PICKUP_LAT, longitude: PICKUP_LNG }, 9),
    destination_lat: DEST_LAT,
    destination_lng: DEST_LNG,
    destination_address: 'Gulshan-2',
    destination_h3_index: h3Utils.latLngToH3({ latitude: DEST_LAT, longitude: DEST_LNG }, 7),
    vehicle_type: 'CNG',
    gender_restriction: 'ANY',
    current_passengers: 2,
    max_passengers: 2,
    viability_score: null,
    base_distance_km: null,
    base_duration_minutes: null,
    extended_search_h3: null,
    extended_pickup_h3: null,
    fare_per_person: null,
    is_advance: true,
    scheduled_pickup_at: pickupAt.toISOString(),
    scheduled_window_end_at: pickupAt.toISOString(),
    confirmation_opens_at: new Date(pickupAt.getTime() - 10 * 60 * 1000).toISOString(),
    confirmation_deadline_at: new Date(pickupAt.getTime() - 5 * 60 * 1000).toISOString(),
    confirmation_notified_at: new Date().toISOString(),
    active_range_start_at: new Date(Date.now() - 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    deleted_at: null,
    ...overrides,
  } as Pool;
}

describe('Active Pickup Range', () => {
  const service = new PoolMatchingService();

  it('shows an advance pool inside its active range', () => {
    const pool = makeAdvancePool();

    expect(service.isAdvancePoolJoinableNow(pool)).toBe(true);
  });

  it('hides the pool until two riders have confirmed', () => {
    // Riders sitting in the pool unconfirmed do not open the range.
    const pool = makeAdvancePool({ active_range_start_at: null });

    expect(service.isAdvancePoolJoinableNow(pool)).toBe(false);
  });

  it('hides the pool before the range opens', () => {
    const pool = makeAdvancePool({
      active_range_start_at: new Date(Date.now() + 60 * 1000).toISOString(),
    });

    expect(service.isAdvancePoolJoinableNow(pool)).toBe(false);
  });

  it('hides the pool at its scheduled pickup time', () => {
    const now = new Date();
    const pool = makeAdvancePool({ scheduled_pickup_at: now.toISOString() });

    expect(service.isAdvancePoolJoinableNow(pool, now)).toBe(false);
  });

  it('hides the pool after its scheduled pickup time', () => {
    const pool = makeAdvancePool({
      scheduled_pickup_at: new Date(Date.now() - 1000).toISOString(),
    });

    expect(service.isAdvancePoolJoinableNow(pool)).toBe(false);
  });

  it('leaves instant pools untouched', () => {
    const pool = makeAdvancePool({
      is_advance: false,
      active_range_start_at: null,
      scheduled_pickup_at: null,
    });

    expect(service.isAdvancePoolJoinableNow(pool)).toBe(true);
  });

  it('uses the time it is given rather than a client-supplied one', () => {
    const pool = makeAdvancePool();
    const afterPickup = new Date(new Date(pool.scheduled_pickup_at as string).getTime() + 1000);

    expect(service.isAdvancePoolJoinableNow(pool, afterPickup)).toBe(false);
  });
});

describe('Vehicle capacity', () => {
  it('caps a CNG at 2 passengers and a car at 3', () => {
    expect(CONSTANTS.VEHICLE_CAPACITY.CNG).toBe(2);
    expect(CONSTANTS.VEHICLE_CAPACITY.CAR).toBe(3);
  });
});

describe('Advance booking windows', () => {
  const originalUnit = config.advanceBooking.unitSeconds;

  afterEach(() => {
    config.advanceBooking.unitSeconds = originalUnit;
  });

  it('treats a unit as a minute by default', () => {
    config.advanceBooking.unitSeconds = 60;

    expect(advanceWindow.poolWindowMs).toBe(config.advanceBooking.poolWindowUnits * 60_000);
    expect(advanceWindow.confirmLeadMs).toBe(config.advanceBooking.confirmLeadUnits * 60_000);
  });

  it('compresses every window when the unit is a second', () => {
    config.advanceBooking.unitSeconds = 1;

    expect(advanceWindow.poolWindowMs).toBe(config.advanceBooking.poolWindowUnits * 1000);
    expect(advanceWindow.confirmLeadMs).toBe(config.advanceBooking.confirmLeadUnits * 1000);
    expect(advanceWindow.confirmWindowMs).toBe(config.advanceBooking.confirmWindowUnits * 1000);
  });

  it('opens confirmation one lead before the earliest pickup and closes it a window later', () => {
    config.advanceBooking.unitSeconds = 60;
    const pickupAt = new Date('2026-09-21T08:00:00.000Z');

    const { confirmationOpensAt, confirmationDeadlineAt } = advanceWindow.scheduleFor(pickupAt);

    expect(confirmationOpensAt.toISOString()).toBe('2026-09-21T07:50:00.000Z');
    expect(confirmationDeadlineAt.toISOString()).toBe('2026-09-21T07:55:00.000Z');
    expect(confirmationDeadlineAt.getTime()).toBeLessThan(pickupAt.getTime());
  });
});

describe('Pickup time validation', () => {
  const now = new Date('2026-09-21T07:00:00.000Z');
  const originalUnit = config.advanceBooking.unitSeconds;

  beforeEach(() => {
    config.advanceBooking.unitSeconds = 60;
  });

  afterEach(() => {
    config.advanceBooking.unitSeconds = originalUnit;
  });

  it('accepts a pickup far enough out to run confirmation', () => {
    const pickupAt = new Date('2026-09-21T08:00:00.000Z');

    expect(advanceWindow.validatePickupTime(pickupAt, now)).toBeNull();
  });

  it('rejects a pickup that leaves no room to confirm', () => {
    const pickupAt = new Date('2026-09-21T07:05:00.000Z');

    expect(advanceWindow.validatePickupTime(pickupAt, now)).toMatch(/at least 10 minutes/);
  });

  it('rejects a pickup in the past', () => {
    const pickupAt = new Date('2026-09-21T06:00:00.000Z');

    expect(advanceWindow.validatePickupTime(pickupAt, now)).not.toBeNull();
  });

  it('rejects a pickup beyond the booking horizon', () => {
    const pickupAt = new Date(now.getTime() + (config.advanceBooking.maxLeadDays + 1) * 86_400_000);

    expect(advanceWindow.validatePickupTime(pickupAt, now)).toMatch(/more than/);
  });

  it('rejects an unparseable pickup time', () => {
    expect(advanceWindow.validatePickupTime(new Date('not-a-date'), now)).toBe('Invalid pickup time');
  });
});

describe('Pool-wide pickup window', () => {
  const originalUnit = config.advanceBooking.unitSeconds;

  beforeEach(() => {
    config.advanceBooking.unitSeconds = 60;
  });

  afterEach(() => {
    config.advanceBooking.unitSeconds = originalUnit;
  });

  /**
   * The span across every member of the pool must fit the window, which is
   * what the SQL assignment enforces. This mirrors that arithmetic so the
   * boundary cases from the spec stay pinned down.
   */
  function spanFits(times: string[]): boolean {
    const ms = times.map((t) => new Date(t).getTime());
    return Math.max(...ms) - Math.min(...ms) <= advanceWindow.poolWindowMs;
  }

  it('allows a pool spanning exactly the window', () => {
    expect(spanFits(['2026-09-21T08:00:00Z', '2026-09-21T08:30:00Z'])).toBe(true);
  });

  it('rejects a pool spanning more than the window', () => {
    expect(spanFits(['2026-09-21T08:00:00Z', '2026-09-21T08:35:00Z'])).toBe(false);
  });

  it('measures the full spread, not just the newest pair', () => {
    // 8:00 and 8:20 are fine together, and so are 8:20 and 8:45, but the pool
    // as a whole spans 45 minutes.
    expect(
      spanFits(['2026-09-21T08:00:00Z', '2026-09-21T08:20:00Z', '2026-09-21T08:45:00Z'])
    ).toBe(false);
  });
});
