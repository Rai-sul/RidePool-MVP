import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { googleMapsService } from '../services/googleMaps.service';
import { z } from 'zod';

import { errorResponse, successResponse } from '../utils/response';

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
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request', 400, parseResult.error.issues);
      }

      const { origin_lat, origin_lng, destination_lat, destination_lng, waypoints } = parseResult.data;

      const origin = { latitude: origin_lat, longitude: origin_lng };
      const destination = { latitude: destination_lat, longitude: destination_lng };
      const waypointLocations = waypoints?.map(wp => ({ latitude: wp.lat, longitude: wp.lng }));

      const deepLink = googleMapsService.generateNavigationDeepLink(origin, destination, waypointLocations);

      successResponse(res, {
        navigation_url: deepLink,
        instructions: 'Open this URL to start navigation in Google Maps app. This includes real-time traffic.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const navigationController = new NavigationController();
