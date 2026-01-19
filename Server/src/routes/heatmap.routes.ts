import { Router } from 'express';
import { heatmapController } from '../controllers/heatmap.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, (req, res, next) => heatmapController.getDriverHeatmap(req, res, next));
router.get('/demand', authenticateToken, (req, res, next) => heatmapController.getDemandHeatmap(req, res, next));
router.get('/surge-zones', authenticateToken, (req, res, next) => heatmapController.getSurgeZones(req, res, next));
router.get('/recommendations', authenticateToken, (req, res, next) => heatmapController.getRecommendedAreas(req, res, next));
router.get('/peak-hours', authenticateToken, (req, res, next) => heatmapController.getPeakHours(req, res, next));
router.get('/patterns', authenticateToken, (req, res, next) => heatmapController.getHistoricalPatterns(req, res, next));

export default router;
