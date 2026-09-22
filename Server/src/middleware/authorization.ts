import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

import { errorResponse, unauthorizedResponse } from '../utils/response';

export interface ResourceOwnershipCheck {
  table: string;
  idParam: string;
  ownerColumn: string;
  allowAdmin?: boolean;
}

export const checkResourceOwnership = (config: ResourceOwnershipCheck) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const resourceId = req.params[config.idParam];
      if (!resourceId) {
        return errorResponse(res, 'MISSING_RESOURCE_ID', `Missing ${config.idParam} parameter`, 400);
      }

      const { data: resource, error } = await supabaseAdmin
        .from(config.table)
        .select(config.ownerColumn)
        .eq('id', resourceId)
        .single();

      if (error || !resource) {
        return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Resource not found', 404);
      }

      const ownerId = (resource as Record<string, any>)[config.ownerColumn];

      if (ownerId !== userId) {
        if (config.allowAdmin) {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();

          if (user?.is_admin) {
            logger.info('[IDOR] Admin access granted', {
              userId,
              resourceId,
              table: config.table,
            });
            return next();
          }
        }

        logger.warn('[IDOR] Unauthorized resource access attempt', {
          userId,
          resourceId,
          ownerId,
          table: config.table,
          path: req.path,
          method: req.method,
        });

        return errorResponse(res, 'FORBIDDEN', 'You do not have access to this resource', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const checkPoolAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const poolId = req.params.poolId;

    if (!userId) {
      return unauthorizedResponse(res, 'Authentication required');
    }

    if (!poolId) {
      return errorResponse(res, 'MISSING_POOL_ID', 'Pool ID required', 400);
    }

    const { data: pool, error } = await supabaseAdmin
      .from('pools')
      .select(`
        id, creator_user_id, driver_id, status,
        pool_members(user_id)
      `)
      .eq('id', poolId)
      .single();

    if (error || !pool) {
      return errorResponse(res, 'POOL_NOT_FOUND', 'Pool not found', 404);
    }

    const isCreator = pool.creator_user_id === userId;
    const isDriver = pool.driver_id === userId;
    const isMember = pool.pool_members?.some((m: { user_id: string }) => m.user_id === userId);

    if (!isCreator && !isDriver && !isMember) {
      logger.warn('[IDOR] Unauthorized pool access attempt', {
        userId,
        poolId,
        path: req.path,
        method: req.method,
      });

      return errorResponse(res, 'FORBIDDEN', 'You do not have access to this pool', 403);
    }

    (req as any).poolContext = {
      pool,
      isCreator,
      isDriver,
      isMember,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const checkRideOwnership = checkResourceOwnership({
  table: 'rides',
  idParam: 'rideId',
  ownerColumn: 'user_id',
  allowAdmin: true,
});

export const checkDriverAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return unauthorizedResponse(res, 'Authentication required');
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('is_driver, driver_verified')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return errorResponse(res, 'USER_NOT_FOUND', 'User not found', 404);
    }

    if (!user.is_driver) {
      return errorResponse(res, 'NOT_A_DRIVER', 'User is not registered as a driver', 403);
    }

    if (!user.driver_verified) {
      return errorResponse(res, 'DRIVER_NOT_VERIFIED', 'Driver verification pending', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
