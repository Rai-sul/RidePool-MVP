import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { memoryCacheService } from '../../src/services/memoryCache.service';

describe('memoryCacheService', () => {
  beforeEach(async () => {
    memoryCacheService.clear();
    memoryCacheService.resetStats();
  });

  describe('basic operations', () => {
    it('should set and get a value', async () => {
      const key = 'test:key';
      const value = { foo: 'bar' };

      await memoryCacheService.set(key, value);
      const result = await memoryCacheService.get<typeof value>(key);

      expect(result).toEqual(value);
    });

    it('should return null for missing key', async () => {
      const result = await memoryCacheService.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      const key = 'test:delete';
      await memoryCacheService.set(key, 'value');
      
      const deleted = await memoryCacheService.delete(key);
      expect(deleted).toBe(true);
      
      const result = await memoryCacheService.get(key);
      expect(result).toBeNull();
    });

    it('should expire entries after TTL', async () => {
      const key = 'test:expire';
      await memoryCacheService.set(key, 'value', 1);
      
      await new Promise((resolve) => setTimeout(resolve, 1100));
      
      const result = await memoryCacheService.get(key);
      expect(result).toBeNull();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const key = 'test:getorset';
      const cachedValue = { cached: true };
      await memoryCacheService.set(key, cachedValue);

      const fetcher = vi.fn().mockResolvedValue({ fresh: true });
      const result = await memoryCacheService.getOrSet(key, fetcher);

      expect(result).toEqual(cachedValue);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher and cache result if not cached', async () => {
      const key = 'test:getorset:miss';
      const freshValue = { fresh: true };
      const fetcher = vi.fn().mockResolvedValue(freshValue);

      const result = await memoryCacheService.getOrSet(key, fetcher);

      expect(result).toEqual(freshValue);
      expect(fetcher).toHaveBeenCalledOnce();
    });
  });

  describe('key generators', () => {
    it('should generate pool search key', () => {
      const key = memoryCacheService.poolSearchKey({
        pickup_lat: 23.8759,
        pickup_lng: 90.3795,
        dropoff_lat: 23.7282,
        dropoff_lng: 90.4185,
        gender_preference: 'ANY',
      });

      expect(key).toMatch(/^pool:search:/);
    });

    it('should generate route key', () => {
      const key = memoryCacheService.routeKey('8929a123456ffff', '8929a654321ffff');
      expect(key).toBe('route:8929a123456ffff:8929a654321ffff');
    });

    it('should generate user profile key', () => {
      const key = memoryCacheService.userProfileKey('user-123');
      expect(key).toBe('user:profile:user-123');
    });
  });

  describe('stats', () => {
    it('should track hits and misses', async () => {
      await memoryCacheService.set('hit-key', 'value');
      
      await memoryCacheService.get('hit-key');
      await memoryCacheService.get('miss-key');
      
      const stats = memoryCacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should always report isConnected as true', () => {
      const stats = memoryCacheService.getStats();
      expect(stats.isConnected).toBe(true);
    });

    it('should always report isReady as true', () => {
      expect(memoryCacheService.isReady()).toBe(true);
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      await memoryCacheService.set('pool:1', 'a');
      await memoryCacheService.set('pool:2', 'b');
      await memoryCacheService.set('user:1', 'c');

      const deleted = await memoryCacheService.deletePattern('pool:*');

      expect(deleted).toBe(2);
      expect(await memoryCacheService.get('pool:1')).toBeNull();
      expect(await memoryCacheService.get('pool:2')).toBeNull();
      expect(await memoryCacheService.get('user:1')).not.toBeNull();
    });
  });
});
