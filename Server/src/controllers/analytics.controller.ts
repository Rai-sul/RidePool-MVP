import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { analyticsService } from '../services/analytics.service';

import { errorResponse, successResponse } from '../utils/response';

export class AnalyticsController {
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const summary = await analyticsService.getDashboardSummary();

      successResponse(res, summary);
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

      successResponse(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  async getDriverAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const analytics = await analyticsService.getDriverAnalytics();

      successResponse(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  async getUserAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const analytics = await analyticsService.getUserAnalytics();

      successResponse(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  async getRevenueReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      if (!startDate || !endDate) {
        return errorResponse(res, 'MISSING_DATES', 'start_date and end_date are required', 400);
      }

      const revenueData = await analyticsService.getRevenueByDate(startDate, endDate);

      successResponse(res, {
        revenue_by_date: revenueData,
        total: revenueData.reduce((sum, r) => sum + r.revenue, 0),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
