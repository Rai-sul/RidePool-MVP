import { cacheService } from './cache.service';
import { memoryCacheService } from './memoryCache.service';
import { logger } from '../utils/logger';

type CacheProvider = typeof cacheService | typeof memoryCacheService;

interface CacheAdapter {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, ttlSeconds?: number) => Promise<boolean>;
  delete: (key: string) => Promise<boolean>;
  deletePattern: (pattern: string) => Promise<number>;
  getOrSet: <T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number) => Promise<T>;
  poolSearchKey: (params: {
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
    gender_preference?: string;
  }) => string;
  routeKey: (originH3: string, destH3: string) => string;
  userProfileKey: (userId: string) => string;
  driverLocationKey: (driverId: string) => string;
  poolDetailsKey: (poolId: string) => string;
  getStats: () => { hits: number; misses: number; isConnected: boolean };
  resetStats: () => void;
  isReady: () => boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

function isMvpMode(): boolean {
  return process.env.MVP_MODE === 'true' || process.env.SKIP_REDIS === 'true';
}

function getProvider(): CacheProvider {
  return isMvpMode() ? memoryCacheService : cacheService;
}

export const unifiedCacheService: CacheAdapter = {
  get: async <T>(key: string): Promise<T | null> => {
    return getProvider().get<T>(key);
  },

  set: async <T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> => {
    return getProvider().set(key, value, ttlSeconds);
  },

  delete: async (key: string): Promise<boolean> => {
    return getProvider().delete(key);
  },

  deletePattern: async (pattern: string): Promise<number> => {
    return getProvider().deletePattern(pattern);
  },

  getOrSet: async <T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T> => {
    return getProvider().getOrSet(key, fetcher, ttlSeconds);
  },

  poolSearchKey: (params) => {
    return getProvider().poolSearchKey(params);
  },

  routeKey: (originH3: string, destH3: string) => {
    return getProvider().routeKey(originH3, destH3);
  },

  userProfileKey: (userId: string) => {
    return getProvider().userProfileKey(userId);
  },

  driverLocationKey: (driverId: string) => {
    return getProvider().driverLocationKey(driverId);
  },

  poolDetailsKey: (poolId: string) => {
    return getProvider().poolDetailsKey(poolId);
  },

  getStats: () => {
    const stats = getProvider().getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      isConnected: stats.isConnected,
    };
  },

  resetStats: () => {
    getProvider().resetStats();
  },

  isReady: () => {
    return getProvider().isReady();
  },

  connect: async () => {
    const provider = getProvider();
    if (isMvpMode()) {
      logger.info('[UnifiedCache] Using in-memory cache (MVP mode)');
    } else {
      logger.info('[UnifiedCache] Using Redis cache');
    }
    return provider.connect();
  },

  disconnect: async () => {
    return getProvider().disconnect();
  },
};
