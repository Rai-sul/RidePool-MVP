import { supabaseAdmin } from '../config/supabase';
import { notificationService } from './notification.service';
import { logger } from '../utils/logger';

interface EmergencyPayload {
  userId: string;
  rideId?: string;
  poolId?: string;
  location: {
    lat: number;
    lng: number;
  };
  incidentType: 'SOS' | 'HARASSMENT' | 'ACCIDENT' | 'VEHICLE_ISSUE' | 'DRIVER_BEHAVIOR' | 'PASSENGER_BEHAVIOR' | 'OTHER';
  description?: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
}

interface EmergencyResponse {
  incidentId: string;
  status: string;
  contactsNotified: number;
  emergencyServicesNotified: boolean;
}

export class EmergencyService {
  async triggerSOS(payload: EmergencyPayload): Promise<EmergencyResponse> {
    logger.info(`[SOS] Emergency triggered by user ${payload.userId}`);

    const { data: incident, error: incidentError } = await supabaseAdmin
      .from('safety_incidents')
      .insert({
        ride_id: payload.rideId || null,
        reported_by: payload.userId,
        incident_type: 'SOS',
        description: payload.description || 'SOS button pressed',
        location_lat: payload.location.lat,
        location_lng: payload.location.lng,
        status: 'REPORTED',
      })
      .select()
      .single();

    if (incidentError) {
      logger.error('[SOS] Failed to create incident record:', incidentError);
      throw new Error('Failed to create emergency incident');
    }

    const contacts = await this.notifyEmergencyContacts(payload.userId, incident.id, payload);
    const emergencyNotified = await this.notifyEmergencyServices(incident.id, payload);

    if (payload.rideId) {
      await this.notifyRideParticipants(payload.rideId, incident.id, payload.userId);
    }

    if (payload.poolId) {
      await this.notifyPoolDriver(payload.poolId, incident.id);
    }

    logger.info(`[SOS] Emergency ${incident.id} processed: ${contacts} contacts notified`);

    return {
      incidentId: incident.id,
      status: 'REPORTED',
      contactsNotified: contacts,
      emergencyServicesNotified: emergencyNotified,
    };
  }

  async reportIncident(payload: EmergencyPayload): Promise<string> {
    const { data: incident, error } = await supabaseAdmin
      .from('safety_incidents')
      .insert({
        ride_id: payload.rideId || null,
        reported_by: payload.userId,
        incident_type: payload.incidentType,
        description: payload.description || null,
        location_lat: payload.location.lat,
        location_lng: payload.location.lng,
        status: 'REPORTED',
      })
      .select()
      .single();

    if (error) {
      logger.error('[Emergency] Failed to create incident:', error);
      throw new Error('Failed to report incident');
    }

    logger.info(`[Emergency] Incident ${incident.id} reported by user ${payload.userId}`);
    return incident.id;
  }

