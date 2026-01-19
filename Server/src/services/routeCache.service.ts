import { unifiedCacheService } from './unifiedCache.service';
import { googleMapsService, GoogleMapsRoute } from './googleMaps.service';
import { H3_RESOLUTION } from '../utils/h3.utils';
import * as h3 from 'h3-js';
import { logger } from '../utils/logger';

interface Location {
  latitude: number;
  longitude: number;
}

interface RouteInfo {
  distance_meters: number;
  duration_seconds: number;
  polyline?: string;
  waypoints?: Array<{ lat: number; lng: number }>;
}

interface CachedRouteResult {
  route: RouteInfo | null;
  fromCache: boolean;
  h3Origin: string;
  h3Dest: string;
}

const ROUTE_CACHE_TTL = 3600;
const FALLBACK_SPEED_KMH = 25;

class RouteCacheService {
  private requestCount = 0;
  private cacheHits = 0;

  async getRoute(origin: Location, destination: Location): Promise<CachedRouteResult> {
    const originH3 = h3.latLngToCell(origin.latitude, origin.longitude, H3_RESOLUTION.DESTINATION);
    const destH3 = h3.latLngToCell(destination.latitude, destination.longitude, H3_RESOLUTION.DESTINATION);
    const cacheKey = unifiedCacheService.routeKey(originH3, destH3);

    this.requestCount++;

    const cached = await unifiedCacheService.get<RouteInfo>(cacheKey);
    if (cached) {
      this.cacheHits++;
      logger.debug(`[RouteCache] Cache hit for ${originH3} -> ${destH3}`);
      return {
        route: cached,
        fromCache: true,
        h3Origin: originH3,
        h3Dest: destH3,
      };
    }

    try {
      const routeData = await googleMapsService.getRoute(
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude }
      );

      if (routeData) {
        const routeInfo: RouteInfo = {
          distance_meters: Math.round(routeData.distance * 1000),
          duration_seconds: Math.round(routeData.duration * 60),
          polyline: routeData.geometry?.encoded,
        };

        await unifiedCacheService.set(cacheKey, routeInfo, ROUTE_CACHE_TTL);
        logger.debug(`[RouteCache] Cached route ${originH3} -> ${destH3}`);

        return {
          route: routeInfo,
          fromCache: false,
          h3Origin: originH3,
          h3Dest: destH3,
        };
      }
    } catch (error) {
      logger.error('[RouteCache] Google Maps API error, using fallback:', error);
    }

    const fallbackRoute = this.calculateFallbackRoute(origin, destination);
    return {
      route: fallbackRoute,
      fromCache: false,
      h3Origin: originH3,
      h3Dest: destH3,
    };
  }

  async getRouteBatch(
    routes: Array<{ origin: Location; destination: Location }>
  ): Promise<CachedRouteResult[]> {
    const results: CachedRouteResult[] = [];
    const uncachedIndices: number[] = [];

    for (let i = 0; i < routes.length; i++) {
      const { origin, destination } = routes[i];
      const originH3 = h3.latLngToCell(origin.latitude, origin.longitude, H3_RESOLUTION.DESTINATION);
      const destH3 = h3.latLngToCell(destination.latitude, destination.longitude, H3_RESOLUTION.DESTINATION);
      const cacheKey = unifiedCacheService.routeKey(originH3, destH3);

      const cached = await unifiedCacheService.get<RouteInfo>(cacheKey);
      if (cached) {
        this.cacheHits++;
        results[i] = {
          route: cached,
          fromCache: true,
          h3Origin: originH3,
          h3Dest: destH3,
        };
      } else {
        uncachedIndices.push(i);
        results[i] = {
          route: null,
          fromCache: false,
          h3Origin: originH3,
          h3Dest: destH3,
        };
      }
    }

    const limitedUncached = uncachedIndices.slice(0, 3);

    await Promise.all(
      limitedUncached.map(async (idx) => {
        const { origin, destination } = routes[idx];
        const result = await this.getRoute(origin, destination);
        results[idx] = result;
      })
    );

    for (const idx of uncachedIndices.slice(3)) {
      const { origin, destination } = routes[idx];
      results[idx] = {
        route: this.calculateFallbackRoute(origin, destination),
        fromCache: false,
        h3Origin: results[idx].h3Origin,
        h3Dest: results[idx].h3Dest,
      };
    }

    return results;
  }

  private calculateFallbackRoute(origin: Location, destination: Location): RouteInfo {
    const distanceMeters = this.haversineDistance(origin, destination);
    const durationSeconds = Math.round((distanceMeters / 1000) / FALLBACK_SPEED_KMH * 3600 * 1.3);

    return {
      distance_meters: Math.round(distanceMeters),
      duration_seconds: durationSeconds,
    };
  }

  private haversineDistance(origin: Location, destination: Location): number {
    const R = 6371000;
    const lat1 = origin.latitude * Math.PI / 180;
    const lat2 = destination.latitude * Math.PI / 180;
    const deltaLat = (destination.latitude - origin.latitude) * Math.PI / 180;
    const deltaLng = (destination.longitude - origin.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  getStats(): { requestCount: number; cacheHits: number; hitRate: number } {
    return {
      requestCount: this.requestCount,
      cacheHits: this.cacheHits,
      hitRate: this.requestCount > 0 ? this.cacheHits / this.requestCount : 0,
    };
  }

  resetStats(): void {
    this.requestCount = 0;
    this.cacheHits = 0;
  }

  async precomputeCommonRoutes(): Promise<number> {
    const commonCorridors = [
      { name: 'Uttara-Motijheel', origin: { latitude: 23.8759, longitude: 90.3795 }, destination: { latitude: 23.7282, longitude: 90.4185 } },
      { name: 'Dhanmondi-Gulshan', origin: { latitude: 23.7461, longitude: 90.3742 }, destination: { latitude: 23.7925, longitude: 90.4078 } },
      { name: 'Mirpur-Farmgate', origin: { latitude: 23.8223, longitude: 90.3654 }, destination: { latitude: 23.7570, longitude: 90.3870 } },
      { name: 'Bashundhara-Banani', origin: { latitude: 23.8141, longitude: 90.4289 }, destination: { latitude: 23.7934, longitude: 90.4034 } },
      { name: 'Mohammadpur-Shahbag', origin: { latitude: 23.7662, longitude: 90.3587 }, destination: { latitude: 23.7386, longitude: 90.3960 } },
    ];

    let precomputed = 0;
    for (const corridor of commonCorridors) {
      const result = await this.getRoute(corridor.origin, corridor.destination);
      if (!result.fromCache && result.route) {
        precomputed++;
        logger.info(`[RouteCache] Precomputed route for ${corridor.name}`);
      }
      const reverseResult = await this.getRoute(corridor.destination, corridor.origin);
      if (!reverseResult.fromCache && reverseResult.route) {
        precomputed++;
      }
    }

    return precomputed;
  }
}

export const routeCacheService = new RouteCacheService();
