import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface OfflineAction {
  id: string;
  userId: string;
  actionType: OfflineActionType;
  payload: Record<string, any>;
  createdAt: string;
  syncedAt: string | null;
  status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  retryCount: number;
  errorMessage: string | null;
}

export type OfflineActionType =
  | 'UPDATE_LOCATION'
  | 'CANCEL_RIDE'
  | 'RATE_RIDE'
  | 'SEND_MESSAGE'
  | 'UPDATE_PROFILE'
  | 'TRIGGER_SOS'
  | 'MARK_PICKUP'
  | 'MARK_DROPOFF';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  actions: Array<{
    id: string;
    status: 'SYNCED' | 'FAILED' | 'CONFLICT';
    errorMessage?: string;
  }>;
}

export interface OfflineData {
  userProfile: any;
  activeRide: any;
  activePool: any;
  savedPlaces: any[];
  emergencyContacts: any[];
  recentMessages: any[];
  lastSyncedAt: string;
  version: number;
}

export interface ConflictResolution {
  actionId: string;
  resolution: 'CLIENT_WINS' | 'SERVER_WINS' | 'MERGE';
  mergedData?: Record<string, any>;
}

const MAX_RETRY_COUNT = 3;
const SYNC_BATCH_SIZE = 20;

export class OfflineService {
  async getOfflineDataPackage(userId: string): Promise<OfflineData> {
    try {
      const [userProfile, activeRide, activePool, savedPlaces, emergencyContacts, recentMessages] = 
        await Promise.all([
          this.getUserProfile(userId),
          this.getActiveRide(userId),
          this.getActivePool(userId),
          this.getSavedPlaces(userId),
          this.getEmergencyContacts(userId),
          this.getRecentMessages(userId),
        ]);

      return {
        userProfile,
        activeRide,
        activePool,
        savedPlaces,
        emergencyContacts,
        recentMessages,
        lastSyncedAt: new Date().toISOString(),
        version: Date.now(),
      };
    } catch (error) {
      logger.error('[OfflineService] getOfflineDataPackage error:', error);
      throw error;
    }
  }

