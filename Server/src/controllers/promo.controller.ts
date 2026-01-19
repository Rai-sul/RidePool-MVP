import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { promoService } from '../services/promo.service';
import { z } from 'zod';

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
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = ValidatePromoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { code, ride_amount } = parseResult.data;
      const result = await promoService.validatePromoCode(code, userId, ride_amount);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PROMO', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          code: result.promo?.code,
          discount_type: result.promo?.discount_type,
          discount_value: result.promo?.discount_value,
          discount_amount: result.discountAmount,
          description: result.promo?.description,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getActivePromos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const promos = await promoService.getActivePromoCodes();

      res.json({
        success: true,
        data: {
          promos: promos.map((p) => ({
            code: p.code,
            description: p.description,
            discount_type: p.discount_type,
            discount_value: p.discount_value,
            max_discount_amount: p.max_discount_amount,
            min_ride_amount: p.min_ride_amount,
            valid_until: p.valid_until,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyPromoHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const history = await promoService.getUserPromoHistory(userId);

      res.json({
        success: true,
        data: { history },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async createPromo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const parseResult = CreatePromoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const promo = await promoService.createPromoCode(parseResult.data);

      if (!promo) {
        return res.status(500).json({
          success: false,
          error: { code: 'CREATE_FAILED', message: 'Failed to create promo code' },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(201).json({
        success: true,
        data: { promo },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivatePromo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { promoId } = req.params;

      const success = await promoService.deactivatePromoCode(promoId);

      if (!success) {
        return res.status(500).json({
          success: false,
          error: { code: 'DEACTIVATE_FAILED', message: 'Failed to deactivate promo code' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { message: 'Promo code deactivated' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const promoController = new PromoController();
