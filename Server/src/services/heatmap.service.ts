import { supabaseAdmin } from '../config/supabase';
import { h3Utils } from '../utils/h3.utils';
import { logger } from '../utils/logger';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  h3Index: string;
}

export interface DemandHeatmap {
  points: HeatmapPoint[];
  generatedAt: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  resolution: number;
}

export interface SurgeZone {
  h3Index: string;
  lat: number;
  lng: number;
  surgeMultiplier: number;
  demandLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  estimatedWaitMinutes: number;
}

export interface DriverHeatmapData {
  demandHeatmap: DemandHeatmap;
  surgeZones: SurgeZone[];
  recommendedAreas: RecommendedArea[];
  nearbyPoolsCount: number;
  estimatedEarningPotential: number;
}

export interface RecommendedArea {
  h3Index: string;
  lat: number;
  lng: number;
  name: string;
  reason: string;
  priority: number;
  estimatedPickups: number;
  distanceKm: number;
}

export interface HistoricalDemandPattern {
  hourOfDay: number;
  dayOfWeek: number;
  h3Index: string;
  avgDemand: number;
  peakDemand: number;
}

const DHAKA_BOUNDS = {
  north: 23.9200,
  south: 23.6600,
  east: 90.5300,
  west: 90.3200,
};

const H3_HEATMAP_RESOLUTION = 7;

export class HeatmapService {
  async getDriverHeatmap(driverLat: number, driverLng: number): Promise<DriverHeatmapData> {
    try {
      const [demandHeatmap, surgeZones, nearbyPools] = await Promise.all([
        this.generateDemandHeatmap(),
        this.calculateSurgeZones(),
        this.getNearbyPoolsCount(driverLat, driverLng),
      ]);

      const recommendedAreas = await this.getRecommendedAreas(driverLat, driverLng, surgeZones);
      const estimatedEarningPotential = this.calculateEarningPotential(surgeZones, nearbyPools);

      return {
        demandHeatmap,
        surgeZones,
        recommendedAreas,
        nearbyPoolsCount: nearbyPools,
        estimatedEarningPotential,
      };
    } catch (error) {
      logger.error('[HeatmapService] getDriverHeatmap error:', error);
      return {
        demandHeatmap: this.getEmptyHeatmap(),
        surgeZones: [],
        recommendedAreas: [],
        nearbyPoolsCount: 0,
        estimatedEarningPotential: 0,
      };
    }
  }