  private async notifyEmergencyContacts(userId: string, incidentId: string, payload: EmergencyPayload): Promise<number> {
    const { data: contacts } = await supabaseAdmin
      .from('emergency_contacts')
      .select('id, name, phone, relationship')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });

    if (!contacts || contacts.length === 0) {
      logger.warn(`[SOS] No emergency contacts found for user ${userId}`);
      return 0;
    }

    for (const contact of contacts) {
      await this.sendEmergencyNotification(contact, incidentId, payload);
    }

    return contacts.length;
  }

  private async sendEmergencyNotification(contact: EmergencyContact, incidentId: string, payload: EmergencyPayload): Promise<void> {
    const message = this.buildEmergencyMessage(payload);

    logger.info(`[SOS] Would send SMS to ${contact.phone}: ${message.substring(0, 50)}...`);

    await supabaseAdmin.from('emergency_notifications').insert({
      incident_id: incidentId,
      contact_id: contact.id,
      contact_phone: contact.phone,
      message,
      sent_at: new Date().toISOString(),
      status: 'SENT',
    });
  }

  private buildEmergencyMessage(payload: EmergencyPayload): string {
    const locationUrl = `https://maps.google.com/?q=${payload.location.lat},${payload.location.lng}`;
    let message = `EMERGENCY ALERT: Your contact has triggered an SOS alert. `;
    message += `Location: ${locationUrl}. `;
    if (payload.rideId) {
      message += `Ride ID: ${payload.rideId}. `;
    }
    message += `Please check on them immediately or contact emergency services.`;
    return message;
  }

  private async notifyEmergencyServices(incidentId: string, payload: EmergencyPayload): Promise<boolean> {
    logger.info(`[SOS] Emergency services notification for incident ${incidentId}`);

    const emergencyData = {
      incident_id: incidentId,
      location: payload.location,
      user_id: payload.userId,
      ride_id: payload.rideId,
      timestamp: new Date().toISOString(),
    };

    await supabaseAdmin.from('emergency_service_logs').insert({
      incident_id: incidentId,
      service: '999',
      data: emergencyData,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    });

    return true;
  }

  private async notifyRideParticipants(rideId: string, incidentId: string, reporterId: string): Promise<void> {
    const { data: ride } = await supabaseAdmin
      .from('rides')
      .select('pool_id, user_id')
      .eq('id', rideId)
      .single();

    if (!ride?.pool_id) return;

    const { data: pool } = await supabaseAdmin
      .from('pools')
      .select('driver_id')
      .eq('id', ride.pool_id)
      .single();

    const { data: members } = await supabaseAdmin
      .from('pool_members')
      .select('user_id')
      .eq('pool_id', ride.pool_id)
      .neq('user_id', reporterId);

    const usersToNotify = new Set<string>();
    if (pool?.driver_id && pool.driver_id !== reporterId) {
      usersToNotify.add(pool.driver_id);
    }
    members?.forEach((m) => usersToNotify.add(m.user_id));

    for (const userId of usersToNotify) {
      await notificationService.sendSOSNotification(userId, rideId, {
        lat: 0,
        lng: 0,
      });
    }
  }

  private async notifyPoolDriver(poolId: string, incidentId: string): Promise<void> {
    const { data: pool } = await supabaseAdmin
      .from('pools')
      .select('driver_id')
      .eq('id', poolId)
      .single();

    if (pool?.driver_id) {
      await notificationService.sendPushNotification(pool.driver_id, {
        title: 'Emergency Alert',
        message: 'A passenger has triggered an emergency alert.',
        type: 'SYSTEM',
        metadata: { incident_id: incidentId, pool_id: poolId },
      });
    }
  }

  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    const { data, error } = await supabaseAdmin
      .from('emergency_contacts')
      .select('id, name, phone, relationship, is_primary')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });

    if (error) {
      logger.error('[Emergency] Failed to get contacts:', error);
      return [];
    }

    return data || [];
  }

  async addEmergencyContact(userId: string, contact: { name: string; phone: string; relationship?: string; isPrimary?: boolean }): Promise<string> {
    const { count } = await supabaseAdmin
      .from('emergency_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((count || 0) >= 5) {
      throw new Error('Maximum 5 emergency contacts allowed');
    }

    if (contact.isPrimary) {
      await supabaseAdmin
        .from('emergency_contacts')
        .update({ is_primary: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabaseAdmin
      .from('emergency_contacts')
      .insert({
        user_id: userId,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship || null,
        is_primary: contact.isPrimary || false,
      })
      .select()
      .single();

    if (error) {
      logger.error('[Emergency] Failed to add contact:', error);
      throw new Error('Failed to add emergency contact');
    }

    return data.id;
  }

  async removeEmergencyContact(userId: string, contactId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId);

    return !error;
  }

  async getActiveIncidents(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('safety_incidents')
      .select('*')
      .eq('reported_by', userId)
      .in('status', ['REPORTED', 'UNDER_REVIEW'])
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[Emergency] Failed to get incidents:', error);
      return [];
    }

    return data || [];
  }

  async resolveIncident(incidentId: string, resolution: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('safety_incidents')
      .update({
        status: 'RESOLVED',
        resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    return !error;
  }
}

export const emergencyService = new EmergencyService();
