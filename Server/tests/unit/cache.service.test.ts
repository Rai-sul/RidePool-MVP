import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheService } from '../../src/services/cache.service';

describe('CacheService', () => {
  describe('key generation', () => {
    it('should generate pool search key with rounded coordinates', () => {
      const key = cacheService.poolSearchKey({
        pickup_lat: 23.12345678,
        pickup_lng: 90.12345678,
        dropoff_lat: 23.98765432,
        dropoff_lng: 90.98765432,
        gender_preference: 'ANY',
      });
      expect(key).toMatch(/^pool:search:[a-f0-9]+$/);
    });

    it('should generate consistent keys for same coordinates', () => {
      const params = {
        pickup_lat: 23.123,
        pickup_lng: 90.456,
        dropoff_lat: 23.789,
        dropoff_lng: 90.012,
      };
      const key1 = cacheService.poolSearchKey(params);
      const key2 = cacheService.poolSearchKey(params);
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different coordinates', () => {
      const key1 = cacheService.poolSearchKey({
        pickup_lat: 23.123,
        pickup_lng: 90.456,
        dropoff_lat: 23.789,
        dropoff_lng: 90.012,
      });
      const key2 = cacheService.poolSearchKey({
        pickup_lat: 23.124,
        pickup_lng: 90.456,
        dropoff_lat: 23.789,
        dropoff_lng: 90.012,
      });
      expect(key1).not.toBe(key2);
    });

    it('should generate route key', () => {
      const key = cacheService.routeKey('8928308280fffff', '8928308283fffff');
      expect(key).toBe('route:8928308280fffff:8928308283fffff');
    });

    it('should generate user profile key', () => {
      const key = cacheService.userProfileKey('user-123');
      expect(key).toBe('user:profile:user-123');
    });

    it('should generate driver location key', () => {
      const key = cacheService.driverLocationKey('driver-456');
      expect(key).toBe('driver:location:driver-456');
    });
  });

  describe('stats', () => {
    it('should return stats with isConnected flag', () => {
      const stats = cacheService.getStats();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('isConnected');
    });

    it('should return false for isReady when not connected', () => {
      expect(cacheService.isReady()).toBe(false);
    });
  });
});
