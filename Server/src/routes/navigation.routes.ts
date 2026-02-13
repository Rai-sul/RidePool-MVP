import { Router } from 'express';
import { navigationController } from '../controllers/navigation.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/route', authenticateToken, (req, res, next) => navigationController.getNavigationRoute(req, res, next));
router.post('/state', authenticateToken, (req, res, next) => navigationController.getNavigationState(req, res, next));
router.post('/voice-instruction', authenticateToken, (req, res, next) => navigationController.getVoiceInstruction(req, res, next));
router.get('/waypoint-message', authenticateToken, (req, res, next) => navigationController.getWaypointApproachMessage(req, res, next));
router.get('/recalculating', authenticateToken, (req, res, next) => navigationController.getRecalculatingMessage(req, res, next));

// FREE navigation using Google Maps app (no API cost)
router.post('/deep-link', authenticateToken, (req, res, next) => navigationController.getNavigationDeepLink(req, res, next));

export default router;
