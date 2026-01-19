import { Router } from 'express';
import { offlineController } from '../controllers/offline.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/package', authenticateToken, (req, res, next) => offlineController.getOfflinePackage(req, res, next));
router.post('/sync', authenticateToken, (req, res, next) => offlineController.syncActions(req, res, next));
router.post('/resolve-conflicts', authenticateToken, (req, res, next) => offlineController.resolveConflicts(req, res, next));
router.get('/pending', authenticateToken, (req, res, next) => offlineController.getPendingActions(req, res, next));
router.get('/status', authenticateToken, (req, res, next) => offlineController.getSyncStatus(req, res, next));
router.delete('/clear', authenticateToken, (req, res, next) => offlineController.clearSyncedActions(req, res, next));

export default router;
