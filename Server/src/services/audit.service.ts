import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export type AuditAction =
  | 'USER_REGISTERED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'PROFILE_UPDATED'
  | 'PASSWORD_CHANGED'
  | 'RIDE_REQUESTED'
  | 'RIDE_CANCELLED'
  | 'RIDE_COMPLETED'
  | 'POOL_JOINED'
  | 'POOL_LEFT'
  | 'POOL_CREATED'
  | 'DRIVER_ONLINE'
  | 'DRIVER_OFFLINE'
  | 'DRIVER_ASSIGNED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'WALLET_TOPUP'
  | 'WALLET_DEBIT'
  | 'PROMO_APPLIED'
  | 'RATING_SUBMITTED'
  | 'SOS_TRIGGERED'
  | 'SOS_RESOLVED'
  | 'LOCATION_SHARED'
  | 'MESSAGE_SENT'
  | 'EMERGENCY_CONTACT_ADDED'
  | 'SAVED_PLACE_ADDED'
  | 'ADMIN_ACTION'
  | 'SYSTEM_EVENT';

export interface AuditLogEntry {
  id?: string;
  user_id: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at?: string;
}

export class AuditService {
  async log(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: entry.user_id,
          action: entry.action,
          resource_type: entry.resource_type,
          resource_id: entry.resource_id,
          details: entry.details,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
        });

      if (error) {
        logger.error('[AuditService] Failed to write audit log:', error);
      }
    } catch (error) {
      logger.error('[AuditService] Audit log error:', error);
    }
  }

  async logUserAction(
    userId: string,
    action: AuditAction,
    resourceType: string,
    resourceId: string | null,
    details: Record<string, any>,
    request?: { ip?: string; headers?: Record<string, string> }
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: request?.ip || null,
      user_agent: request?.headers?.['user-agent'] || null,
    });
  }

  async logSystemEvent(
    action: AuditAction,
    resourceType: string,
    resourceId: string | null,
    details: Record<string, any>
  ): Promise<void> {
    await this.log({
      user_id: null,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: null,
      user_agent: 'SYSTEM',
    });
  }

  async getAuditLogs(params: {
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = params;

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (action) {
      query = query.eq('action', action);
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }
    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('[AuditService] Get logs error:', error);
      return { logs: [], total: 0 };
    }

    return {
      logs: data || [],
      total: count || 0,
    };
  }

  async getUserActivitySummary(
    userId: string,
    days: number = 30
  ): Promise<Record<string, number>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('action')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (error || !data) {
      return {};
    }

    const summary: Record<string, number> = {};
    data.forEach((log) => {
      summary[log.action] = (summary[log.action] || 0) + 1;
    });

    return summary;
  }

  async getResourceHistory(
    resourceType: string,
    resourceId: string
  ): Promise<AuditLogEntry[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[AuditService] Get resource history error:', error);
      return [];
    }

    return data || [];
  }

  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { count, error } = await supabaseAdmin
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      logger.error('[AuditService] Cleanup error:', error);
      return 0;
    }

    logger.info(`[AuditService] Cleaned up ${count || 0} old audit logs`);
    return count || 0;
  }
}

export const auditService = new AuditService();
