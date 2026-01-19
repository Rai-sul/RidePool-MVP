import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { emergencyService } from '../services/emergency.service';
import { z } from 'zod';

const TriggerSOSSchema = z.object({
  ride_id: z.string().uuid().optional(),
  pool_id: z.string().uuid().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  description: z.string().max(500).optional(),
});

const ReportIncidentSchema = z.object({
  ride_id: z.string().uuid().optional(),
  incident_type: z.enum(['HARASSMENT', 'ACCIDENT', 'VEHICLE_ISSUE', 'DRIVER_BEHAVIOR', 'PASSENGER_BEHAVIOR', 'OTHER']),
  description: z.string().max(1000).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

const AddEmergencyContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(6).max(20),
  relationship: z.string().max(50).optional(),
  is_primary: z.boolean().optional(),
});

export class SOSController {
  async triggerSOS(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = TriggerSOSSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { ride_id, pool_id, lat, lng, description } = parseResult.data;

      const result = await emergencyService.triggerSOS({
        userId,
        rideId: ride_id,
        poolId: pool_id,
        location: { lat, lng },
        incidentType: 'SOS',
        description,
      });

      res.status(201).json({
        success: true,
        data: {
          incident_id: result.incidentId,
          status: result.status,
          contacts_notified: result.contactsNotified,
          emergency_services_notified: result.emergencyServicesNotified,
          message: 'SOS alert has been sent. Help is on the way.',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async reportIncident(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = ReportIncidentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { ride_id, incident_type, description, lat, lng } = parseResult.data;

      const incidentId = await emergencyService.reportIncident({
        userId,
        rideId: ride_id,
        location: { lat: lat || 0, lng: lng || 0 },
        incidentType: incident_type,
        description,
      });

      res.status(201).json({
        success: true,
        data: {
          incident_id: incidentId,
          status: 'REPORTED',
          message: 'Incident has been reported and will be reviewed.',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmergencyContacts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const contacts = await emergencyService.getEmergencyContacts(userId);

      res.json({
        success: true,
        data: { contacts },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async addEmergencyContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = AddEmergencyContactSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { name, phone, relationship, is_primary } = parseResult.data;

      const contactId = await emergencyService.addEmergencyContact(userId, {
        name,
        phone,
        relationship,
        isPrimary: is_primary,
      });

      res.status(201).json({
        success: true,
        data: {
          contact_id: contactId,
          message: 'Emergency contact added successfully.',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error.message?.includes('Maximum 5')) {
        return res.status(400).json({
          success: false,
          error: { code: 'MAX_CONTACTS_REACHED', message: error.message },
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  }

  async removeEmergencyContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { contactId } = req.params;

      const success = await emergencyService.removeEmergencyContact(userId, contactId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Emergency contact not found' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { message: 'Emergency contact removed successfully.' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getActiveIncidents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const incidents = await emergencyService.getActiveIncidents(userId);

      res.json({
        success: true,
        data: { incidents },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const sosController = new SOSController();
