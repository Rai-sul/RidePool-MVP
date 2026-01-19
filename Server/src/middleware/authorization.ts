import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

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
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const resourceId = req.params[config.idParam];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_RESOURCE_ID', message: `Missing ${config.idParam} parameter` },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: resource, error } = await supabaseAdmin
        .from(config.table)
        .select(config.ownerColumn)
        .eq('id', resourceId)
        .single();

      if (error || !resource) {
        return res.status(404).json({
          success: false,
          error: { code: 'RESOURCE_NOT_FOUND', message: 'Resource not found' },
          timestamp: new Date().toISOString(),
        });
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

        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this resource' },
          timestamp: new Date().toISOString(),
        });
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
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    if (!poolId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_POOL_ID', message: 'Pool ID required' },
        timestamp: new Date().toISOString(),
      });
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
      return res.status(404).json({
        success: false,
        error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
        timestamp: new Date().toISOString(),
      });
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

      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this pool' },
        timestamp: new Date().toISOString(),
      });
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
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('is_driver, driver_verified')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        timestamp: new Date().toISOString(),
      });
    }

    if (!user.is_driver) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_DRIVER', message: 'User is not registered as a driver' },
        timestamp: new Date().toISOString(),
      });
    }

    if (!user.driver_verified) {
      return res.status(403).json({
        success: false,
        error: { code: 'DRIVER_NOT_VERIFIED', message: 'Driver verification pending' },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
