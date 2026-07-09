import { logger } from '../utils/logger';
import crypto from 'crypto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

class MemoryCacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.maxSize = parseInt(process.env.MEMORY_CACHE_MAX_SIZE || '1000', 10);
    this.defaultTTL = parseInt(process.env.MEMORY_CACHE_TTL || '300', 10);
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.evictExpired();
    }, 60000);
  }

  private evictExpired(): void {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        evicted++;
      }
    }
    if (evicted > 0) {
      this.stats.evictions += evicted;
      this.stats.size = this.cache.size;
      logger.debug(`[MemoryCache] Evicted ${evicted} expired entries`);
    }
  }

  private evictLRU(): void {
    if (this.cache.size < this.maxSize) return;

    const oldest = this.cache.keys().next().value;
    if (oldest) {
      this.cache.delete(oldest);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
    }
  }

  private generateKey(key: string): string {
    return key;
  }

  private hashParams(params: Record<string, unknown>): string {
    const sorted = JSON.stringify(params, Object.keys(params).sort());
    return crypto.createHash('md5').update(sorted).digest('hex');
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(this.generateKey(key));
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(this.generateKey(key));
      this.stats.misses++;
      return null;
    }

    this.cache.delete(this.generateKey(key));
    this.cache.set(this.generateKey(key), entry);
    this.stats.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    this.evictLRU();
    const ttl = ttlSeconds || this.defaultTTL;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
    };
    this.cache.set(this.generateKey(key), entry);
    this.stats.size = this.cache.size;
    return true;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(this.generateKey(key));
    this.stats.size = this.cache.size;
    return deleted;
  }

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    this.stats.size = this.cache.size;
    return deleted;
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  poolSearchKey(params: {
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
    gender_preference?: string;
  }): string {
    const rounded = {
      pickup_lat: Math.round(params.pickup_lat * 1000) / 1000,
      pickup_lng: Math.round(params.pickup_lng * 1000) / 1000,
      dropoff_lat: Math.round(params.dropoff_lat * 1000) / 1000,
      dropoff_lng: Math.round(params.dropoff_lng * 1000) / 1000,
      gender_preference: params.gender_preference || 'ANY',
    };
    return `pool:search:${this.hashParams(rounded)}`;
  }

  routeKey(originH3: string, destH3: string): string {
    return `route:${originH3}:${destH3}`;
  }

  userProfileKey(userId: string): string {
    return `user:profile:${userId}`;
  }

  driverLocationKey(driverId: string): string {
    return `driver:location:${driverId}`;
  }

  poolDetailsKey(poolId: string): string {
    return `pool:details:${poolId}`;
  }

  getStats(): CacheStats & { isConnected: boolean } {
    return {
      ...this.stats,
      isConnected: true,
    };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0, evictions: 0, size: this.cache.size };
  }

  isReady(): boolean {
    return true;
  }

  async connect(): Promise<void> {
    logger.info('[MemoryCache] In-memory LRU cache initialized');
  }

  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.stats.size = 0;
    logger.info('[MemoryCache] Cache cleared and disconnected');
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }
}

export const memoryCacheService = new MemoryCacheService();
