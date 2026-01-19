import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface GeoZone {
  id: string;
  name: string;
  type: 'SERVICE_AREA' | 'RESTRICTED' | 'SURGE' | 'HIGH_DEMAND' | 'LOW_DEMAND';
  polygon: { lat: number; lng: number }[];
  is_active: boolean;
  metadata?: Record<string, any>;
}

export interface LocationCheck {
  isInServiceArea: boolean;
  isRestricted: boolean;
  surgeFactor: number;
  zone?: GeoZone;
}

const DHAKA_SERVICE_BOUNDARY = {
  minLat: 23.65,
  maxLat: 23.95,
  minLng: 90.30,
  maxLng: 90.55,
};

const RESTRICTED_AREAS = [
  {
    name: 'Dhaka Cantonment',
    bounds: { minLat: 23.8100, maxLat: 23.8400, minLng: 90.3800, maxLng: 90.4200 },
  },
  {
    name: 'Airport Security Zone',
    bounds: { minLat: 23.8400, maxLat: 23.8700, minLng: 90.3900, maxLng: 90.4200 },
  },
];

export class GeofencingService {
  async checkLocation(lat: number, lng: number): Promise<LocationCheck> {
    const isInServiceArea = this.isWithinServiceArea(lat, lng);

    if (!isInServiceArea) {
      return {
        isInServiceArea: false,
        isRestricted: false,
        surgeFactor: 1.0,
      };
    }

    const isRestricted = this.isInRestrictedArea(lat, lng);

    if (isRestricted) {
      return {
        isInServiceArea: true,
        isRestricted: true,
        surgeFactor: 1.0,
      };
    }

    const surgeFactor = await this.getSurgeFactor(lat, lng);

    return {
      isInServiceArea: true,
      isRestricted: false,
      surgeFactor,
    };
  }

  isWithinServiceArea(lat: number, lng: number): boolean {
    return (
      lat >= DHAKA_SERVICE_BOUNDARY.minLat &&
      lat <= DHAKA_SERVICE_BOUNDARY.maxLat &&
      lng >= DHAKA_SERVICE_BOUNDARY.minLng &&
      lng <= DHAKA_SERVICE_BOUNDARY.maxLng
    );
  }

  isInRestrictedArea(lat: number, lng: number): boolean {
    for (const area of RESTRICTED_AREAS) {
      if (
        lat >= area.bounds.minLat &&
        lat <= area.bounds.maxLat &&
        lng >= area.bounds.minLng &&
        lng <= area.bounds.maxLng
      ) {
        return true;
      }
    }
    return false;
  }

  async getSurgeFactor(lat: number, lng: number): Promise<number> {
    try {
      const { data: zones } = await supabaseAdmin
        .from('geo_zones')
        .select('*')
        .eq('type', 'SURGE')
        .eq('is_active', true);

      if (!zones || zones.length === 0) {
        return 1.0;
      }

      for (const zone of zones) {
        if (this.isPointInPolygon({ lat, lng }, zone.polygon)) {
          return zone.metadata?.surge_factor || 1.5;
        }
      }

      return 1.0;
    } catch (error) {
      logger.warn('[GeofencingService] Failed to get surge factor:', error);
      return 1.0;
    }
  }

  isPointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean {
    if (!polygon || polygon.length < 3) {
      return false;
    }

    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      if (
        yi > point.lat !== yj > point.lat &&
        point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  async getActiveZones(): Promise<GeoZone[]> {
    const { data, error } = await supabaseAdmin
      .from('geo_zones')
      .select('*')
      .eq('is_active', true);

    if (error) {
      logger.error('[GeofencingService] getActiveZones error:', error);
      return [];
    }

    return data || [];
  }

  async createZone(zone: Omit<GeoZone, 'id'>): Promise<GeoZone | null> {
    const { data, error } = await supabaseAdmin
      .from('geo_zones')
      .insert(zone)
      .select()
      .single();

    if (error) {
      logger.error('[GeofencingService] createZone error:', error);
      return null;
    }

    return data;
  }

  async updateZone(zoneId: string, updates: Partial<GeoZone>): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('geo_zones')
      .update(updates)
      .eq('id', zoneId);

    if (error) {
      logger.error('[GeofencingService] updateZone error:', error);
      return false;
    }

    return true;
  }

  async deactivateZone(zoneId: string): Promise<boolean> {
    return this.updateZone(zoneId, { is_active: false });
  }

  getServiceAreaBoundary(): typeof DHAKA_SERVICE_BOUNDARY {
    return { ...DHAKA_SERVICE_BOUNDARY };
  }

  getRestrictedAreas(): typeof RESTRICTED_AREAS {
    return [...RESTRICTED_AREAS];
  }

  async validatePickupDropoff(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number
  ): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    const pickupCheck = await this.checkLocation(pickupLat, pickupLng);
    const dropoffCheck = await this.checkLocation(dropoffLat, dropoffLng);

    if (!pickupCheck.isInServiceArea) {
      errors.push('Pickup location is outside service area');
    }
    if (!dropoffCheck.isInServiceArea) {
      errors.push('Dropoff location is outside service area');
    }
    if (pickupCheck.isRestricted) {
      errors.push('Pickup location is in a restricted area');
    }
    if (dropoffCheck.isRestricted) {
      errors.push('Dropoff location is in a restricted area');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async getHeatmapData(gridSize: number = 0.01): Promise<{ lat: number; lng: number; intensity: number }[]> {
    try {
      const { data: rides } = await supabaseAdmin
        .from('rides')
        .select('pickup_lat, pickup_lng')
        .eq('status', 'COMPLETED')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!rides || rides.length === 0) {
        return [];
      }

      const grid: Record<string, number> = {};

      rides.forEach((ride) => {
        const gridLat = Math.floor(ride.pickup_lat / gridSize) * gridSize;
        const gridLng = Math.floor(ride.pickup_lng / gridSize) * gridSize;
        const key = `${gridLat},${gridLng}`;
        grid[key] = (grid[key] || 0) + 1;
      });

      const maxCount = Math.max(...Object.values(grid));

      return Object.entries(grid).map(([key, count]) => {
        const [lat, lng] = key.split(',').map(parseFloat);
        return {
          lat: lat + gridSize / 2,
          lng: lng + gridSize / 2,
          intensity: count / maxCount,
        };
      });
    } catch (error) {
      logger.error('[GeofencingService] getHeatmapData error:', error);
      return [];
    }
  }
}

export const geofencingService = new GeofencingService();