  async generateDemandHeatmap(): Promise<DemandHeatmap> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: recentRides, error } = await supabaseAdmin
        .from('rides')
        .select('pickup_lat, pickup_lng, pickup_h3_index, created_at')
        .gte('created_at', oneHourAgo)
        .in('status', ['CREATING_POOL', 'WAITING_FOR_DRIVER', 'DRIVER_ASSIGNED', 'STARTED']);

      if (error) {
        throw error;
      }

      const demandByH3: Record<string, { count: number; lat: number; lng: number }> = {};

      (recentRides || []).forEach((ride) => {
        const h3Index = ride.pickup_h3_index || 
          h3Utils.latLngToH3({ latitude: ride.pickup_lat, longitude: ride.pickup_lng }, H3_HEATMAP_RESOLUTION);
        
        if (!demandByH3[h3Index]) {
          demandByH3[h3Index] = { count: 0, lat: ride.pickup_lat, lng: ride.pickup_lng };
        }
        demandByH3[h3Index].count++;
      });

      const { data: waitingPools } = await supabaseAdmin
        .from('pools')
        .select('destination_lat, destination_lng, destination_h3_index, current_passengers')
        .eq('status', 'WAITING_FOR_DRIVER')
        .is('driver_id', null);

      (waitingPools || []).forEach((pool) => {
        const h3Index = pool.destination_h3_index ||
          h3Utils.latLngToH3({ latitude: pool.destination_lat, longitude: pool.destination_lng }, H3_HEATMAP_RESOLUTION);
        
        if (!demandByH3[h3Index]) {
          demandByH3[h3Index] = { count: 0, lat: pool.destination_lat, lng: pool.destination_lng };
        }
        demandByH3[h3Index].count += pool.current_passengers * 2;
      });

      const maxDemand = Math.max(...Object.values(demandByH3).map(d => d.count), 1);

      const points: HeatmapPoint[] = Object.entries(demandByH3).map(([h3Index, data]) => ({
        lat: data.lat,
        lng: data.lng,
        weight: data.count / maxDemand,
        h3Index,
      }));

      return {
        points,
        generatedAt: new Date().toISOString(),
        bounds: DHAKA_BOUNDS,
        resolution: H3_HEATMAP_RESOLUTION,
      };
    } catch (error) {
      logger.error('[HeatmapService] generateDemandHeatmap error:', error);
      return this.getEmptyHeatmap();
    }
  }

  async calculateSurgeZones(): Promise<SurgeZone[]> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: activeRides } = await supabaseAdmin
        .from('rides')
        .select('pickup_h3_index')
        .gte('created_at', oneHourAgo)
        .in('status', ['CREATING_POOL', 'WAITING_FOR_DRIVER']);

      const { data: activeDrivers } = await supabaseAdmin
        .from('vehicle_locations')
        .select('h3_index_res8')
        .eq('is_active', true)
        .eq('is_available', true);

      const demandByZone: Record<string, number> = {};
      (activeRides || []).forEach((ride) => {
        if (ride.pickup_h3_index) {
          const parentH3 = h3Utils.latLngToH3(
            h3Utils.h3ToLatLng(ride.pickup_h3_index),
            H3_HEATMAP_RESOLUTION
          );
          demandByZone[parentH3] = (demandByZone[parentH3] || 0) + 1;
        }
      });

      const supplyByZone: Record<string, number> = {};
      (activeDrivers || []).forEach((driver) => {
        if (driver.h3_index_res8) {
          const parentH3 = h3Utils.latLngToH3(
            h3Utils.h3ToLatLng(driver.h3_index_res8),
            H3_HEATMAP_RESOLUTION
          );
          supplyByZone[parentH3] = (supplyByZone[parentH3] || 0) + 1;
        }
      });

      const surgeZones: SurgeZone[] = [];

      Object.entries(demandByZone).forEach(([h3Index, demand]) => {
        const supply = supplyByZone[h3Index] || 0;
        const demandSupplyRatio = supply > 0 ? demand / supply : demand * 2;

        let surgeMultiplier = 1.0;
        let demandLevel: SurgeZone['demandLevel'] = 'LOW';
        let estimatedWaitMinutes = 5;

        if (demandSupplyRatio > 3) {
          surgeMultiplier = 1.5;
          demandLevel = 'VERY_HIGH';
          estimatedWaitMinutes = 15;
        } else if (demandSupplyRatio > 2) {
          surgeMultiplier = 1.3;
          demandLevel = 'HIGH';
          estimatedWaitMinutes = 10;
        } else if (demandSupplyRatio > 1.5) {
          surgeMultiplier = 1.15;
          demandLevel = 'MEDIUM';
          estimatedWaitMinutes = 7;
        }

        if (surgeMultiplier > 1.0 || demand >= 3) {
          const coords = h3Utils.h3ToLatLng(h3Index);
          surgeZones.push({
            h3Index,
            lat: coords.latitude,
            lng: coords.longitude,
            surgeMultiplier,
            demandLevel,
            estimatedWaitMinutes,
          });
        }
      });

      return surgeZones.sort((a, b) => b.surgeMultiplier - a.surgeMultiplier);
    } catch (error) {
      logger.error('[HeatmapService] calculateSurgeZones error:', error);
      return [];
    }
  }

  async getRecommendedAreas(
    driverLat: number,
    driverLng: number,
    surgeZones: SurgeZone[]
  ): Promise<RecommendedArea[]> {
    const driverH3 = h3Utils.latLngToH3({ latitude: driverLat, longitude: driverLng }, H3_HEATMAP_RESOLUTION);
    
    const recommendations: RecommendedArea[] = [];

    const knownHotspots = [
      { name: 'Gulshan', lat: 23.7925, lng: 90.4078, basePickups: 8 },
      { name: 'Banani', lat: 23.7937, lng: 90.4066, basePickups: 7 },
      { name: 'Dhanmondi', lat: 23.7461, lng: 90.3742, basePickups: 9 },
      { name: 'Uttara', lat: 23.8759, lng: 90.3795, basePickups: 6 },
      { name: 'Motijheel', lat: 23.7330, lng: 90.4176, basePickups: 10 },
      { name: 'Mirpur', lat: 23.8223, lng: 90.3654, basePickups: 7 },
      { name: 'Bashundhara', lat: 23.8200, lng: 90.4300, basePickups: 5 },
    ];

    for (const hotspot of knownHotspots) {
      const hotspotH3 = h3Utils.latLngToH3({ latitude: hotspot.lat, longitude: hotspot.lng }, H3_HEATMAP_RESOLUTION);
      const distance = h3Utils.getH3Distance(driverH3, hotspotH3) * 5.2;
      
      const surgeZone = surgeZones.find(sz => sz.h3Index === hotspotH3);
      const surgeFactor = surgeZone ? surgeZone.surgeMultiplier : 1.0;
      const demandFactor = surgeZone?.demandLevel === 'VERY_HIGH' ? 2 : 
                           surgeZone?.demandLevel === 'HIGH' ? 1.5 : 1;

      const priority = (hotspot.basePickups * demandFactor * surgeFactor) / Math.max(distance, 0.5);
      const estimatedPickups = Math.round(hotspot.basePickups * demandFactor);

      let reason = 'Regular demand area';
      if (surgeZone?.demandLevel === 'VERY_HIGH') {
        reason = 'Very high demand, surge pricing active';
      } else if (surgeZone?.demandLevel === 'HIGH') {
        reason = 'High demand area';
      } else if (distance < 2) {
        reason = 'Nearby with steady demand';
      }

      recommendations.push({
        h3Index: hotspotH3,
        lat: hotspot.lat,
        lng: hotspot.lng,
        name: hotspot.name,
        reason,
        priority,
        estimatedPickups,
        distanceKm: Math.round(distance * 10) / 10,
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }

  async getHistoricalDemandPatterns(h3Index?: string): Promise<HistoricalDemandPattern[]> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      let query = supabaseAdmin
        .from('rides')
        .select('pickup_h3_index, created_at')
        .gte('created_at', thirtyDaysAgo)
        .eq('status', 'COMPLETED');

      if (h3Index) {
        query = query.eq('pickup_h3_index', h3Index);
      }

      const { data: rides, error } = await query;

      if (error) {
        throw error;
      }

      const patterns: Record<string, { total: number; count: number; max: number }> = {};

      (rides || []).forEach((ride) => {
        const date = new Date(ride.created_at);
        const key = `${date.getHours()}-${date.getDay()}-${ride.pickup_h3_index}`;
        
        if (!patterns[key]) {
          patterns[key] = { total: 0, count: 0, max: 0 };
        }
        patterns[key].total++;
        patterns[key].count++;
        patterns[key].max = Math.max(patterns[key].max, 1);
      });

      return Object.entries(patterns).map(([key, data]) => {
        const [hour, day, h3] = key.split('-');
        return {
          hourOfDay: parseInt(hour),
          dayOfWeek: parseInt(day),
          h3Index: h3,
          avgDemand: Math.round((data.total / Math.max(data.count, 1)) * 100) / 100,
          peakDemand: data.max,
        };
      });
    } catch (error) {
      logger.error('[HeatmapService] getHistoricalDemandPatterns error:', error);
      return [];
    }
  }

  async getPeakHoursForArea(lat: number, lng: number): Promise<{ hour: number; demand: number }[]> {
    const h3Index = h3Utils.latLngToH3({ latitude: lat, longitude: lng }, H3_HEATMAP_RESOLUTION);
    const patterns = await this.getHistoricalDemandPatterns(h3Index);

    const hourlyDemand: Record<number, number> = {};
    patterns.forEach((p) => {
      hourlyDemand[p.hourOfDay] = (hourlyDemand[p.hourOfDay] || 0) + p.avgDemand;
    });

    return Object.entries(hourlyDemand)
      .map(([hour, demand]) => ({ hour: parseInt(hour), demand }))
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 6);
  }

  private async getNearbyPoolsCount(lat: number, lng: number): Promise<number> {
    try {
      const driverH3 = h3Utils.latLngToH3({ latitude: lat, longitude: lng }, H3_HEATMAP_RESOLUTION);
      const searchHexagons = h3Utils.getH3Ring(driverH3, 2);

      const { count } = await supabaseAdmin
        .from('pools')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'WAITING_FOR_DRIVER')
        .is('driver_id', null)
        .in('destination_h3_index', searchHexagons);

      return count || 0;
    } catch (error) {
      logger.error('[HeatmapService] getNearbyPoolsCount error:', error);
      return 0;
    }
  }

  private calculateEarningPotential(surgeZones: SurgeZone[], nearbyPools: number): number {
    const baseFare = 120;
    const avgSurge = surgeZones.length > 0
      ? surgeZones.reduce((sum, z) => sum + z.surgeMultiplier, 0) / surgeZones.length
      : 1.0;

    return Math.round(baseFare * avgSurge * Math.max(nearbyPools, 1));
  }

  private getEmptyHeatmap(): DemandHeatmap {
    return {
      points: [],
      generatedAt: new Date().toISOString(),
      bounds: DHAKA_BOUNDS,
      resolution: H3_HEATMAP_RESOLUTION,
    };
  }
}

export const heatmapService = new HeatmapService();
