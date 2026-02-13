import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { auditService } from './audit.service';

export interface FraudCheck {
  isSuspicious: boolean;
  riskScore: number;
  flags: string[];
  action: 'ALLOW' | 'REVIEW' | 'BLOCK';
}

export interface FraudPattern {
  type: string;
  description: string;
  threshold: number;
  timeWindowMinutes: number;
}

const FRAUD_PATTERNS: FraudPattern[] = [
  { type: 'RAPID_CANCELLATIONS', description: 'Too many cancellations in short time', threshold: 3, timeWindowMinutes: 60 },
  { type: 'RAPID_RIDE_REQUESTS', description: 'Too many ride requests in short time', threshold: 10, timeWindowMinutes: 30 },
  { type: 'SUSPICIOUS_LOCATION', description: 'Requests from unusual locations', threshold: 5, timeWindowMinutes: 60 },
  { type: 'PAYMENT_FAILURES', description: 'Multiple payment failures', threshold: 3, timeWindowMinutes: 120 },
  { type: 'PROMO_ABUSE', description: 'Excessive promo code usage', threshold: 5, timeWindowMinutes: 1440 },
  { type: 'FAKE_GPS', description: 'GPS spoofing detected', threshold: 1, timeWindowMinutes: 10 },
  { type: 'VELOCITY_ANOMALY', description: 'Impossible travel speed detected', threshold: 1, timeWindowMinutes: 5 },
];

export class FraudDetectionService {
  async checkUser(userId: string): Promise<FraudCheck> {
    const flags: string[] = [];
    let riskScore = 0;

    const [
      cancellationCheck,
      requestCheck,
      paymentCheck,
      promoCheck,
      reputationCheck,
    ] = await Promise.all([
      this.checkRapidCancellations(userId),
      this.checkRapidRequests(userId),
      this.checkPaymentFailures(userId),
      this.checkPromoAbuse(userId),
      this.checkUserReputation(userId),
    ]);

    if (cancellationCheck.suspicious) {
      flags.push('RAPID_CANCELLATIONS');
      riskScore += cancellationCheck.score;
    }

    if (requestCheck.suspicious) {
      flags.push('RAPID_RIDE_REQUESTS');
      riskScore += requestCheck.score;
    }

    if (paymentCheck.suspicious) {
      flags.push('PAYMENT_FAILURES');
      riskScore += paymentCheck.score;
    }

    if (promoCheck.suspicious) {
      flags.push('PROMO_ABUSE');
      riskScore += promoCheck.score;
    }

    if (reputationCheck.suspicious) {
      flags.push('LOW_REPUTATION');
      riskScore += reputationCheck.score;
    }

    const normalizedScore = Math.min(riskScore, 100);
    let action: 'ALLOW' | 'REVIEW' | 'BLOCK' = 'ALLOW';

    if (normalizedScore >= 70) {
      action = 'BLOCK';
    } else if (normalizedScore >= 40) {
      action = 'REVIEW';
    }

    if (flags.length > 0) {
      logger.warn(`[FraudDetection] User ${userId} flagged: ${flags.join(', ')}, score: ${normalizedScore}`);
    }

    return {
      isSuspicious: flags.length > 0,
      riskScore: normalizedScore,
      flags,
      action,
    };
  }

  private async checkRapidCancellations(userId: string): Promise<{ suspicious: boolean; score: number }> {
    const pattern = FRAUD_PATTERNS.find((p) => p.type === 'RAPID_CANCELLATIONS')!;
    const since = new Date(Date.now() - pattern.timeWindowMinutes * 60 * 1000).toISOString();

    const { count } = await supabaseAdmin
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'CANCELLED')
      .gte('cancelled_at', since);

