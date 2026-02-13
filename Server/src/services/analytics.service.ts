import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface RideAnalytics {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  completionRate: number;
  averageFare: number;
  totalRevenue: number;
  averagePoolSize: number;
  peakHours: { hour: number; count: number }[];
}

export interface DriverAnalytics {
  totalDrivers: number;
  activeDrivers: number;
  averageRating: number;
  totalTripsCompleted: number;
  averageTripsPerDriver: number;
  topDrivers: { driverId: string; trips: number; rating: number }[];
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  averageRidesPerUser: number;
  retentionRate: number;
}

export interface GeographicAnalytics {
  hotspots: { lat: number; lng: number; count: number }[];
  popularRoutes: { from: string; to: string; count: number }[];
  areaDistribution: { area: string; percentage: number }[];
}

export class AnalyticsService {
  async getRideAnalytics(startDate?: string, endDate?: string): Promise<RideAnalytics> {
    try {
      let query = supabaseAdmin
        .from('rides')
        .select('id, status, fare, pool_id, created_at');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: rides, error } = await query;

      if (error || !rides) {
        throw error || new Error('No rides data');
      }

      const totalRides = rides.length;
      const completedRides = rides.filter((r) => r.status === 'COMPLETED').length;
      const cancelledRides = rides.filter((r) => r.status === 'CANCELLED').length;
      const completionRate = totalRides > 0 ? (completedRides / totalRides) * 100 : 0;

      const fares = rides.filter((r) => r.fare).map((r) => r.fare);
      const averageFare = fares.length > 0 ? fares.reduce((a, b) => a + b, 0) / fares.length : 0;
      const totalRevenue = fares.reduce((a, b) => a + b, 0);

      const poolIds = [...new Set(rides.map((r) => r.pool_id).filter(Boolean))];
      const averagePoolSize = poolIds.length > 0 ? totalRides / poolIds.length : 0;

      const hourCounts: Record<number, number> = {};
      rides.forEach((r) => {
        const hour = new Date(r.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalRides,
        completedRides,
        cancelledRides,
        completionRate: Math.round(completionRate * 100) / 100,
        averageFare: Math.round(averageFare * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averagePoolSize: Math.round(averagePoolSize * 100) / 100,
        peakHours,
      };
    } catch (error) {
      logger.error('[AnalyticsService] getRideAnalytics error:', error);
      return {
        totalRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        completionRate: 0,
        averageFare: 0,
        totalRevenue: 0,
        averagePoolSize: 0,
        peakHours: [],
      };
    }
  }

  async getDriverAnalytics(): Promise<DriverAnalytics> {
    try {
      const { data: drivers, error: driversError } = await supabaseAdmin
        .from('users')
        .select('id, average_rating, is_driver')
        .eq('is_driver', true);

      if (driversError) {
        throw driversError;
      }

      const { data: activeDrivers, error: activeError } = await supabaseAdmin
        .from('vehicle_locations')
        .select('driver_id')
        .eq('is_active', true);

      if (activeError) {
        throw activeError;
      }

      const { data: driverStats, error: statsError } = await supabaseAdmin
        .from('driver_daily_stats')
        .select('driver_id, trips_completed');

      if (statsError) {
        throw statsError;
      }

      const driverTrips: Record<string, number> = {};
      (driverStats || []).forEach((stat) => {
        driverTrips[stat.driver_id] = (driverTrips[stat.driver_id] || 0) + stat.trips_completed;
      });

      const totalTripsCompleted = Object.values(driverTrips).reduce((a, b) => a + b, 0);
      const totalDrivers = drivers?.length || 0;
      const averageRating = drivers?.length
        ? drivers.reduce((sum, d) => sum + (d.average_rating || 0), 0) / drivers.length
        : 0;

      const topDrivers = (drivers || [])
        .map((d) => ({
          driverId: d.id,
          trips: driverTrips[d.id] || 0,
          rating: d.average_rating || 0,
        }))
        .sort((a, b) => b.trips - a.trips)
        .slice(0, 10);

      return {
        totalDrivers,
        activeDrivers: activeDrivers?.length || 0,
        averageRating: Math.round(averageRating * 100) / 100,
        totalTripsCompleted,
        averageTripsPerDriver: totalDrivers > 0 ? Math.round((totalTripsCompleted / totalDrivers) * 100) / 100 : 0,
        topDrivers,
      };
    } catch (error) {
      logger.error('[AnalyticsService] getDriverAnalytics error:', error);
      return {
        totalDrivers: 0,
        activeDrivers: 0,
        averageRating: 0,
        totalTripsCompleted: 0,
        averageTripsPerDriver: 0,
        topDrivers: [],
      };
    }
  }

  async getUserAnalytics(): Promise<UserAnalytics> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { count: totalUsers } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: newUsersToday } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart);

      const { count: newUsersThisWeek } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart);

      const { count: activeUsers } = await supabaseAdmin
        .from('rides')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', monthStart);

      const { data: userRides } = await supabaseAdmin
        .from('rides')
        .select('user_id')
        .eq('status', 'COMPLETED');

      const userRideCounts: Record<string, number> = {};
      (userRides || []).forEach((r) => {
        userRideCounts[r.user_id] = (userRideCounts[r.user_id] || 0) + 1;
      });

      const userCount = Object.keys(userRideCounts).length;
      const totalRides = Object.values(userRideCounts).reduce((a, b) => a + b, 0);
      const averageRidesPerUser = userCount > 0 ? totalRides / userCount : 0;

      const retentionRate = (totalUsers || 0) > 0 ? ((activeUsers || 0) / (totalUsers || 1)) * 100 : 0;

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        averageRidesPerUser: Math.round(averageRidesPerUser * 100) / 100,
        retentionRate: Math.round(retentionRate * 100) / 100,
      };
    } catch (error) {
      logger.error('[AnalyticsService] getUserAnalytics error:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        averageRidesPerUser: 0,
        retentionRate: 0,
      };
    }
  }

  async getRevenueByDate(startDate: string, endDate: string): Promise<{ date: string; revenue: number }[]> {
    try {
      const { data: rides, error } = await supabaseAdmin
        .from('rides')
        .select('fare, created_at')
        .eq('status', 'COMPLETED')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) {
        throw error;
      }

      const revenueByDate: Record<string, number> = {};
      (rides || []).forEach((r) => {
        const date = r.created_at.split('T')[0];
        revenueByDate[date] = (revenueByDate[date] || 0) + (r.fare || 0);
      });

      return Object.entries(revenueByDate)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error('[AnalyticsService] getRevenueByDate error:', error);
      return [];
    }
  }

  async getDashboardSummary(): Promise<{
    rides: RideAnalytics;
    drivers: DriverAnalytics;
    users: UserAnalytics;
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [rides, drivers, users] = await Promise.all([
      this.getRideAnalytics(thirtyDaysAgo),
      this.getDriverAnalytics(),
      this.getUserAnalytics(),
    ]);

    return { rides, drivers, users };
  }
}

export const analyticsService = new AnalyticsService();
