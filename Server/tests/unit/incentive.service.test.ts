import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncentiveService } from '../../src/services/incentive.service';

vi.mock('../../src/config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
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

describe('IncentiveService', () => {
  let service: IncentiveService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IncentiveService();
  });

  describe('calculateDriverBonus', () => {
    it('should return 0 for less than 3 trips', () => {
      expect(service.calculateDriverBonus(0)).toBe(0);
      expect(service.calculateDriverBonus(1)).toBe(0);
      expect(service.calculateDriverBonus(2)).toBe(0);
    });

    it('should return 100 for 3 trips', () => {
      expect(service.calculateDriverBonus(3)).toBe(100);
    });

    it('should return 100 for 4-5 trips', () => {
      expect(service.calculateDriverBonus(4)).toBe(100);
      expect(service.calculateDriverBonus(5)).toBe(100);
    });

    it('should return 200 for 6 trips', () => {
      expect(service.calculateDriverBonus(6)).toBe(200);
    });

    it('should return 300 for 9 trips', () => {
      expect(service.calculateDriverBonus(9)).toBe(300);
    });
  });

  describe('calculateFullPoolPassengerBonus', () => {
    it('should return 5% of base fare', () => {
      expect(service.calculateFullPoolPassengerBonus(100)).toBe(5);
      expect(service.calculateFullPoolPassengerBonus(200)).toBe(10);
    });
  });

  describe('getDriverDailyStats', () => {
    it('should return default stats when no data exists', async () => {
      const stats = await service.getDriverDailyStats('user-1');
      
      expect(stats).toHaveProperty('tripsCompleted');
      expect(stats).toHaveProperty('totalEarnings');
      expect(stats).toHaveProperty('bonusEarned');
      expect(stats).toHaveProperty('date');
    });
  });
});
