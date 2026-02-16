import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { h3Utils, H3_RESOLUTION } from '../utils/h3.utils';
import { config } from '../config/env';

interface NotificationPayload {
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, any>;
}

interface FCMPayload {
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  token: string;
}

interface DeviceToken {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  isActive: boolean;
}

export class NotificationService {
  private fcmServerKey: string | null;

  constructor() {
    this.fcmServerKey = process.env.FCM_SERVER_KEY || null;
    if (!this.fcmServerKey) {
      logger.warn('[Notification] FCM_SERVER_KEY not configured. Push notifications will be stored only.');
    }
  }

  async sendPushNotification(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        metadata: payload.metadata || null,
        is_read: false,
      });

      if (this.fcmServerKey) {
        await this.sendToFCM(userId, payload);
      }

      logger.info(`[Notification] Sent to ${userId}: ${payload.type}`);
    } catch (error) {
      logger.error(`[Notification] Failed to send to ${userId}:`, error);
    }
  }

  async sendBulkNotification(userIds: string[], payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.sendPushNotification(userId, payload);
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  }

  private async sendToFCM(userId: string, payload: NotificationPayload): Promise<boolean> {
    const { data: tokens } = await supabaseAdmin
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) {
      logger.debug(`[Notification] No active device tokens for user ${userId}`);
      return false;
    }

    const fcmUrl = 'https://fcm.googleapis.com/fcm/send';

    for (const deviceToken of tokens) {
      try {
        const fcmPayload: FCMPayload = {
          notification: {
            title: payload.title,
            body: payload.message,
          },
          data: payload.metadata ? this.serializeMetadata(payload.metadata) : undefined,
          token: deviceToken.token,
        };

        const response = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${this.fcmServerKey}`,
          },
          body: JSON.stringify({
            to: deviceToken.token,
            notification: fcmPayload.notification,
            data: fcmPayload.data,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`[Notification] FCM failed for token ${deviceToken.token.substring(0, 10)}...: ${errorText}`);

          if (response.status === 404 || response.status === 410) {
            await this.deactivateToken(deviceToken.token);
          }
        }
      } catch (error) {
        logger.error(`[Notification] FCM request failed:`, error);
      }
    }

    return true;
  }

  private serializeMetadata(metadata: Record<string, any>): Record<string, string> {
    const serialized: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      serialized[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return serialized;
  }

  async registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android' | 'web'): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('device_tokens')
        .upsert({
          user_id: userId,
          token,
          platform,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'token',
        });

      if (error) {
        logger.error('[Notification] Failed to register device token:', error);
        return false;
      }

      logger.info(`[Notification] Registered ${platform} token for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('[Notification] Register token error:', error);
      return false;
    }
  }

  async unregisterDeviceToken(token: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('device_tokens')
        .update({ is_active: false })
        .eq('token', token);

      return !error;
    } catch {
      return false;
    }
  }

  async deactivateToken(token: string): Promise<void> {
    await supabaseAdmin
      .from('device_tokens')
      .update({ is_active: false })
      .eq('token', token);

    logger.info(`[Notification] Deactivated invalid token: ${token.substring(0, 10)}...`);
  }

  async getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
    const { data } = await supabaseAdmin
      .from('device_tokens')
      .select('user_id, token, platform, is_active')
      .eq('user_id', userId)
      .eq('is_active', true);

    return (data || []).map((d) => ({
      userId: d.user_id,
      token: d.token,
      platform: d.platform,
      isActive: d.is_active,
    }));
  }

  async getNotifications(userId: string, page: number = 1, limit: number = 20): Promise<{
    notifications: any[];
    total: number;
    unread: number;
  }> {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      notifications: data || [],
      total: count || 0,
      unread: unreadCount || 0,
    };
  }

  async markAllAsRead(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return error ? 0 : (count || 0);
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    return !error;
  }

  async updateNotificationPreferences(userId: string, preferences: {
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    types?: Record<string, boolean>;
  }): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        push_enabled: preferences.pushEnabled ?? true,
        email_enabled: preferences.emailEnabled ?? false,
        sms_enabled: preferences.smsEnabled ?? false,
        quiet_hours_start: preferences.quietHoursStart || null,
        quiet_hours_end: preferences.quietHoursEnd || null,
        type_preferences: preferences.types || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    return !error;
  }

  async getNotificationPreferences(userId: string): Promise<any> {
    const { data } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    return data || {
      push_enabled: true,
      email_enabled: false,
      sms_enabled: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
      type_preferences: null,
    };
  }

  async sendPoolFoundNotification(userId: string, poolId: string): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'Pool Found!',
      message: 'A matching pool has been found for your ride request.',
      type: 'POOL_MATCH',
      metadata: { pool_id: poolId },
    });
  }

  async sendPoolReadyNotification(userId: string, poolId: string, message: string): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'Pool Ready',
      message,
      type: 'POOL_MATCH',
      metadata: { pool_id: poolId },
    });
  }

  async sendPoolCancelledNotification(userId: string, poolId: string, reason: string): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'Pool Cancelled',
      message: reason,
      type: 'POOL_MATCH',
      metadata: { pool_id: poolId, cancelled: true },
    });
  }

  async sendDriverAssignedNotification(userId: string, poolId: string, driverInfo: { name?: string; vehicle?: string }): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'Driver Assigned!',
      message: `Your driver is on the way${driverInfo.vehicle ? ` in a ${driverInfo.vehicle}` : ''}.`,
      type: 'DRIVER_ASSIGNED',
      metadata: { pool_id: poolId, driver: driverInfo },
    });
  }

  async sendDriverArrivingNotification(userId: string, etaMinutes: number): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'Driver Arriving',
      message: `Your driver will arrive in approximately ${etaMinutes} minute${etaMinutes !== 1 ? 's' : ''}.`,
      type: 'DRIVER_ASSIGNED',
      metadata: { eta_minutes: etaMinutes },
    });
  }

  async sendRideStartedNotification(userId: string, poolId: string): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'Ride Started',
      message: 'Your ride has started. Enjoy your trip!',
      type: 'RIDE_STARTED',
      metadata: { pool_id: poolId },
    });
  }

  async sendRideCompletedNotification(userId: string, poolId: string, fare: number): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'Ride Completed',
      message: `Your ride has been completed. Total fare: ৳${fare}`,
      type: 'RIDE_COMPLETED',
      metadata: { pool_id: poolId, fare },
    });
  }

  async sendPaymentReceivedNotification(userId: string, amount: number): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'Payment Received',
      message: `Payment of ৳${amount} has been received.`,
      type: 'PAYMENT_RECEIVED',
      metadata: { amount },
    });
  }

  async sendRatingRequestNotification(userId: string, rideId: string): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'Rate Your Ride',
      message: 'How was your ride? Tap to rate your experience.',
      type: 'RATING_REQUEST',
      metadata: { ride_id: rideId },
    });
  }

  async sendPriyoSathiInviteNotification(
    userId: string,
    inviterName: string,
    rideId: string,
    poolId?: string,
    inviterId?: string
  ): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'Ride Invite',
      message: `${inviterName} is looking for a ride. Join them?`,
      type: 'MESSAGE',
      metadata: {
        ride_id: rideId,
        inviter: inviterName,
        inviter_id: inviterId || null,
        pool_id: poolId || null,
      },
    });
  }

  async sendNewPoolAvailableNotification(driverId: string, poolId: string, estimatedEarnings: number): Promise<void> {
    await this.sendPushNotification(driverId, {
      title: 'New Pool Available',
      message: `A new pool is available nearby. Estimated earnings: ৳${estimatedEarnings}`,
      type: 'POOL_MATCH',
      metadata: { pool_id: poolId, estimated_earnings: estimatedEarnings },
    });
  }

  async sendSOSNotification(userId: string, rideId: string, location: { lat: number; lng: number }): Promise<void> {
    await this.sendPushNotification(userId, {
      title: 'SOS Alert',
      message: 'Emergency alert has been triggered for your ride.',
      type: 'SYSTEM',
      metadata: { ride_id: rideId, location, is_sos: true },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    return !error;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return error ? 0 : (count || 0);
  }

  async notifyNearbyDrivers(poolId: string, pool: {
    destination_lat: number;
    destination_lng: number;
    destination_address?: string;
    vehicle_type: string;
    fare_per_person: number;
    current_passengers: number;
    score_breakdown?: any;
  }): Promise<{ notified: number }> {
    try {
      const pickupLat = pool.score_breakdown?.creator_pickup?.lat || pool.destination_lat;
      const pickupLng = pool.score_breakdown?.creator_pickup?.lng || pool.destination_lng;

      const pickupH3 = h3Utils.latLngToH3(
        { latitude: pickupLat, longitude: pickupLng },
        H3_RESOLUTION.DRIVER_SEARCH
      );
      // Use ring 5 at Res 8 (~461m edge) ≈ 2.3km to match driver's ~2.1km pickup search radius
      const searchHexagons = h3Utils.getH3Ring(pickupH3, 5);

      const { data: nearbyDrivers } = await supabaseAdmin
        .from('vehicle_locations')
        .select('driver_id, vehicle_id, h3_index_res8')
        .eq('is_active', true)
        .eq('is_available', true)
        .is('pool_id', null)
        .in('h3_index_res8', searchHexagons);

      if (!nearbyDrivers || nearbyDrivers.length === 0) {
        logger.info(`[Notification] No nearby available drivers found for pool ${poolId}`);
        return { notified: 0 };
      }

      const vehicleIds = nearbyDrivers.map(d => d.vehicle_id);
      const { data: vehicles } = await supabaseAdmin
        .from('vehicles')
        .select('id, driver_id, vehicle_type')
        .in('id', vehicleIds)
        .eq('vehicle_type', pool.vehicle_type)
        .eq('is_active', true);

      if (!vehicles || vehicles.length === 0) {
        logger.info(`[Notification] No drivers with matching vehicle type ${pool.vehicle_type} for pool ${poolId}`);
        return { notified: 0 };
      }

      const eligibleDriverIds = vehicles.map(v => v.driver_id);

      const { data: activePools } = await supabaseAdmin
        .from('pools')
        .select('driver_id')
        .in('driver_id', eligibleDriverIds)
        .in('status', ['READY_TO_START', 'STARTED']);

      const busyDriverIds = new Set((activePools || []).map(p => p.driver_id));
      const availableDriverIds = eligibleDriverIds.filter(id => !busyDriverIds.has(id));

      if (availableDriverIds.length === 0) {
        logger.info(`[Notification] All matching drivers are busy for pool ${poolId}`);
        return { notified: 0 };
      }

      const pickupAddress = pool.score_breakdown?.creator_pickup?.address || 'Nearby';
      const estimatedEarnings = pool.fare_per_person * pool.current_passengers * 0.8;

      const payload: NotificationPayload = {
        title: 'New Pool Request!',
        message: `${pool.current_passengers} passengers waiting near ${pickupAddress}. ${pool.vehicle_type} ride → Est. ৳${Math.round(estimatedEarnings)}`,
        type: 'POOL_REQUEST',
        metadata: {
          pool_id: poolId,
          vehicle_type: pool.vehicle_type,
          passengers: pool.current_passengers,
          estimated_earnings: estimatedEarnings,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          pickup_address: pickupAddress,
          destination_lat: pool.destination_lat,
          destination_lng: pool.destination_lng,
          destination_address: pool.destination_address,
          action: 'VIEW_POOL',
        },
      };

      const result = await this.sendBulkNotification(availableDriverIds, payload);

      logger.info(`[Notification] Notified ${result.sent}/${availableDriverIds.length} drivers for pool ${poolId} (${pool.vehicle_type})`);
      return { notified: result.sent };
    } catch (error) {
      logger.error(`[Notification] Failed to notify nearby drivers for pool ${poolId}:`, error);
      return { notified: 0 };
    }
  }
}

export const notificationService = new NotificationService();
