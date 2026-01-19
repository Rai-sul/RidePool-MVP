import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PenaltyService } from '../../src/services/penalty.service';

vi.mock('../../src/config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PenaltyService', () => {
  let service: PenaltyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PenaltyService();
  });

  describe('recordCancellation', () => {
    it('should mark cancellation as non-deliberate if under 30 seconds', async () => {
      const userId = 'user-1';
      const rideId = 'ride-1';
      const rideCreatedAt = new Date(Date.now() - 15000).toISOString();

      const result = await service.recordCancellation(userId, rideId, rideCreatedAt);

      expect(result.isDeliberate).toBe(false);
      expect(result.penaltyApplied).toBe(false);
      expect(result.cooldownEndsAt).toBeNull();
    });

    it('should mark cancellation as deliberate if over 30 seconds', async () => {
      const userId = 'user-1';
      const rideId = 'ride-1';
      const rideCreatedAt = new Date(Date.now() - 60000).toISOString();

      const result = await service.recordCancellation(userId, rideId, rideCreatedAt);

      expect(result.isDeliberate).toBe(true);
    });
  });

  describe('isUserInCooldown', () => {
    it('should return false if no active cooldown', async () => {
      const result = await service.isUserInCooldown('user-1');

      expect(result.inCooldown).toBe(false);
      expect(result.endsAt).toBeNull();
      expect(result.remainingSeconds).toBe(0);
    });
  });

  describe('getCancellationStats', () => {
    it('should return cancellation statistics', async () => {
      const result = await service.getCancellationStats('user-1');

      expect(result).toHaveProperty('totalCancellations');
      expect(result).toHaveProperty('deliberateCancellations');
      expect(result).toHaveProperty('recentDeliberateCount');
      expect(result).toHaveProperty('lastCancellation');
      expect(result).toHaveProperty('cooldownHistory');
    });
  });
});
