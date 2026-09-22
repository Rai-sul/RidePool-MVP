import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { promoService } from '../services/promo.service';
import { z } from 'zod';

import { createdResponse, errorResponse, successResponse, unauthorizedResponse } from '../utils/response';

const ValidatePromoSchema = z.object({
  code: z.string().min(1).max(50),
  ride_amount: z.number().positive(),
});

const CreatePromoSchema = z.object({
  code: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  discount_type: z.enum(['PERCENTAGE', 'FIXED']),
  discount_value: z.number().positive(),
  max_discount_amount: z.number().positive().optional(),
  min_ride_amount: z.number().positive().optional(),
  usage_limit: z.number().int().positive().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
});

export class PromoController {
  async validatePromo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = ValidatePromoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const { code, ride_amount } = parseResult.data;
      const result = await promoService.validatePromoCode(code, userId, ride_amount);

      if (!result.valid) {
        return errorResponse(res, 'INVALID_PROMO', result.error, 400);
      }

      successResponse(res, {
        code: result.promo?.code,
        discount_type: result.promo?.discount_type,
        discount_value: result.promo?.discount_value,
        discount_amount: result.discountAmount,
        description: result.promo?.description,
      });
    } catch (error) {
      next(error);
    }
  }

  async getActivePromos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const promos = await promoService.getActivePromoCodes();

      successResponse(res, {
        promos: promos.map((p) => ({
          code: p.code,
          description: p.description,
          discount_type: p.discount_type,
          discount_value: p.discount_value,
          max_discount_amount: p.max_discount_amount,
          min_ride_amount: p.min_ride_amount,
          valid_until: p.valid_until,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyPromoHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const history = await promoService.getUserPromoHistory(userId);

      successResponse(res, { history });
    } catch (error) {
      next(error);
    }
  }

  async createPromo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const parseResult = CreatePromoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const promo = await promoService.createPromoCode(parseResult.data);

      if (!promo) {
        return errorResponse(res, 'CREATE_FAILED', 'Failed to create promo code', 500);
      }

      createdResponse(res, { promo });
    } catch (error) {
      next(error);
    }
  }

  async deactivatePromo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { promoId } = req.params;

      const success = await promoService.deactivatePromoCode(promoId);

      if (!success) {
        return errorResponse(res, 'DEACTIVATE_FAILED', 'Failed to deactivate promo code', 500);
      }

      successResponse(res, { message: 'Promo code deactivated' });
    } catch (error) {
      next(error);
    }
  }
}

export const promoController = new PromoController();
