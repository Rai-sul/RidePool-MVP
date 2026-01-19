import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { auditService, AuditAction } from '../services/audit.service';
import { logger } from '../utils/logger';

export interface AuditConfig {
  action: AuditAction;
  resourceType: string;
  getResourceId?: (req: AuthRequest) => string | null;
  getDetails?: (req: AuthRequest, res: Response) => Record<string, any>;
}

export const auditMiddleware = (config: AuditConfig) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      setImmediate(async () => {
        try {
          const userId = req.user?.id || null;
          const resourceId = config.getResourceId?.(req) || null;
          const details = config.getDetails?.(req, res) || {};

          await auditService.log({
            user_id: userId,
            action: config.action,
            resource_type: config.resourceType,
            resource_id: resourceId,
            details: {
              ...details,
              status_code: res.statusCode,
              success: body?.success ?? res.statusCode < 400,
              path: req.path,
              method: req.method,
            },
            ip_address: req.ip || req.socket.remoteAddress || null,
            user_agent: req.get('User-Agent') || null,
          });
        } catch (error) {
          logger.error('[AuditMiddleware] Failed to log audit:', error);
        }
      });

      return originalJson(body);
    };

    next();
  };
};

export const auditAdminAction = async (
  userId: string,
  action: string,
  targetResource: string,
  targetId: string,
  details: Record<string, any>,
  request?: { ip?: string; headers?: Record<string, string> }
): Promise<void> => {
  logger.info('[AdminAudit] Admin action performed', {
    admin_user_id: userId,
    action,
    target_resource: targetResource,
    target_id: targetId,
    details,
    timestamp: new Date().toISOString(),
  });

  await auditService.log({
    user_id: userId,
    action: 'ADMIN_ACTION',
    resource_type: targetResource,
    resource_id: targetId,
    details: {
      admin_action: action,
      ...details,
    },
    ip_address: request?.ip || null,
    user_agent: request?.headers?.['user-agent'] || null,
  });
};

export const logSupabaseAdminUsage = (
  operation: string,
  table: string,
  userId: string | null,
  context: Record<string, any> = {}
): void => {
  logger.info('[SupabaseAdmin] Admin client used', {
    operation,
    table,
    user_id: userId,
    context,
    timestamp: new Date().toISOString(),
    warning: 'supabaseAdmin bypasses RLS - verify authorization is checked',
  });
};

export const createAuditedAdminQuery = <T>(
  queryFn: () => Promise<T>,
  operation: string,
  table: string,
  userId: string | null,
  context: Record<string, any> = {}
): Promise<T> => {
  logSupabaseAdminUsage(operation, table, userId, context);
  return queryFn();
};

export const auditRideRequest = auditMiddleware({
  action: 'RIDE_REQUESTED',
  resourceType: 'ride',
  getResourceId: (req) => req.body?.ride_id || null,
  getDetails: (req) => ({
    pickup: { lat: req.body?.pickup_lat, lng: req.body?.pickup_lng },
    dropoff: { lat: req.body?.dropoff_lat, lng: req.body?.dropoff_lng },
    vehicle_type: req.body?.vehicle_type,
  }),
});

export const auditPoolJoin = auditMiddleware({
  action: 'POOL_JOINED',
  resourceType: 'pool',
  getResourceId: (req) => req.params?.poolId || null,
  getDetails: (req) => ({
    ride_id: req.body?.ride_id,
  }),
});

export const auditPayment = auditMiddleware({
  action: 'PAYMENT_INITIATED',
  resourceType: 'payment',
  getResourceId: (req) => req.body?.ride_id || null,
  getDetails: (req) => ({
    amount: req.body?.amount,
    payment_method: req.body?.payment_method,
    has_idempotency_key: !!req.body?.idempotency_key,
  }),
});

export const auditSOS = auditMiddleware({
  action: 'SOS_TRIGGERED',
  resourceType: 'safety',
  getResourceId: (req) => req.body?.ride_id || null,
  getDetails: (req) => ({
    location: req.body?.location,
    emergency_type: req.body?.emergency_type,
  }),
});

export const auditLogin = auditMiddleware({
  action: 'USER_LOGIN',
  resourceType: 'auth',
  getDetails: (req) => ({
    email: req.body?.email ? `${req.body.email.slice(0, 3)}***` : null,
  }),
});

export const auditRegistration = auditMiddleware({
  action: 'USER_REGISTERED',
  resourceType: 'auth',
  getDetails: (req) => ({
    email: req.body?.email ? `${req.body.email.slice(0, 3)}***` : null,
    gender: req.body?.gender,
  }),
});
