import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { advanceBookingService, AdvanceBookingError } from '../services/advanceBooking.service';
import { advanceDispatchService } from '../services/advanceDispatch.service';
import { penaltyService } from '../services/penalty.service';
import { CreateAdvanceBookingRequest } from '../types';
import { advanceWindow } from '../utils/advanceWindow';
import { config } from '../config/env';
import { logger } from '../utils/logger';

import { createdResponse, successResponse, unauthorizedResponse } from '../utils/response';

/** Error codes the client can act on; everything else is a server fault. */
const CLIENT_ERROR_CODES = new Set([
  'INVALID_PICKUP_TIME',
  'OVERLAPPING_BOOKING',
  'BOOKING_NOT_FOUND',
  'BOOKING_CLOSED',
  'POOL_NOT_FOUND',
  'POOL_FULL',
  'POOL_NO_LONGER_JOINABLE',
  'POOL_NO_LONGER_ACTIVE',
  'GENDER_NOT_COMPATIBLE',
  'ALREADY_IN_POOL',
  'NOT_A_MEMBER',
  'CONFIRMATION_NOT_OPEN',
  'CONFIRMATION_IN_PROGRESS',
  'PICKUP_WINDOW_EXCEEDED',
]);

export class AdvanceBookingController {
  /** POST /api/advance-bookings - create a booking and auto-assign it to a pool. */
  async createBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.unauthorized(res);
      }

      const cooldown = await penaltyService.isUserInCooldown(userId);
      if (cooldown.inCooldown) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'COOLDOWN_ACTIVE',
            message: `You are in a cooldown period. Please wait ${Math.ceil(cooldown.remainingSeconds / 60)} minutes.`,
            ends_at: cooldown.endsAt,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await advanceBookingService.createBooking(
        userId,
        req.body as CreateAdvanceBookingRequest
      );

      logger.info(`[Advance] User ${userId} booked ${result.ride_id} into pool ${result.pool_id}`);

      return createdResponse(res, { booking: result, timing: this.timingInfo() });
    } catch (error) {
      return this.handle(error, res, next);
    }
  }

  /** GET /api/advance-bookings - the rider's upcoming bookings. */
  async listBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.unauthorized(res);
      }

      const bookings = await advanceBookingService.listBookings(userId);

      return successResponse(res, { bookings, timing: this.timingInfo() });
    } catch (error) {
      return this.handle(error, res, next);
    }
  }

  /** PATCH /api/advance-bookings/:rideId - re-run matching with new details. */
  async updateBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.unauthorized(res);
      }

      const result = await advanceBookingService.updateBooking(
        userId,
        req.params.rideId,
        req.body as CreateAdvanceBookingRequest
      );

      return successResponse(res, { booking: result, timing: this.timingInfo() });
    } catch (error) {
      return this.handle(error, res, next);
    }
  }

  /** DELETE /api/advance-bookings/:rideId - cancel and release the seat. */
  async cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.unauthorized(res);
      }

      const result = await advanceBookingService.cancelBooking(userId, req.params.rideId);

      return successResponse(res, { cancelled: true, pool_id: result.pool_id });
    } catch (error) {
      return this.handle(error, res, next);
    }
  }

  /**
   * POST /api/advance-bookings/:poolId/confirm - the rider is still going.
   *
   * The second confirmation makes the pool live, which starts the driver
   * search and opens it to instant riders.
   */
  async confirmBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.unauthorized(res);
      }

      const { poolId } = req.params;
      const result = await advanceBookingService.confirmBooking(userId, poolId);

      if (result.active_range_opened) {
        await advanceDispatchService.onActiveRangeOpened(poolId);
      }

      return successResponse(res, {
        confirmed: true,
        confirmed_count: result.confirmed_count,
        pool_confirmed: result.active_range_opened,
      });
    } catch (error) {
      return this.handle(error, res, next);
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  /** The windows in force, so the client can render deadlines without guessing. */
  private timingInfo() {
    return {
      unit: config.advanceBooking.unitSeconds === 1 ? 'seconds' : 'minutes',
      pool_window_units: config.advanceBooking.poolWindowUnits,
      confirm_lead_units: config.advanceBooking.confirmLeadUnits,
      confirm_window_units: config.advanceBooking.confirmWindowUnits,
      pool_window_seconds: advanceWindow.poolWindowSeconds,
      confirm_lead_seconds: advanceWindow.confirmLeadSeconds,
      confirm_window_seconds: advanceWindow.confirmWindowSeconds,
      max_lead_days: config.advanceBooking.maxLeadDays,
    };
  }

  private unauthorized(res: Response) {
    return unauthorizedResponse(res, 'Authentication required');
  }

  private handle(error: unknown, res: Response, next: NextFunction) {
    if (error instanceof AdvanceBookingError && CLIENT_ERROR_CODES.has(error.code)) {
      const status = error.code === 'BOOKING_NOT_FOUND' || error.code === 'POOL_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: { code: error.code, message: error.message },
        timestamp: new Date().toISOString(),
      });
    }

    return next(error);
  }
}

export const advanceBookingController = new AdvanceBookingController();
