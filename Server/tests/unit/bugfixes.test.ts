/**
 * Regression tests for five defects found during the Server review.
 *
 * Each block states the bug, then pins the corrected behaviour so it cannot
 * silently come back.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// 1. sendBulkNotification reported 100% success unconditionally
// ---------------------------------------------------------------------------
const insertMock = vi.fn();
const poolQueryMock = vi.fn();
vi.mock('../../src/config/supabase', () => ({
  supabase: { from: (...args: unknown[]) => poolQueryMock(...args) },
  supabaseAdmin: { from: (...args: unknown[]) => insertMock(...args) },
}));

describe('notification: bulk send reports real delivery counts', () => {
  beforeEach(() => {
    vi.resetModules();
    insertMock.mockReset();
    delete process.env.FCM_SERVER_KEY;
  });

  const loadService = async () => {
    const mod = await import('../../src/services/notification.service');
    return mod.notificationService;
  };

  it('counts a failed insert as failed, not sent', async () => {
    // Supabase returns { error }, it does not throw.
    insertMock.mockReturnValue({
      insert: async () => ({ error: { message: 'duplicate key' } }),
    });

    const service = await loadService();
    const result = await service.sendBulkNotification(['u1', 'u2', 'u3'], {
      title: 't', message: 'm', type: 'POOL_MATCHED',
    } as any);

    expect(result).toEqual({ sent: 0, failed: 3 });
  });

  it('counts successful inserts as sent', async () => {
    insertMock.mockReturnValue({ insert: async () => ({ error: null }) });

    const service = await loadService();
    const result = await service.sendBulkNotification(['u1', 'u2'], {
      title: 't', message: 'm', type: 'POOL_MATCHED',
    } as any);

    expect(result).toEqual({ sent: 2, failed: 0 });
  });

  it('mixes counts correctly and never throws', async () => {
    let call = 0;
    insertMock.mockReturnValue({
      insert: async () => (++call === 2 ? { error: { message: 'boom' } } : { error: null }),
    });

    const service = await loadService();
    const result = await service.sendBulkNotification(['a', 'b', 'c', 'd'], {
      title: 't', message: 'm', type: 'POOL_MATCHED',
    } as any);

    expect(result).toEqual({ sent: 3, failed: 1 });
  });

  it('sendPushNotification still never throws', async () => {
    insertMock.mockReturnValue({
      insert: async () => { throw new Error('connection lost'); },
    });

    const service = await loadService();
    await expect(service.sendPushNotification('u1', {
      title: 't', message: 'm', type: 'POOL_MATCHED',
    } as any)).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. getBestRouteWithTraffic attached the wrong route's turn-by-turn steps
//    when two alternatives shared a summary string.
// ---------------------------------------------------------------------------
vi.mock('../../src/config/env', () => ({
  config: { googleMaps: { apiKey: 'test-key' } },
}));
vi.mock('../../src/services/cache.service', () => ({
  cacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
  },
}));

const leg = (meters: number, seconds: number, trafficSeconds: number, instruction: string) => ({
  distance: { value: meters, text: '' },
  duration: { value: seconds, text: '' },
  duration_in_traffic: { value: trafficSeconds, text: '' },
  steps: [{
    distance: { value: meters, text: '' },
    duration: { value: seconds, text: '' },
    html_instructions: `<b>${instruction}</b>`,
    polyline: { points: 'abc' },
  }],
  start_location: { lat: 0, lng: 0 },
  end_location: { lat: 1, lng: 1 },
});

const route = (summary: string, meters: number, seconds: number, trafficSeconds: number, instruction: string) => ({
  legs: [leg(meters, seconds, trafficSeconds, instruction)],
  overview_polyline: { points: '_p~iF~ps|U_ulLnnqC' },
  bounds: { northeast: { lat: 24, lng: 91 }, southwest: { lat: 23, lng: 90 } },
  summary,
});

describe('googleMaps: best route keeps its own steps', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('picks steps from the fastest route, not the first one sharing its summary', async () => {
    const { GoogleMapsService } = await import('../../src/services/googleMaps.service');
    // Both alternatives are "via Airport Road"; the SECOND is faster.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        status: 'OK',
        routes: [
          route('via Airport Road', 10000, 1800, 2400, 'SLOW route turn'),
          route('via Airport Road', 9000, 1200, 900, 'FAST route turn'),
        ],
      }),
    }));

    const result = await new GoogleMapsService().getBestRouteWithTraffic(
      { latitude: 23.8, longitude: 90.4 },
      { latitude: 23.9, longitude: 90.5 }
    );

    // The fast route won on durationInTraffic...
    expect(result?.bestRoute.durationInTraffic).toBe(15);
    expect(result?.bestRoute.distance).toBe(9);
    // ...so its steps must be the fast route's, not the slow one's.
    expect(result?.bestRoute.steps?.[0].instruction).toBe('FAST route turn');
  });

  it('is unchanged when summaries are unique', async () => {
    const { GoogleMapsService } = await import('../../src/services/googleMaps.service');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        status: 'OK',
        routes: [
          route('via Mirpur Road', 9000, 1200, 900, 'FAST route turn'),
          route('via Airport Road', 10000, 1800, 2400, 'SLOW route turn'),
        ],
      }),
    }));

    const result = await new GoogleMapsService().getBestRouteWithTraffic(
      { latitude: 23.81, longitude: 90.41 },
      { latitude: 23.91, longitude: 90.51 }
    );

    expect(result?.bestRoute.summary).toBe('via Mirpur Road');
    expect(result?.bestRoute.steps?.[0].instruction).toBe('FAST route turn');
  });
});

// ---------------------------------------------------------------------------
// 3. offline sync reordered the caller's array in place
// ---------------------------------------------------------------------------
describe('offline: syncing does not reorder the caller array', () => {
  it('leaves the input array in its original order', async () => {
    const { offlineService } = await import('../../src/services/offline.service');

    const actions = [
      { id: 'c', createdAt: '2026-01-03T00:00:00Z', type: 'X', payload: {} },
      { id: 'a', createdAt: '2026-01-01T00:00:00Z', type: 'X', payload: {} },
      { id: 'b', createdAt: '2026-01-02T00:00:00Z', type: 'X', payload: {} },
    ] as any[];
    const originalOrder = actions.map((a) => a.id);

    // syncSingleAction hits the DB; stub it so we only exercise the ordering.
    vi.spyOn(offlineService as any, 'syncSingleAction')
      .mockResolvedValue({ status: 'SYNCED' });
    vi.spyOn(offlineService as any, 'logSyncAttempt').mockResolvedValue(undefined);

    await offlineService.syncOfflineActions('user-1', actions);

    expect(actions.map((a) => a.id)).toEqual(originalOrder);
  });
});

// ---------------------------------------------------------------------------
// 4. Pool enrichment issued one DB round-trip per match and discarded the rows
// ---------------------------------------------------------------------------
describe('poolMatching: existence check is a single batched query', () => {
  beforeEach(() => poolQueryMock.mockReset());

  const loadService = async () => {
    const { PoolMatchingService } = await import('../../src/services/poolMatching.service');
    return new PoolMatchingService() as any;
  };

  it('checks 10 pools with one query and returns only the live ones', async () => {
    const inSpy = vi.fn().mockResolvedValue({
      data: [{ id: 'p1' }, { id: 'p5' }, { id: 'p9' }],
      error: null,
    });
    const selectSpy = vi.fn().mockReturnValue({ in: inSpy });
    poolQueryMock.mockReturnValue({ select: selectSpy });

    const ids = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const live = await (await loadService()).filterExistingPoolIds(ids);

    expect(poolQueryMock).toHaveBeenCalledTimes(1);
    expect(poolQueryMock).toHaveBeenCalledWith('pools');
    // only the id column — the rows were previously fetched then thrown away
    expect(selectSpy).toHaveBeenCalledWith('id');
    expect(inSpy).toHaveBeenCalledWith('id', ids);
    expect([...live].sort()).toEqual(['p1', 'p5', 'p9']);
  });

  it('issues no query for an empty id list', async () => {
    const live = await (await loadService()).filterExistingPoolIds([]);
    expect(poolQueryMock).not.toHaveBeenCalled();
    expect(live.size).toBe(0);
  });

  it('treats a query error as "nothing is live", matching the old per-pool behaviour', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    poolQueryMock.mockReturnValue({
      select: () => ({ in: async () => ({ data: null, error: { message: 'boom' } }) }),
    });

    const live = await (await loadService()).filterExistingPoolIds(['p1', 'p2']);
    expect(live.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Wallet/promo results typed `error?: string`, so a controller could render
//    an error response with no message. These are compile-time guards: they
//    fail `tsc -p tsconfig.test.json` if the unions are widened back.
// ---------------------------------------------------------------------------
describe('wallet/promo results are discriminated unions', () => {
  it('guarantees a string error once narrowed to the failure branch', async () => {
    const { } = await import('../../src/services/wallet.service');
    type TopUpResult = import('../../src/services/wallet.service').TopUpResult;
    type PromoValidationResult = import('../../src/services/promo.service').PromoValidationResult;

    const walletFailure: TopUpResult = { success: false, error: 'Amount must be positive' };
    const promoFailure: PromoValidationResult = { valid: false, error: 'Invalid promo code' };

    if (!walletFailure.success) {
      // Only compiles while `error` is a required string on the failure branch.
      const message: string = walletFailure.error;
      expect(message).toBe('Amount must be positive');
    }
    if (!promoFailure.valid) {
      const message: string = promoFailure.error;
      expect(message).toBe('Invalid promo code');
    }
  });

  it('guarantees the payload fields once narrowed to the success branch', async () => {
    type TopUpResult = import('../../src/services/wallet.service').TopUpResult;

    const ok: TopUpResult = {
      success: true,
      transaction: { id: 'txn-1' } as any,
      newBalance: 250,
    };

    if (ok.success) {
      const balance: number = ok.newBalance;
      expect(balance).toBe(250);
    }
  });
});
