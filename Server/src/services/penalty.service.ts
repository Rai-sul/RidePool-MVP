import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

const DELIBERATE_CANCELLATION_THRESHOLD_SECONDS = 30;
const MAX_DELIBERATE_CANCELLATIONS = 3;
const CANCELLATION_WINDOW_MINUTES = 5;
const COOLDOWN_DURATION_MS = 7 * 60 * 1000;

interface CancellationRecord {
  id: string;
  user_id: string;
  ride_id: string;
  cancelled_at: string;
  cancellation_time_seconds: number;
  is_deliberate: boolean;
  penalty_applied: boolean;
}

interface CooldownPeriod {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  penalty_count: number;
}

export class PenaltyService {
  async recordCancellation(userId: string, rideId: string, rideCreatedAt: string): Promise<{
    isDeliberate: boolean;
    penaltyApplied: boolean;
    cooldownEndsAt: string | null;
  }> {
    const now = new Date();
    const rideCreatedTime = new Date(rideCreatedAt);
    const secondsSinceCreation = Math.floor((now.getTime() - rideCreatedTime.getTime()) / 1000);
    const isDeliberate = secondsSinceCreation >= DELIBERATE_CANCELLATION_THRESHOLD_SECONDS;

    await supabaseAdmin.from('user_cancellations').insert({
      user_id: userId,
      ride_id: rideId,
      cancelled_at: now.toISOString(),
      cancellation_time_seconds: secondsSinceCreation,
      is_deliberate: isDeliberate,
      penalty_applied: false,
    });

    if (!isDeliberate) {
      logger.info(`[Penalty] Quick cancellation (${secondsSinceCreation}s) by user ${userId}, not counted`);
      return { isDeliberate: false, penaltyApplied: false, cooldownEndsAt: null };
    }

    const windowStart = new Date(now.getTime() - CANCELLATION_WINDOW_MINUTES * 60 * 1000);

    const { data: recentCancellations } = await supabaseAdmin
      .from('user_cancellations')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deliberate', true)
      .gte('cancelled_at', windowStart.toISOString());

    const deliberateCount = recentCancellations?.length || 0;

    if (deliberateCount >= MAX_DELIBERATE_CANCELLATIONS) {
      const cooldownEndsAt = await this.applyCooldown(userId, deliberateCount);
      return { isDeliberate: true, penaltyApplied: true, cooldownEndsAt };
    }

    logger.info(`[Penalty] Deliberate cancellation by user ${userId}, count: ${deliberateCount}/${MAX_DELIBERATE_CANCELLATIONS}`);
    return { isDeliberate: true, penaltyApplied: false, cooldownEndsAt: null };
  }

  private async applyCooldown(userId: string, penaltyCount: number): Promise<string> {
    const now = new Date();
    const endsAt = new Date(now.getTime() + COOLDOWN_DURATION_MS);

    await supabaseAdmin.from('cooldown_periods').insert({
      user_id: userId,
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      reason: 'EXCESSIVE_CANCELLATIONS',
      penalty_count: penaltyCount,
    });

    await supabaseAdmin
      .from('user_cancellations')
      .update({ penalty_applied: true })
      .eq('user_id', userId)
      .eq('is_deliberate', true)
      .eq('penalty_applied', false);

    logger.info(`[Penalty] Cooldown applied to user ${userId} until ${endsAt.toISOString()}`);
    return endsAt.toISOString();
  }

  async isUserInCooldown(userId: string): Promise<{
    inCooldown: boolean;
    endsAt: string | null;
    remainingSeconds: number;
  }> {
    const now = new Date().toISOString();

    const { data: activeCooldown } = await supabaseAdmin
      .from('cooldown_periods')
      .select('ends_at')
      .eq('user_id', userId)
      .gt('ends_at', now)
      .order('ends_at', { ascending: false })
      .limit(1)
      .single();

    if (!activeCooldown) {
      return { inCooldown: false, endsAt: null, remainingSeconds: 0 };
    }

    const endsAtTime = new Date(activeCooldown.ends_at);
    const remainingMs = endsAtTime.getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    return {
      inCooldown: remainingSeconds > 0,
      endsAt: activeCooldown.ends_at,
      remainingSeconds,
    };
  }

  async getCancellationStats(userId: string): Promise<{
    totalCancellations: number;
    deliberateCancellations: number;
    recentDeliberateCount: number;
    lastCancellation: string | null;
    cooldownHistory: number;
  }> {
    const windowStart = new Date(Date.now() - CANCELLATION_WINDOW_MINUTES * 60 * 1000);

    const { count: totalCount } = await supabaseAdmin
      .from('user_cancellations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: deliberateCount } = await supabaseAdmin
      .from('user_cancellations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_deliberate', true);

    const { data: recentCancellations } = await supabaseAdmin
      .from('user_cancellations')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deliberate', true)
      .gte('cancelled_at', windowStart.toISOString());

    const { data: lastCancellation } = await supabaseAdmin
      .from('user_cancellations')
      .select('cancelled_at')
      .eq('user_id', userId)
      .order('cancelled_at', { ascending: false })
      .limit(1)
      .single();

    const { count: cooldownCount } = await supabaseAdmin
      .from('cooldown_periods')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      totalCancellations: totalCount || 0,
      deliberateCancellations: deliberateCount || 0,
      recentDeliberateCount: recentCancellations?.length || 0,
      lastCancellation: lastCancellation?.cancelled_at || null,
      cooldownHistory: cooldownCount || 0,
    };
  }

  async resetDailyCancellations(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabaseAdmin
      .from('user_cancellations')
      .delete()
      .lt('cancelled_at', today.toISOString());

    logger.info(`[Penalty] Daily reset: cleared ${count || 0} old cancellation records`);
    return count || 0;
  }

  async clearExpiredCooldowns(): Promise<number> {
    const now = new Date().toISOString();

    const { data: expired } = await supabaseAdmin
      .from('cooldown_periods')
      .select('id, user_id')
      .lt('ends_at', now);

    if (expired && expired.length > 0) {
      logger.info(`[Penalty] Cleared ${expired.length} expired cooldown periods`);
    }

    return expired?.length || 0;
  }
}

export const penaltyService = new PenaltyService();