  async syncOfflineActions(userId: string, actions: OfflineAction[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      actions: [],
    };

    const sortedActions = actions.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const action of sortedActions.slice(0, SYNC_BATCH_SIZE)) {
      try {
        const syncStatus = await this.syncSingleAction(userId, action);
        
        result.actions.push({
          id: action.id,
          status: syncStatus.status,
          errorMessage: syncStatus.errorMessage,
        });

        if (syncStatus.status === 'SYNCED') {
          result.syncedCount++;
        } else if (syncStatus.status === 'FAILED') {
          result.failedCount++;
        } else if (syncStatus.status === 'CONFLICT') {
          result.conflictCount++;
        }
      } catch (error) {
        result.failedCount++;
        result.actions.push({
          id: action.id,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.success = result.failedCount === 0 && result.conflictCount === 0;

    await this.logSyncAttempt(userId, result);

    return result;
  }

  async resolveConflicts(userId: string, resolutions: ConflictResolution[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      actions: [],
    };

    for (const resolution of resolutions) {
      try {
        await this.applyConflictResolution(userId, resolution);
        result.syncedCount++;
        result.actions.push({
          id: resolution.actionId,
          status: 'SYNCED',
        });
      } catch (error) {
        result.failedCount++;
        result.actions.push({
          id: resolution.actionId,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  async getPendingActions(userId: string): Promise<OfflineAction[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('offline_actions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['PENDING', 'CONFLICT'])
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapToOfflineAction);
    } catch (error) {
      logger.error('[OfflineService] getPendingActions error:', error);
      return [];
    }
  }

  async storeOfflineAction(
    userId: string,
    actionType: OfflineActionType,
    payload: Record<string, any>
  ): Promise<string> {
    try {
      const actionId = crypto.randomUUID();

      const { error } = await supabaseAdmin
        .from('offline_actions')
        .insert({
          id: actionId,
          user_id: userId,
          action_type: actionType,
          payload,
          status: 'PENDING',
          retry_count: 0,
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      logger.info(`[OfflineService] Stored offline action ${actionId} for user ${userId}`);
      return actionId;
    } catch (error) {
      logger.error('[OfflineService] storeOfflineAction error:', error);
      throw error;
    }
  }

  async getLastSyncStatus(userId: string): Promise<{
    lastSyncAt: string | null;
    pendingCount: number;
    failedCount: number;
  }> {
    try {
      const { data: syncLog } = await supabaseAdmin
        .from('sync_logs')
        .select('synced_at')
        .eq('user_id', userId)
        .order('synced_at', { ascending: false })
        .limit(1)
        .single();

      const { count: pendingCount } = await supabaseAdmin
        .from('offline_actions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'PENDING');

      const { count: failedCount } = await supabaseAdmin
        .from('offline_actions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'FAILED');

      return {
        lastSyncAt: syncLog?.synced_at || null,
        pendingCount: pendingCount || 0,
        failedCount: failedCount || 0,
      };
    } catch (error) {
      logger.error('[OfflineService] getLastSyncStatus error:', error);
      return {
        lastSyncAt: null,
        pendingCount: 0,
        failedCount: 0,
      };
    }
  }

  async clearSyncedActions(userId: string, olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabaseAdmin
        .from('offline_actions')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'SYNCED')
        .lt('synced_at', cutoffDate)
        .select('id');

      if (error) {
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      logger.error('[OfflineService] clearSyncedActions error:', error);
      return 0;
    }
  }

  private async syncSingleAction(
    userId: string,
    action: OfflineAction
  ): Promise<{ status: 'SYNCED' | 'FAILED' | 'CONFLICT'; errorMessage?: string }> {
    try {
      const hasConflict = await this.checkForConflict(userId, action);
      if (hasConflict) {
        await this.updateActionStatus(action.id, 'CONFLICT');
        return { status: 'CONFLICT', errorMessage: 'Data was modified on server' };
      }

      await this.executeAction(userId, action);

      await this.updateActionStatus(action.id, 'SYNCED');
      return { status: 'SYNCED' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (action.retryCount < MAX_RETRY_COUNT) {
        await supabaseAdmin
          .from('offline_actions')
          .update({ 
            retry_count: action.retryCount + 1,
            error_message: errorMessage,
          })
          .eq('id', action.id);
      } else {
        await this.updateActionStatus(action.id, 'FAILED', errorMessage);
      }

      return { status: 'FAILED', errorMessage };
    }
  }

  private async executeAction(userId: string, action: OfflineAction): Promise<void> {
    switch (action.actionType) {
      case 'UPDATE_LOCATION':
        await this.executeUpdateLocation(userId, action.payload);
        break;
      case 'CANCEL_RIDE':
        await this.executeCancelRide(userId, action.payload);
        break;
      case 'RATE_RIDE':
        await this.executeRateRide(userId, action.payload);
        break;
      case 'SEND_MESSAGE':
        await this.executeSendMessage(userId, action.payload);
        break;
      case 'UPDATE_PROFILE':
        await this.executeUpdateProfile(userId, action.payload);
        break;
      case 'TRIGGER_SOS':
        await this.executeTriggerSOS(userId, action.payload);
        break;
      case 'MARK_PICKUP':
        await this.executeMarkPickup(userId, action.payload);
        break;
      case 'MARK_DROPOFF':
        await this.executeMarkDropoff(userId, action.payload);
        break;
      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }
  }

  private async executeUpdateLocation(userId: string, payload: Record<string, any>): Promise<void> {
    const { lat, lng, heading, speed_kmh } = payload;
    
    await supabaseAdmin
      .from('vehicle_locations')
      .update({
        lat,
        lng,
        heading,
        speed_kmh,
        recorded_at: new Date().toISOString(),
      })
      .eq('driver_id', userId)
      .eq('is_active', true);
  }

  private async executeCancelRide(userId: string, payload: Record<string, any>): Promise<void> {
    const { ride_id, reason } = payload;
    
    await supabaseAdmin
      .from('rides')
      .update({
        status: 'CANCELLED',
        cancelled_reason: reason,
      })
      .eq('id', ride_id)
      .eq('user_id', userId);
  }

  private async executeRateRide(userId: string, payload: Record<string, any>): Promise<void> {
    const { ride_id, rated_id, rating, review } = payload;
    
    await supabaseAdmin
      .from('ratings')
      .insert({
        ride_id,
        rater_id: userId,
        rated_id,
        rating,
        review,
      });
  }

  private async executeSendMessage(userId: string, payload: Record<string, any>): Promise<void> {
    const { conversation_id, message_text } = payload;
    
    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id,
        sender_id: userId,
        message_text,
        message_type: 'TEXT',
      });
  }

  private async executeUpdateProfile(userId: string, payload: Record<string, any>): Promise<void> {
    const allowedFields = ['gender', 'gender_preference'];
    const updateData: Record<string, any> = {};
    
    Object.keys(payload).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = payload[key];
      }
    });

    if (Object.keys(updateData).length > 0) {
      await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId);
    }
  }

  private async executeTriggerSOS(userId: string, payload: Record<string, any>): Promise<void> {
    const { ride_id, lat, lng, description } = payload;
    
    await supabaseAdmin
      .from('safety_incidents')
      .insert({
        reported_by: userId,
        ride_id,
        incident_type: 'OTHER',
        description: description || 'SOS triggered offline',
        location_lat: lat,
        location_lng: lng,
        status: 'REPORTED',
      });
  }

  private async executeMarkPickup(userId: string, payload: Record<string, any>): Promise<void> {
    const { ride_id } = payload;
    
    await supabaseAdmin
      .from('rides')
      .update({ 
        status: 'STARTED',
        started_at: new Date().toISOString(),
      })
      .eq('id', ride_id);
  }

  private async executeMarkDropoff(userId: string, payload: Record<string, any>): Promise<void> {
    const { ride_id } = payload;
    
    await supabaseAdmin
      .from('rides')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', ride_id);
  }

  private async checkForConflict(userId: string, action: OfflineAction): Promise<boolean> {
    if (action.actionType === 'UPDATE_LOCATION') {
      return false;
    }

    if (action.actionType === 'CANCEL_RIDE') {
      const { data: ride } = await supabaseAdmin
        .from('rides')
        .select('status, updated_at')
        .eq('id', action.payload.ride_id)
        .single();

      if (ride && new Date(ride.updated_at) > new Date(action.createdAt)) {
        return true;
      }
    }

    return false;
  }

  private async applyConflictResolution(
    userId: string,
    resolution: ConflictResolution
  ): Promise<void> {
    const { data: action } = await supabaseAdmin
      .from('offline_actions')
      .select('*')
      .eq('id', resolution.actionId)
      .eq('user_id', userId)
      .single();

    if (!action) {
      throw new Error('Action not found');
    }

    if (resolution.resolution === 'CLIENT_WINS') {
      await this.executeAction(userId, this.mapToOfflineAction(action));
    }

    await this.updateActionStatus(resolution.actionId, 'SYNCED');
  }

  private async updateActionStatus(
    actionId: string,
    status: 'SYNCED' | 'FAILED' | 'CONFLICT',
    errorMessage?: string
  ): Promise<void> {
    const updateData: Record<string, any> = { status };
    if (status === 'SYNCED') {
      updateData.synced_at = new Date().toISOString();
    }
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await supabaseAdmin
      .from('offline_actions')
      .update(updateData)
      .eq('id', actionId);
  }

  private async logSyncAttempt(userId: string, result: SyncResult): Promise<void> {
    try {
      await supabaseAdmin
        .from('sync_logs')
        .insert({
          user_id: userId,
          synced_count: result.syncedCount,
          failed_count: result.failedCount,
          conflict_count: result.conflictCount,
          synced_at: new Date().toISOString(),
        });
    } catch (error) {
      logger.error('[OfflineService] logSyncAttempt error:', error);
    }
  }

  private async getUserProfile(userId: string): Promise<any> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, phone, gender, gender_preference, is_driver, average_rating')
      .eq('id', userId)
      .single();
    return data;
  }

  private async getActiveRide(userId: string): Promise<any> {
    const { data } = await supabaseAdmin
      .from('rides')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['CREATING_POOL', 'WAITING_FOR_DRIVER', 'DRIVER_ASSIGNED', 'STARTED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data;
  }

  private async getActivePool(userId: string): Promise<any> {
    const { data: ride } = await supabaseAdmin
      .from('rides')
      .select('pool_id')
      .eq('user_id', userId)
      .in('status', ['CREATING_POOL', 'WAITING_FOR_DRIVER', 'DRIVER_ASSIGNED', 'STARTED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!ride?.pool_id) return null;

    const { data: pool } = await supabaseAdmin
      .from('pools')
      .select('*, pool_members(user_id)')
      .eq('id', ride.pool_id)
      .single();
    
    return pool;
  }

  private async getSavedPlaces(userId: string): Promise<any[]> {
    const { data } = await supabaseAdmin
      .from('saved_places')
      .select('*')
      .eq('user_id', userId);
    return data || [];
  }

  private async getEmergencyContacts(userId: string): Promise<any[]> {
    const { data } = await supabaseAdmin
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId);
    return data || [];
  }

  private async getRecentMessages(userId: string): Promise<any[]> {
    const { data: participants } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (!participants?.length) return [];

    const conversationIds = participants.map(p => p.conversation_id);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(100);

    return messages || [];
  }

  private mapToOfflineAction(data: any): OfflineAction {
    return {
      id: data.id,
      userId: data.user_id,
      actionType: data.action_type,
      payload: data.payload,
      createdAt: data.created_at,
      syncedAt: data.synced_at,
      status: data.status,
      retryCount: data.retry_count,
      errorMessage: data.error_message,
    };
  }
}

export const offlineService = new OfflineService();
