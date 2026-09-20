import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit tests for the confirmation deadline outcomes (spec section 8):
 *
 *   2+ confirmed  -> pool dispatched, driver search starts
 *   exactly 1     -> never a solo ride; rematch, ask to extend, or cancel
 *   0 confirmed   -> pool cancelled, no driver search
 *
 * Supabase is replaced with a small recording stub so the decisions can be
 * checked without a database.
 */

// ============================================
// SUPABASE STUB
// ============================================

// vi.mock factories are hoisted, so everything they touch is built here first.
const h = vi.hoisted(() => {
  const tables: Record<string, { rows: any[] }> = {};
  const writes: Array<{ table: string; verb: string; payload: any }> = [];
  const rematchResult: { value: null | { pool_id: string; created_pool: boolean } } = { value: null };

  function makeQuery(table: string) {
    let verb = 'select';

    const builder: any = {
      select: () => builder,
      insert: (values: any) => {
        verb = 'insert';
        writes.push({ table, verb, payload: values });
        return builder;
      },
      update: (values: any) => {
        verb = 'update';
        writes.push({ table, verb, payload: values });
        return builder;
      },
      eq: () => builder,
      neq: () => builder,
      in: () => builder,
      is: () => builder,
      not: () => builder,
      gt: () => builder,
      gte: () => builder,
      lte: () => builder,
      order: () => builder,
      single: async () => ({ data: tables[table]?.rows?.[0] ?? null, error: null }),
      then: (resolve: any) => resolve({ data: tables[table]?.rows ?? [], error: null }),
    };

    return builder;
  }

  return {
    tables,
    writes,
    rematchResult,
    makeQuery,
    notifications: {
      sendPushNotification: vi.fn().mockResolvedValue(undefined),
      sendPoolReadyNotification: vi.fn().mockResolvedValue(undefined),
      sendPoolCancelledNotification: vi.fn().mockResolvedValue(undefined),
      notifyNearbyDrivers: vi.fn().mockResolvedValue(undefined),
    },
  };
});

const { tables, writes, rematchResult } = h;
const notificationSpy = h.notifications;

vi.mock('../../src/config/supabase', () => ({
  supabaseAdmin: { from: (table: string) => h.makeQuery(table) },
  supabase: { from: (table: string) => h.makeQuery(table) },
}));

vi.mock('../../src/services/notification.service', () => ({
  notificationService: h.notifications,
}));

