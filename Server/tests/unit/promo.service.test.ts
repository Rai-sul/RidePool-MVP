import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromoService } from '../../src/services/promo.service';

vi.mock('../../src/config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PromoService', () => {
  let service: PromoService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromoService();
  });

  describe('calculateDiscount', () => {
    it('should calculate percentage discount correctly', () => {
      const promo = {
        id: '1',
        code: 'TEST10',
        description: null,
        discount_type: 'PERCENTAGE' as const,
        discount_value: 10,
        max_discount_amount: null,
        min_ride_amount: null,
        usage_limit: null,
        usage_count: 0,
        valid_from: null,
        valid_until: null,
        is_active: true,
      };

      expect(service.calculateDiscount(promo, 100)).toBe(10);
      expect(service.calculateDiscount(promo, 500)).toBe(50);
    });

    it('should calculate fixed discount correctly', () => {
      const promo = {
        id: '1',
        code: 'FLAT50',
        description: null,
        discount_type: 'FIXED' as const,
        discount_value: 50,
        max_discount_amount: null,
        min_ride_amount: null,
        usage_limit: null,
        usage_count: 0,
        valid_from: null,
        valid_until: null,
        is_active: true,
      };

      expect(service.calculateDiscount(promo, 100)).toBe(50);
      expect(service.calculateDiscount(promo, 500)).toBe(50);
    });

    it('should respect max discount amount', () => {
      const promo = {
        id: '1',
        code: 'TEST20',
        description: null,
        discount_type: 'PERCENTAGE' as const,
        discount_value: 20,
        max_discount_amount: 30,
        min_ride_amount: null,
        usage_limit: null,
        usage_count: 0,
        valid_from: null,
        valid_until: null,
        is_active: true,
      };

      expect(service.calculateDiscount(promo, 100)).toBe(20);
      expect(service.calculateDiscount(promo, 200)).toBe(30);
      expect(service.calculateDiscount(promo, 500)).toBe(30);
    });
  });
});
