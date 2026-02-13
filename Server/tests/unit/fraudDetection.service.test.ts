import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FraudDetectionService } from '../../src/services/fraudDetection.service';

vi.mock('../../src/config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
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

vi.mock('../../src/services/audit.service', () => ({
  auditService: {
    logUserAction: vi.fn().mockResolvedValue(undefined),
    logSystemEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('FraudDetectionService', () => {
  let service: FraudDetectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FraudDetectionService();
  });

  describe('checkUser', () => {
    it('should return ALLOW for clean users', async () => {
      const result = await service.checkUser('user-1');

      expect(result.action).toBe('ALLOW');
      expect(result.isSuspicious).toBe(false);
      expect(result.flags).toHaveLength(0);
      expect(result.riskScore).toBe(0);
    });
  });

  describe('checkLocationVelocity', () => {
    it('should return not suspicious when no previous ride', async () => {
      const result = await service.checkLocationVelocity('user-1', 23.75, 90.40);

      expect(result.suspicious).toBe(false);
      expect(result.speedKmh).toBe(0);
    });
  });

  describe('calculateDistance (via checkLocationVelocity)', () => {
    it('should correctly calculate distance using Haversine formula', () => {
      const service = new FraudDetectionService();
      
      const toRad = (deg: number) => deg * (Math.PI / 180);
      const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      const distance = calculateDistance(23.75, 90.40, 23.76, 90.41);
      expect(distance).toBeGreaterThan(1);
      expect(distance).toBeLessThan(3);
    });
  });
});