    const suspicious = (count || 0) >= pattern.threshold;
    return { suspicious, score: suspicious ? 25 : 0 };
  }

  private async checkRapidRequests(userId: string): Promise<{ suspicious: boolean; score: number }> {
    const pattern = FRAUD_PATTERNS.find((p) => p.type === 'RAPID_RIDE_REQUESTS')!;
    const since = new Date(Date.now() - pattern.timeWindowMinutes * 60 * 1000).toISOString();

    const { count } = await supabaseAdmin
      .from('rides')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);

    const suspicious = (count || 0) >= pattern.threshold;
    return { suspicious, score: suspicious ? 20 : 0 };
  }

  private async checkPaymentFailures(userId: string): Promise<{ suspicious: boolean; score: number }> {
    const pattern = FRAUD_PATTERNS.find((p) => p.type === 'PAYMENT_FAILURES')!;
    const since = new Date(Date.now() - pattern.timeWindowMinutes * 60 * 1000).toISOString();

    const { count } = await supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'FAILED')
      .gte('created_at', since);

    const suspicious = (count || 0) >= pattern.threshold;
    return { suspicious, score: suspicious ? 30 : 0 };
  }

  private async checkPromoAbuse(userId: string): Promise<{ suspicious: boolean; score: number }> {
    const pattern = FRAUD_PATTERNS.find((p) => p.type === 'PROMO_ABUSE')!;
    const since = new Date(Date.now() - pattern.timeWindowMinutes * 60 * 1000).toISOString();

    const { count } = await supabaseAdmin
      .from('user_promo_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('used_at', since);

    const suspicious = (count || 0) >= pattern.threshold;
    return { suspicious, score: suspicious ? 15 : 0 };
  }

  private async checkUserReputation(userId: string): Promise<{ suspicious: boolean; score: number }> {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('average_rating, total_ratings, penalty_points')
      .eq('id', userId)
      .single();

    if (!user) {
      return { suspicious: false, score: 0 };
    }

    let score = 0;

    if (user.average_rating && user.total_ratings >= 5 && user.average_rating < 2.5) {
      score += 20;
    }

    if (user.penalty_points && user.penalty_points >= 50) {
      score += 25;
    }

    return { suspicious: score > 0, score };
  }

  async checkLocationVelocity(
    userId: string,
    currentLat: number,
    currentLng: number
  ): Promise<{ suspicious: boolean; speedKmh: number }> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: lastRide } = await supabaseAdmin
        .from('rides')
        .select('pickup_lat, pickup_lng, created_at')
        .eq('user_id', userId)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastRide) {
        return { suspicious: false, speedKmh: 0 };
      }

      const distance = this.calculateDistance(
        lastRide.pickup_lat,
        lastRide.pickup_lng,
        currentLat,
        currentLng
      );

      const timeHours = (Date.now() - new Date(lastRide.created_at).getTime()) / (1000 * 60 * 60);
      const speedKmh = timeHours > 0 ? distance / timeHours : 0;

      const MAX_POSSIBLE_SPEED = 200;
      const suspicious = speedKmh > MAX_POSSIBLE_SPEED;

      if (suspicious) {
        await auditService.logUserAction(userId, 'SYSTEM_EVENT', 'fraud_detection', null, {
          type: 'VELOCITY_ANOMALY',
          speedKmh,
          distance,
        });
      }

      return { suspicious, speedKmh: Math.round(speedKmh) };
    } catch (error) {
      logger.error('[FraudDetection] checkLocationVelocity error:', error);
      return { suspicious: false, speedKmh: 0 };
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async reportFraud(
    reporterId: string,
    suspectId: string,
    rideId: string | null,
    description: string
  ): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('fraud_reports')
        .insert({
          reporter_id: reporterId,
          suspect_id: suspectId,
          ride_id: rideId,
          description,
          status: 'PENDING',
        });

      if (error) {
        throw error;
      }

      await auditService.logUserAction(reporterId, 'SYSTEM_EVENT', 'fraud_report', suspectId, {
        ride_id: rideId,
        description,
      });

      logger.info(`[FraudDetection] Fraud report filed by ${reporterId} against ${suspectId}`);
      return true;
    } catch (error) {
      logger.error('[FraudDetection] reportFraud error:', error);
      return false;
    }
  }

  async getFraudReports(status?: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED'): Promise<any[]> {
    let query = supabaseAdmin
      .from('fraud_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[FraudDetection] getFraudReports error:', error);
      return [];
    }

    return data || [];
  }

  async updateFraudReportStatus(
    reportId: string,
    status: 'REVIEWED' | 'RESOLVED' | 'DISMISSED',
    notes?: string
  ): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('fraud_reports')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        notes,
      })
      .eq('id', reportId);

    return !error;
  }
}

export const fraudDetectionService = new FraudDetectionService();
