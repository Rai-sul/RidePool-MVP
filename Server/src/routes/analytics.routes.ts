import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, analyticsController.getDashboard.bind(analyticsController));
router.get('/rides', authenticate, analyticsController.getRideAnalytics.bind(analyticsController));
router.get('/drivers', authenticate, analyticsController.getDriverAnalytics.bind(analyticsController));
router.get('/users', authenticate, analyticsController.getUserAnalytics.bind(analyticsController));
router.get('/revenue', authenticate, analyticsController.getRevenueReport.bind(analyticsController));

export default router;
