import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LookupTimeService, SEARCH_TIMING } from '../../src/services/lookupTime.service';

vi.mock('../../src/config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

vi.mock('../../src/services/notification.service', () => ({
  notificationService: {
    sendPoolCancelledNotification: vi.fn().mockResolvedValue(undefined),
    sendPoolReadyNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LookupTimeService', () => {
  let service: LookupTimeService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new LookupTimeService();
  });

  afterEach(() => {
    service.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('startLookupTimer', () => {
    it('should start a timer for a pool', () => {
      const poolId = 'test-pool-1';
      
      service.startLookupTimer(poolId);
      
      expect(service.getActiveTimersCount()).toBe(1);
      expect(service.getTimerInfo(poolId)).not.toBeNull();
    });

    it('should not create duplicate timers for same pool', () => {
      const poolId = 'test-pool-1';
      
      service.startLookupTimer(poolId);
      service.startLookupTimer(poolId);
      
      expect(service.getActiveTimersCount()).toBe(1);
    });

    it('should start in the initial phase with the full window remaining', () => {
      const poolId = 'test-pool-1';

      service.startLookupTimer(poolId);

      const timerInfo = service.getTimerInfo(poolId);
      expect(timerInfo).not.toBeNull();
      expect(timerInfo!.phase).toBe('INITIAL');
      expect(timerInfo!.remainingSeconds).toBe(SEARCH_TIMING.INITIAL_SECONDS);
      expect(timerInfo!.totalSeconds).toBe(SEARCH_TIMING.TOTAL_SECONDS);
    });
  });

  describe('cancelLookupTimer', () => {
    it('should cancel an existing timer', () => {
      const poolId = 'test-pool-1';
      
      service.startLookupTimer(poolId);
      const result = service.cancelLookupTimer(poolId);
      
      expect(result).toBe(true);
      expect(service.getActiveTimersCount()).toBe(0);
    });

    it('should return false for non-existent timer', () => {
      const result = service.cancelLookupTimer('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('getTimerInfo', () => {
    it('should count down while the initial phase is running', () => {
      const poolId = 'test-pool-1';

      service.startLookupTimer(poolId);
      vi.advanceTimersByTime(10000);

      const timerInfo = service.getTimerInfo(poolId);
      expect(timerInfo).not.toBeNull();
      expect(timerInfo!.remainingSeconds).toBe(SEARCH_TIMING.INITIAL_SECONDS - 10);
    });

    it('should return null for non-existent timer', () => {
      expect(service.getTimerInfo('non-existent')).toBeNull();
    });
  });


  describe('clearAllTimers', () => {
    it('should clear all active timers', () => {
      service.startLookupTimer('pool-1');
      service.startLookupTimer('pool-2');
      service.startLookupTimer('pool-3');
      
      expect(service.getActiveTimersCount()).toBe(3);
      
      service.clearAllTimers();
      
      expect(service.getActiveTimersCount()).toBe(0);
    });
  });
});
