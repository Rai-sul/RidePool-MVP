import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { analyticsService } from '../services/analytics.service';

export class AnalyticsController {
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const summary = await analyticsService.getDashboardSummary();

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getRideAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { start_date, end_date } = req.query;

      const analytics = await analyticsService.getRideAnalytics(
        start_date as string,
        end_date as string
      );

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getDriverAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const analytics = await analyticsService.getDriverAnalytics();

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const analytics = await analyticsService.getUserAnalytics();

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getRevenueReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_DATES', message: 'start_date and end_date are required' },
          timestamp: new Date().toISOString(),
        });
      }

      const revenueData = await analyticsService.getRevenueByDate(startDate, endDate);

      res.json({
        success: true,
        data: {
          revenue_by_date: revenueData,
          total: revenueData.reduce((sum, r) => sum + r.revenue, 0),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
