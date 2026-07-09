import { Router } from 'express';
import { navigationController } from '../controllers/navigation.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/deep-link', authenticateToken, (req, res, next) => navigationController.getNavigationDeepLink(req, res, next));

export default router;
