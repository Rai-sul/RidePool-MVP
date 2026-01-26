import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  max_discount_amount: number | null;
  min_ride_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  promo?: PromoCode;
  discountAmount?: number;
}

export class PromoService {
  async validatePromoCode(
    code: string,
    userId: string,
    rideAmount: number
  ): Promise<PromoValidationResult> {
    try {
      const { data: promo, error } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promo) {
        return { valid: false, error: 'Invalid promo code' };
      }

      const now = new Date();

      if (promo.valid_from && new Date(promo.valid_from) > now) {
        return { valid: false, error: 'Promo code is not yet active' };
      }

      if (promo.valid_until && new Date(promo.valid_until) < now) {
        return { valid: false, error: 'Promo code has expired' };
      }

      if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
        return { valid: false, error: 'Promo code usage limit reached' };
      }

      if (promo.min_ride_amount && rideAmount < promo.min_ride_amount) {
        return {
          valid: false,
          error: `Minimum ride amount of ৳${promo.min_ride_amount} required`,
        };
      }

      const { count } = await supabaseAdmin
        .from('user_promo_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('promo_code_id', promo.id);

      if (count && count > 0) {
        return { valid: false, error: 'You have already used this promo code' };
      }

      const discountAmount = this.calculateDiscount(promo, rideAmount);

      return {
        valid: true,
        promo,
        discountAmount,
      };
    } catch (error) {
      logger.error('[PromoService] Validation error:', error);
      return { valid: false, error: 'Failed to validate promo code' };
    }
  }

  calculateDiscount(promo: PromoCode, rideAmount: number): number {
    let discount: number;

    if (promo.discount_type === 'PERCENTAGE') {
      discount = (rideAmount * promo.discount_value) / 100;
    } else {
      discount = promo.discount_value;
    }

    if (promo.max_discount_amount && discount > promo.max_discount_amount) {
      discount = promo.max_discount_amount;
    }

    return Math.round(discount * 100) / 100;
  }

  async applyPromoCode(
    promoCodeId: string,
    userId: string,
    rideId: string,
    discountAmount: number
  ): Promise<boolean> {
    try {
      const { error: usageError } = await supabaseAdmin
        .from('user_promo_usage')
        .insert({
          user_id: userId,
          promo_code_id: promoCodeId,
          ride_id: rideId,
          discount_amount: discountAmount,
        });

      if (usageError) {
        throw usageError;
      }

      await supabaseAdmin.rpc('increment_promo_usage', { promo_id: promoCodeId });

      logger.info(`[PromoService] Applied promo ${promoCodeId} for user ${userId}, discount: ${discountAmount}`);
      return true;
    } catch (error) {
      logger.error('[PromoService] Apply error:', error);
      return false;
    }
  }

  async getActivePromoCodes(): Promise<PromoCode[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${now}`)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[PromoService] Get active promos error:', error);
      return [];
    }

    return data || [];
  }

  async getUserPromoHistory(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('user_promo_usage')
      .select(`
        id,
        discount_amount,
        used_at,
        promo_codes(code, description, discount_type, discount_value)
      `)
      .eq('user_id', userId)
      .order('used_at', { ascending: false });

    if (error) {
      logger.error('[PromoService] Get history error:', error);
      return [];
    }

    return data || [];
  }

  async createPromoCode(promoData: Partial<PromoCode>): Promise<PromoCode | null> {
    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .insert({
        code: promoData.code?.toUpperCase(),
        description: promoData.description,
        discount_type: promoData.discount_type,
        discount_value: promoData.discount_value,
        max_discount_amount: promoData.max_discount_amount,
        min_ride_amount: promoData.min_ride_amount,
        usage_limit: promoData.usage_limit,
        valid_from: promoData.valid_from,
        valid_until: promoData.valid_until,
        is_active: promoData.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      logger.error('[PromoService] Create error:', error);
      return null;
    }

    return data;
  }

  async deactivatePromoCode(promoId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('promo_codes')
      .update({ is_active: false })
      .eq('id', promoId);

    return !error;
  }
}

export const promoService = new PromoService();
