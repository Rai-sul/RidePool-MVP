import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { ApiResponse, SafetyIncident, EmergencyContact } from '../types';

export const safetyService = {
  async reportIncident(data: {
    ride_id?: string;
    incident_type: string;
    description: string;
  }): Promise<ApiResponse<SafetyIncident>> {
    return apiClient.post(API_ENDPOINTS.SAFETY.REPORT_INCIDENT, data);
  },

  async getEmergencyContacts(): Promise<ApiResponse<EmergencyContact[]>> {
    return apiClient.get(API_ENDPOINTS.SAFETY.EMERGENCY_CONTACTS);
  },

  async addEmergencyContact(data: {
    name: string;
    phone: string;
    relationship?: string;
  }): Promise<ApiResponse<EmergencyContact>> {
    return apiClient.post(API_ENDPOINTS.SAFETY.EMERGENCY_CONTACTS, data);
  },

  async shareTrip(data: {
    ride_id: string;
    contact_ids: string[];
  }): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.SAFETY.SHARE_TRIP, data);
  },

  async triggerSOS(data: {
    location: { latitude: number; longitude: number };
    ride_id?: string;
  }): Promise<ApiResponse> {
    return apiClient.post(API_ENDPOINTS.SAFETY.SOS, data);
  },
};
