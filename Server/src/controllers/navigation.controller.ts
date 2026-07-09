import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { googleMapsService } from '../services/googleMaps.service';
import { z } from 'zod';

export class NavigationController {
  async getNavigationDeepLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        origin_lat: z.number(),
        origin_lng: z.number(),
        destination_lat: z.number(),
        destination_lng: z.number(),
        waypoints: z.array(z.object({
          lat: z.number(),
          lng: z.number(),
        })).optional(),
      });

      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { origin_lat, origin_lng, destination_lat, destination_lng, waypoints } = parseResult.data;

      const origin = { latitude: origin_lat, longitude: origin_lng };
      const destination = { latitude: destination_lat, longitude: destination_lng };
      const waypointLocations = waypoints?.map(wp => ({ latitude: wp.lat, longitude: wp.lng }));

      const deepLink = googleMapsService.generateNavigationDeepLink(origin, destination, waypointLocations);

      res.json({
        success: true,
        data: {
          navigation_url: deepLink,
          instructions: 'Open this URL to start navigation in Google Maps app. This includes real-time traffic.',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const navigationController = new NavigationController();
