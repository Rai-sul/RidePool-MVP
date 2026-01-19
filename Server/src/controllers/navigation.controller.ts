import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { voiceNavigationService } from '../services/voiceNavigation.service';
import { i18nService, SupportedLanguage } from '../services/i18n.service';
import { z } from 'zod';

const GetRouteSchema = z.object({
  origin_lat: z.number(),
  origin_lng: z.number(),
  destination_lat: z.number(),
  destination_lng: z.number(),
  waypoints: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    name: z.string().optional(),
  })).optional(),
  language: z.enum(['en', 'bn']).optional().default('en'),
});

const NavigationStateSchema = z.object({
  current_lat: z.number(),
  current_lng: z.number(),
  route_steps: z.array(z.object({
    instruction: z.string(),
    distance: z.number(),
    duration: z.number(),
    maneuver: z.string(),
    startLocation: z.object({ lat: z.number(), lng: z.number() }),
    endLocation: z.object({ lat: z.number(), lng: z.number() }),
    roadName: z.string(),
  })),
  previous_step_index: z.number().optional().default(0),
});

const VoiceInstructionSchema = z.object({
  step_index: z.number(),
  distance_to_step: z.number(),
  language: z.enum(['en', 'bn']).optional().default('en'),
  maneuver: z.string(),
  road_name: z.string().optional(),
});

export class NavigationController {
  async getNavigationRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = GetRouteSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid route request',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { origin_lat, origin_lng, destination_lat, destination_lng, waypoints, language } = parseResult.data;

      const route = await voiceNavigationService.getNavigationRoute(
        { lat: origin_lat, lng: origin_lng },
        { lat: destination_lat, lng: destination_lng },
        waypoints
      );

      if (!route) {
        return res.status(404).json({
          success: false,
          error: { code: 'ROUTE_NOT_FOUND', message: 'Could not calculate route' },
          timestamp: new Date().toISOString(),
        });
      }

      const voiceInstructions = voiceNavigationService.generateVoiceInstructions(
        route,
        language as SupportedLanguage
      );

      res.json({
        success: true,
        data: {
          route,
          voice_instructions: voiceInstructions,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getNavigationState(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const parseResult = NavigationStateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid navigation state request' },
          timestamp: new Date().toISOString(),
        });
      }

      const { current_lat, current_lng, route_steps, previous_step_index } = parseResult.data;

      const route = {
        totalDistance: route_steps.reduce((sum, s) => sum + s.distance, 0),
        totalDuration: route_steps.reduce((sum, s) => sum + s.duration, 0),
        steps: route_steps.map((s) => ({
          ...s,
          maneuver: s.maneuver as any,
        })),
        polyline: '',
        waypoints: [],
      };

      const state = voiceNavigationService.calculateNavigationState(
        route,
        { lat: current_lat, lng: current_lng },
        previous_step_index
      );

      res.json({
        success: true,
        data: { navigation_state: state },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getVoiceInstruction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const parseResult = VoiceInstructionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid voice instruction request' },
          timestamp: new Date().toISOString(),
        });
      }

      const { step_index, distance_to_step, language, maneuver, road_name } = parseResult.data;

      const step = {
        instruction: '',
        distance: distance_to_step,
        duration: 0,
        maneuver: maneuver as any,
        startLocation: { lat: 0, lng: 0 },
        endLocation: { lat: 0, lng: 0 },
        roadName: road_name || 'Unknown',
      };

      const instruction = voiceNavigationService.getVoiceInstructionForDistance(
        step,
        distance_to_step,
        language as SupportedLanguage
      );

      if (!instruction) {
        return res.json({
          success: true,
          data: { instruction: null, message: 'No instruction needed at this distance' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { instruction },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getWaypointApproachMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { waypoint_type, distance, language } = req.query;

      if (!waypoint_type || !distance) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'waypoint_type and distance required' },
          timestamp: new Date().toISOString(),
        });
      }

      const type = waypoint_type as 'PICKUP' | 'DROPOFF';
      const dist = parseFloat(distance as string);
      const lang = (language as SupportedLanguage) || 'en';

      if (!['PICKUP', 'DROPOFF'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_TYPE', message: 'waypoint_type must be PICKUP or DROPOFF' },
          timestamp: new Date().toISOString(),
        });
      }

      const instruction = voiceNavigationService.generateWaypointApproachMessage(type, dist, lang);

      res.json({
        success: true,
        data: { instruction },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecalculatingMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const language = (req.query.language as SupportedLanguage) || 'en';
      const instruction = voiceNavigationService.generateRecalculatingMessage(language);

      res.json({
        success: true,
        data: { instruction },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const navigationController = new NavigationController();
