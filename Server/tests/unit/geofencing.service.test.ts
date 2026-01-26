import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeofencingService } from '../../src/services/geofencing.service';

vi.mock('../../src/config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
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

describe('GeofencingService', () => {
  let service: GeofencingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GeofencingService();
  });

  describe('isWithinServiceArea', () => {
    it('should return true for locations within Dhaka', () => {
      expect(service.isWithinServiceArea(23.75, 90.40)).toBe(true);
      expect(service.isWithinServiceArea(23.80, 90.45)).toBe(true);
    });

    it('should return false for locations outside Dhaka', () => {
      expect(service.isWithinServiceArea(24.00, 90.40)).toBe(false);
      expect(service.isWithinServiceArea(23.50, 90.40)).toBe(false);
      expect(service.isWithinServiceArea(23.75, 90.20)).toBe(false);
      expect(service.isWithinServiceArea(23.75, 90.60)).toBe(false);
    });

    it('should return true for boundary locations', () => {
      expect(service.isWithinServiceArea(23.65, 90.30)).toBe(true);
      expect(service.isWithinServiceArea(23.95, 90.55)).toBe(true);
    });
  });

  describe('isInRestrictedArea', () => {
    it('should return true for Cantonment area', () => {
      expect(service.isInRestrictedArea(23.82, 90.40)).toBe(true);
    });

    it('should return true for Airport security zone', () => {
      expect(service.isInRestrictedArea(23.85, 90.40)).toBe(true);
    });

    it('should return false for regular areas', () => {
      expect(service.isInRestrictedArea(23.75, 90.40)).toBe(false);
    });
  });

  describe('isPointInPolygon', () => {
    it('should return true for point inside polygon', () => {
      const polygon = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
      ];

      expect(service.isPointInPolygon({ lat: 5, lng: 5 }, polygon)).toBe(true);
      expect(service.isPointInPolygon({ lat: 1, lng: 1 }, polygon)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      const polygon = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
      ];

      expect(service.isPointInPolygon({ lat: 15, lng: 5 }, polygon)).toBe(false);
      expect(service.isPointInPolygon({ lat: -5, lng: 5 }, polygon)).toBe(false);
    });

    it('should return false for invalid polygon', () => {
      expect(service.isPointInPolygon({ lat: 5, lng: 5 }, [])).toBe(false);
      expect(service.isPointInPolygon({ lat: 5, lng: 5 }, [{ lat: 0, lng: 0 }])).toBe(false);
    });
  });

  describe('getServiceAreaBoundary', () => {
    it('should return Dhaka boundaries', () => {
      const boundary = service.getServiceAreaBoundary();

      expect(boundary.minLat).toBe(23.65);
      expect(boundary.maxLat).toBe(23.95);
      expect(boundary.minLng).toBe(90.30);
      expect(boundary.maxLng).toBe(90.55);
    });
  });

  describe('validatePickupDropoff', () => {
    it('should validate valid pickup and dropoff', async () => {
      const result = await service.validatePickupDropoff(23.75, 90.40, 23.78, 90.42);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject pickup outside service area', async () => {
      const result = await service.validatePickupDropoff(24.00, 90.40, 23.78, 90.42);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pickup location is outside service area');
    });

    it('should reject dropoff outside service area', async () => {
      const result = await service.validatePickupDropoff(23.75, 90.40, 24.00, 90.42);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dropoff location is outside service area');
    });

    it('should reject pickup in restricted area', async () => {
      const result = await service.validatePickupDropoff(23.82, 90.40, 23.78, 90.42);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pickup location is in a restricted area');
    });
  });
});