vi.mock('../../src/services/smartRoute.service', () => ({
  smartRouteService: {
    clearPoolRoute: vi.fn().mockResolvedValue(undefined),
    calculateCombinedRoute: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../src/services/advanceBooking.service', () => ({
  advanceBookingService: {
    updateBooking: vi.fn(async () => {
      if (!h.rematchResult.value) {
        throw new Error('POOL_NO_LONGER_JOINABLE: no pool');
      }
      return h.rematchResult.value;
    }),
  },
  AdvanceBookingError: class extends Error {},
}));

import { advanceDispatchService } from '../../src/services/advanceDispatch.service';
import { config } from '../../src/config/env';
import { Pool } from '../../src/types';

// ============================================
// FIXTURES
// ============================================

const PICKUP_AT = new Date('2026-09-21T08:00:00.000Z');

function makePool(overrides: Partial<Pool> = {}): Pool {
  return {
    id: 'pool-1',
    creator_user_id: 'user-1',
    status: 'SCHEDULED',
    is_advance: true,
    vehicle_type: 'CNG',
    gender_restriction: 'ANY',
    current_passengers: 2,
    max_passengers: 2,
    scheduled_pickup_at: PICKUP_AT.toISOString(),
    scheduled_window_end_at: PICKUP_AT.toISOString(),
    confirmation_opens_at: new Date(PICKUP_AT.getTime() - 10 * 60_000).toISOString(),
    confirmation_deadline_at: new Date(PICKUP_AT.getTime() - 5 * 60_000).toISOString(),
    active_range_start_at: null,
    ...overrides,
  } as Pool;
}

function setMembers(members: Array<{ user_id: string; ride_id: string; confirmed_at: string | null }>) {
  tables['pool_members'] = { rows: members.map((m) => ({ ...m, scheduled_pickup_at: PICKUP_AT.toISOString() })) };
}

function updatesTo(table: string): any[] {
  return writes.filter((w) => w.table === table && w.verb === 'update').map((w) => w.payload);
}

// ============================================
// TESTS
// ============================================

describe('Confirmation deadline outcomes', () => {
  const originalSolo = config.advanceBooking.soloFallback;

  beforeEach(() => {
    writes.length = 0;
    rematchResult.value = null;
    config.advanceBooking.soloFallback = false;
    tables['pools'] = { rows: [makePool()] };
    tables['rides'] = { rows: [] };
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Sit on the deadline, five minutes before pickup.
    vi.setSystemTime(new Date(PICKUP_AT.getTime() - 5 * 60_000));
  });

  afterEach(() => {
    vi.useRealTimers();
    config.advanceBooking.soloFallback = originalSolo;
  });

  it('dispatches a pool with two confirmed riders', async () => {
    setMembers([
      { user_id: 'u1', ride_id: 'r1', confirmed_at: new Date().toISOString() },
      { user_id: 'u2', ride_id: 'r2', confirmed_at: new Date().toISOString() },
    ]);

    const outcome = await advanceDispatchService.resolveDeadline(makePool());

    expect(outcome).toBe('DISPATCHED');
    expect(updatesTo('pools')).toContainEqual(expect.objectContaining({ status: 'WAITING_FOR_DRIVER' }));
    expect(notificationSpy.notifyNearbyDrivers).toHaveBeenCalled();
  });

  it('removes riders who did not confirm before dispatching', async () => {
    setMembers([
      { user_id: 'u1', ride_id: 'r1', confirmed_at: new Date().toISOString() },
      { user_id: 'u2', ride_id: 'r2', confirmed_at: new Date().toISOString() },
      { user_id: 'u3', ride_id: 'r3', confirmed_at: null },
    ]);

    const outcome = await advanceDispatchService.resolveDeadline(makePool());

    expect(outcome).toBe('DISPATCHED');
    expect(updatesTo('pool_members')).toContainEqual(expect.objectContaining({ left_at: expect.any(String) }));
    expect(notificationSpy.sendPoolCancelledNotification).toHaveBeenCalledWith(
      'u3',
      'pool-1',
      'Did not confirm before the deadline'
    );
  });

  it('cancels the pool when nobody confirmed', async () => {
    setMembers([
      { user_id: 'u1', ride_id: 'r1', confirmed_at: null },
      { user_id: 'u2', ride_id: 'r2', confirmed_at: null },
    ]);

    const outcome = await advanceDispatchService.resolveDeadline(makePool());

    expect(outcome).toBe('CANCELLED');
    expect(updatesTo('pools')).toContainEqual(expect.objectContaining({ status: 'CANCELLED' }));
    expect(notificationSpy.notifyNearbyDrivers).not.toHaveBeenCalled();
  });

  it('never dispatches a solo ride by default', async () => {
    setMembers([
      { user_id: 'u1', ride_id: 'r1', confirmed_at: new Date().toISOString() },
      { user_id: 'u2', ride_id: 'r2', confirmed_at: null },
    ]);

    const outcome = await advanceDispatchService.resolveDeadline(makePool());

    expect(outcome).not.toBe('DISPATCHED');
    expect(['WAIT_FOR_MATCH', 'ASK_USER_TO_EXTEND', 'CANCEL_POOL']).toContain(outcome);
    expect(notificationSpy.notifyNearbyDrivers).not.toHaveBeenCalled();
  });

  it('dispatches solo only when SOLO_FALLBACK is switched on', async () => {
    config.advanceBooking.soloFallback = true;
    setMembers([{ user_id: 'u1', ride_id: 'r1', confirmed_at: new Date().toISOString() }]);

    const outcome = await advanceDispatchService.resolveDeadline(makePool());

    expect(outcome).toBe('DISPATCHED');
    expect(notificationSpy.notifyNearbyDrivers).toHaveBeenCalled();
  });

  it('reports WAIT_FOR_MATCH when the lone rider moves to another pool', async () => {
    rematchResult.value = { pool_id: 'pool-2', created_pool: false };
    tables['rides'] = {
      rows: [
        {
          id: 'r1',
          booking_type: 'ADVANCE',
          scheduled_pickup_at: PICKUP_AT.toISOString(),
          pickup_lat: 23.74,
          pickup_lng: 90.37,
          dropoff_lat: 23.79,
          dropoff_lng: 90.41,
          vehicle_type: 'CNG',
          gender_restriction: 'ANY',
        },
      ],
    };
    setMembers([{ user_id: 'u1', ride_id: 'r1', confirmed_at: new Date().toISOString() }]);

    const outcome = await advanceDispatchService.resolveDeadline(makePool());

    expect(outcome).toBe('WAIT_FOR_MATCH');
  });

  it('does not count a brand-new pool as a rematch', async () => {
    // A fresh pool leaves the rider just as alone as before.
    rematchResult.value = { pool_id: 'pool-3', created_pool: true };
    tables['rides'] = {
      rows: [
        {
          id: 'r1',
          booking_type: 'ADVANCE',
          scheduled_pickup_at: PICKUP_AT.toISOString(),
          pickup_lat: 23.74,
          pickup_lng: 90.37,
          dropoff_lat: 23.79,
          dropoff_lng: 90.41,
          vehicle_type: 'CNG',
          gender_restriction: 'ANY',
        },
      ],
    };
    setMembers([{ user_id: 'u1', ride_id: 'r1', confirmed_at: new Date().toISOString() }]);

    const outcome = await advanceDispatchService.resolveDeadline(makePool());

    expect(outcome).not.toBe('WAIT_FOR_MATCH');
  });

  it('asks the lone rider to extend while there is still runway', async () => {
    setMembers([{ user_id: 'u1', ride_id: 'r1', confirmed_at: new Date().toISOString() }]);

    const outcome = await advanceDispatchService.resolveDeadline(makePool());

    expect(outcome).toBe('ASK_USER_TO_EXTEND');
    expect(updatesTo('pools')).toContainEqual(
      expect.objectContaining({ confirmation_deadline_at: expect.any(String) })
    );
    expect(notificationSpy.sendPushNotification).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ metadata: expect.objectContaining({ outcome: 'ASK_USER_TO_EXTEND' }) })
    );
  });

  it('pushes the deadline out to the pickup time when asking to extend', async () => {
    setMembers([{ user_id: 'u1', ride_id: 'r1', confirmed_at: new Date().toISOString() }]);

    await advanceDispatchService.resolveDeadline(makePool());

    expect(updatesTo('pools')).toContainEqual(
      expect.objectContaining({ confirmation_deadline_at: PICKUP_AT.toISOString() })
    );
  });

  it('cancels the pool once the rider has already been asked to extend', async () => {
    // A deadline sitting on the pickup time means the ask went unanswered.
    const alreadyAsked = makePool({ confirmation_deadline_at: PICKUP_AT.toISOString() });
    setMembers([{ user_id: 'u1', ride_id: 'r1', confirmed_at: new Date().toISOString() }]);

    const outcome = await advanceDispatchService.resolveDeadline(alreadyAsked);

    expect(outcome).toBe('CANCEL_POOL');
    expect(updatesTo('pools')).toContainEqual(expect.objectContaining({ status: 'CANCELLED' }));
  });

  it('cancels the pool once the pickup time has passed', async () => {
    vi.setSystemTime(new Date(PICKUP_AT.getTime() + 1000));
    setMembers([{ user_id: 'u1', ride_id: 'r1', confirmed_at: new Date().toISOString() }]);

    const outcome = await advanceDispatchService.resolveDeadline(makePool());

    expect(outcome).toBe('CANCEL_POOL');
  });
});

describe('Active range opening', () => {
  beforeEach(() => {
    writes.length = 0;
    tables['pools'] = { rows: [makePool()] };
    tables['pool_members'] = { rows: [] };
    vi.clearAllMocks();
  });

  it('starts the driver search as soon as the pool is confirmed', async () => {
    await advanceDispatchService.onActiveRangeOpened('pool-1');

    expect(updatesTo('pools')).toContainEqual(expect.objectContaining({ status: 'WAITING_FOR_DRIVER' }));
    expect(notificationSpy.notifyNearbyDrivers).toHaveBeenCalled();
  });

  it('does nothing for a pool that already left the scheduled state', async () => {
    tables['pools'] = { rows: [makePool({ status: 'CANCELLED' })] };

    await advanceDispatchService.onActiveRangeOpened('pool-1');

    expect(updatesTo('pools')).toHaveLength(0);
    expect(notificationSpy.notifyNearbyDrivers).not.toHaveBeenCalled();
  });
});
