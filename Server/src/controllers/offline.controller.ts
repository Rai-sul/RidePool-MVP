import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { offlineService } from '../services/offline.service';
import { z } from 'zod';

import { errorResponse, successResponse, unauthorizedResponse } from '../utils/response';

const OfflineActionSchema = z.object({
  id: z.string(),
  actionType: z.enum([
    'UPDATE_LOCATION',
    'CANCEL_RIDE',
    'RATE_RIDE',
    'SEND_MESSAGE',
    'UPDATE_PROFILE',
    'MARK_PICKUP',
    'MARK_DROPOFF',
  ]),
  payload: z.record(z.string(), z.any()),
  createdAt: z.string(),
});

const SyncRequestSchema = z.object({
  actions: z.array(OfflineActionSchema),
});

const ConflictResolutionSchema = z.object({
  resolutions: z.array(z.object({
    actionId: z.string(),
    resolution: z.enum(['CLIENT_WINS', 'SERVER_WINS', 'MERGE']),
    mergedData: z.record(z.string(), z.any()).optional(),
  })),
});

export class OfflineController {
  async getOfflinePackage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const offlineData = await offlineService.getOfflineDataPackage(userId);

      successResponse(res, offlineData);
    } catch (error) {
      next(error);
    }
  }

  async syncActions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = SyncRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid sync request', 400, parseResult.error.issues);
      }

      const actions = parseResult.data.actions.map((a) => ({
        id: a.id,
        userId,
        actionType: a.actionType,
        payload: a.payload,
        createdAt: a.createdAt,
        syncedAt: null,
        status: 'PENDING' as const,
        retryCount: 0,
        errorMessage: null,
      }));

      const result = await offlineService.syncOfflineActions(userId, actions);

      res.json({
        success: result.success,
        data: {
          synced_count: result.syncedCount,
          failed_count: result.failedCount,
          conflict_count: result.conflictCount,
          actions: result.actions,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async resolveConflicts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = ConflictResolutionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid resolution request', 400);
      }

      const result = await offlineService.resolveConflicts(userId, parseResult.data.resolutions);

      res.json({
        success: result.success,
        data: {
          synced_count: result.syncedCount,
          failed_count: result.failedCount,
          actions: result.actions,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPendingActions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const pendingActions = await offlineService.getPendingActions(userId);

      successResponse(res, { actions: pendingActions });
    } catch (error) {
      next(error);
    }
  }

  async getSyncStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const status = await offlineService.getLastSyncStatus(userId);

      successResponse(res, status);
    } catch (error) {
      next(error);
    }
  }

  async clearSyncedActions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const days = parseInt(req.query.older_than_days as string) || 7;
      const clearedCount = await offlineService.clearSyncedActions(userId, days);

      successResponse(res, { cleared_count: clearedCount });
    } catch (error) {
      next(error);
    }
  }
}

export const offlineController = new OfflineController();
