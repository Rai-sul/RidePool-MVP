import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LookupTimeService } from '../../src/services/lookupTime.service';

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
      
      service.startLookupTimer(poolId, 180000);
      
      expect(service.getActiveTimersCount()).toBe(1);
      expect(service.getTimerInfo(poolId)).not.toBeNull();
    });

    it('should not create duplicate timers for same pool', () => {
      const poolId = 'test-pool-1';
      
      service.startLookupTimer(poolId, 180000);
      service.startLookupTimer(poolId, 180000);
      
      expect(service.getActiveTimersCount()).toBe(1);
    });

    it('should set correct expiry time', () => {
      const poolId = 'test-pool-1';
      const duration = 180000;
      const now = Date.now();
      
      service.startLookupTimer(poolId, duration);
      
      const timerInfo = service.getTimerInfo(poolId);
      expect(timerInfo).not.toBeNull();
      expect(timerInfo!.expiresAt.getTime()).toBeGreaterThanOrEqual(now + duration - 100);
      expect(timerInfo!.expiresAt.getTime()).toBeLessThanOrEqual(now + duration + 100);
    });
  });

  describe('cancelLookupTimer', () => {
    it('should cancel an existing timer', () => {
      const poolId = 'test-pool-1';
      
      service.startLookupTimer(poolId, 180000);
      const result = service.cancelLookupTimer(poolId);
      
      expect(result).toBe(true);
      expect(service.getActiveTimersCount()).toBe(0);
    });

    it('should return false for non-existent timer', () => {
      const result = service.cancelLookupTimer('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('getRemainingTime', () => {
    it('should return remaining time for active timer', () => {
      const poolId = 'test-pool-1';
      const duration = 180000;
      
      service.startLookupTimer(poolId, duration);
      
      vi.advanceTimersByTime(60000);
      
      const remaining = service.getRemainingTime(poolId);
      expect(remaining).not.toBeNull();
      expect(remaining).toBeGreaterThanOrEqual(119000);
      expect(remaining).toBeLessThanOrEqual(121000);
    });

    it('should return null for non-existent timer', () => {
      const remaining = service.getRemainingTime('non-existent');
      
      expect(remaining).toBeNull();
    });
  });

  describe('extendLookupTime', () => {
    it('should extend an existing timer', async () => {
      const poolId = 'test-pool-1';
      const initialDuration = 180000;
      const extension = 60000;
      
      service.startLookupTimer(poolId, initialDuration);
      
      vi.advanceTimersByTime(60000);
      
      const result = await service.extendLookupTime(poolId, extension);
      
      expect(result).toBe(true);
      
      const remaining = service.getRemainingTime(poolId);
      expect(remaining).not.toBeNull();
      expect(remaining).toBeGreaterThanOrEqual(178000);
    });

    it('should return false for non-existent timer', async () => {
      const result = await service.extendLookupTime('non-existent', 60000);
      
      expect(result).toBe(false);
    });
  });

  describe('clearAllTimers', () => {
    it('should clear all active timers', () => {
      service.startLookupTimer('pool-1', 180000);
      service.startLookupTimer('pool-2', 180000);
      service.startLookupTimer('pool-3', 180000);
      
      expect(service.getActiveTimersCount()).toBe(3);
      
      service.clearAllTimers();
      
      expect(service.getActiveTimersCount()).toBe(0);
    });
  });
});
