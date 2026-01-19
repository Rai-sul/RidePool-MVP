import { supabaseAdmin } from '../config/supabase';
import { fareService, DriverEarningsBreakdown } from './fare.service';
import { logger } from '../utils/logger';

const TRIPS_FOR_BONUS = 3;
const BONUS_AMOUNT_BDT = 100;
const FULL_POOL_PASSENGER_DISCOUNT_PERCENT = 5;

interface DailyStats {
  tripsCompleted: number;
  totalEarnings: number;
  bonusEarned: number;
  date: string;
}

export class IncentiveService {
  async getDriverDailyStats(driverId: string, date?: Date): Promise<DailyStats> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('driver_daily_stats')
      .select('*')
      .eq('driver_id', driverId)
      .eq('date', dateStr)
      .single();

    if (error || !data) {
      return {
        tripsCompleted: 0,
        totalEarnings: 0,
        bonusEarned: 0,
        date: dateStr,
      };
    }

    return {
      tripsCompleted: data.trips_completed || 0,
      totalEarnings: data.total_earnings || 0,
      bonusEarned: data.bonus_earned || 0,
      date: dateStr,
    };
  }

  async incrementDriverTrips(driverId: string, earnings: number): Promise<DailyStats> {
    const dateStr = new Date().toISOString().split('T')[0];

    const currentStats = await this.getDriverDailyStats(driverId);
    const newTripsCount = currentStats.tripsCompleted + 1;

    let newBonus = 0;
    const previousBonusSets = Math.floor(currentStats.tripsCompleted / TRIPS_FOR_BONUS);
    const newBonusSets = Math.floor(newTripsCount / TRIPS_FOR_BONUS);
    if (newBonusSets > previousBonusSets) {
      newBonus = BONUS_AMOUNT_BDT;
    }

    const { data, error } = await supabaseAdmin
      .from('driver_daily_stats')
      .upsert({
        driver_id: driverId,
        date: dateStr,
        trips_completed: newTripsCount,
        total_earnings: currentStats.totalEarnings + earnings,
        bonus_earned: currentStats.bonusEarned + newBonus,
      }, {
        onConflict: 'driver_id,date',
      })
      .select()
      .single();

    if (error) {
      logger.error('[Incentive] Failed to update driver stats:', error);
      throw error;
    }

    if (newBonus > 0) {
      logger.info(`[Incentive] Driver ${driverId} earned bonus of ${BONUS_AMOUNT_BDT} BDT for completing ${newTripsCount} trips`);
    }

    return {
      tripsCompleted: newTripsCount,
      totalEarnings: currentStats.totalEarnings + earnings,
      bonusEarned: currentStats.bonusEarned + newBonus,
      date: dateStr,
    };
  }

  calculateDriverBonus(tripsCompleted: number): number {
    const bonusSets = Math.floor(tripsCompleted / TRIPS_FOR_BONUS);
    return bonusSets * BONUS_AMOUNT_BDT;
  }

  calculateFullPoolPassengerBonus(baseFare: number): number {
    return Math.round(baseFare * (FULL_POOL_PASSENGER_DISCOUNT_PERCENT / 100));
  }

  async getDriverWeeklyStats(driverId: string): Promise<{
    totalTrips: number;
    totalEarnings: number;
    totalBonuses: number;
    dailyBreakdown: DailyStats[];
  }> {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseAdmin
      .from('driver_daily_stats')
      .select('*')
      .eq('driver_id', driverId)
      .gte('date', weekAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      logger.error('[Incentive] Failed to get weekly stats:', error);
      return {
        totalTrips: 0,
        totalEarnings: 0,
        totalBonuses: 0,
        dailyBreakdown: [],
      };
    }

    const dailyBreakdown = (data || []).map((d) => ({
      tripsCompleted: d.trips_completed || 0,
      totalEarnings: d.total_earnings || 0,
      bonusEarned: d.bonus_earned || 0,
      date: d.date,
    }));

    return {
      totalTrips: dailyBreakdown.reduce((sum, d) => sum + d.tripsCompleted, 0),
      totalEarnings: dailyBreakdown.reduce((sum, d) => sum + d.totalEarnings, 0),
      totalBonuses: dailyBreakdown.reduce((sum, d) => sum + d.bonusEarned, 0),
      dailyBreakdown,
    };
  }

  async applyPassengerReferralBonus(userId: string, referralCode: string): Promise<boolean> {
    const { data: referrer } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .neq('id', userId)
      .single();

    if (!referrer) {
      return false;
    }

    await supabaseAdmin
      .from('wallet_transactions')
      .insert([
        {
          wallet_id: await this.getWalletId(userId),
          type: 'CREDIT',
          amount: 50,
          reference_type: 'REFERRAL_BONUS',
          description: 'Referral bonus for signing up',
        },
        {
          wallet_id: await this.getWalletId(referrer.id),
          type: 'CREDIT',
          amount: 50,
          reference_type: 'REFERRAL_BONUS',
          description: 'Referral bonus for inviting a friend',
        },
      ]);

    return true;
  }

  private async getWalletId(userId: string): Promise<string> {
    const { data } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!data) {
      const { data: newWallet } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: userId, balance: 0 })
        .select()
        .single();
      return newWallet?.id;
    }

    return data.id;
  }

  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' = 'weekly', limit: number = 10): Promise<{
    driverId: string;
    trips: number;
    earnings: number;
    rank: number;
  }[]> {
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'daily':
        startDate = new Date(now.toISOString().split('T')[0]);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const { data, error } = await supabaseAdmin
      .from('driver_daily_stats')
      .select('driver_id, trips_completed, total_earnings')
      .gte('date', startDate.toISOString().split('T')[0]);

    if (error || !data) {
      return [];
    }

    const aggregated = data.reduce((acc, row) => {
      if (!acc[row.driver_id]) {
        acc[row.driver_id] = { trips: 0, earnings: 0 };
      }
      acc[row.driver_id].trips += row.trips_completed || 0;
      acc[row.driver_id].earnings += row.total_earnings || 0;
      return acc;
    }, {} as Record<string, { trips: number; earnings: number }>);

    const sorted = Object.entries(aggregated)
      .map(([driverId, stats]) => ({ driverId, ...stats }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return sorted;
  }
}

export const incentiveService = new IncentiveService();
