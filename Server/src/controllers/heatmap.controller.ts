import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { heatmapService } from '../services/heatmap.service';
import { z } from 'zod';

const GetHeatmapQuerySchema = z.object({
  lat: z.string().transform((v) => parseFloat(v)),
  lng: z.string().transform((v) => parseFloat(v)),
});

export class HeatmapController {
  async getDriverHeatmap(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const queryResult = GetHeatmapQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'lat and lng query parameters required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { lat, lng } = queryResult.data;

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_COORDINATES', message: 'Invalid coordinates' },
          timestamp: new Date().toISOString(),
        });
      }

      const heatmapData = await heatmapService.getDriverHeatmap(lat, lng);

      res.json({
        success: true,
        data: heatmapData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getDemandHeatmap(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const heatmap = await heatmapService.generateDemandHeatmap();

      res.json({
        success: true,
        data: heatmap,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getSurgeZones(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const surgeZones = await heatmapService.calculateSurgeZones();

      res.json({
        success: true,
        data: { surge_zones: surgeZones },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecommendedAreas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const queryResult = GetHeatmapQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'lat and lng query parameters required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { lat, lng } = queryResult.data;
      const surgeZones = await heatmapService.calculateSurgeZones();
      const recommendations = await heatmapService.getRecommendedAreas(lat, lng, surgeZones);

      res.json({
        success: true,
        data: { recommendations },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPeakHours(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const queryResult = GetHeatmapQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'lat and lng query parameters required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { lat, lng } = queryResult.data;
      const peakHours = await heatmapService.getPeakHoursForArea(lat, lng);

      res.json({
        success: true,
        data: { peak_hours: peakHours },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getHistoricalPatterns(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { h3_index } = req.query;
      const patterns = await heatmapService.getHistoricalDemandPatterns(h3_index as string | undefined);

      res.json({
        success: true,
        data: { patterns },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const heatmapController = new HeatmapController();
