import { Router } from 'express';
import { rideSharingController } from '../controllers/rideSharing.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/share', authenticate, rideSharingController.shareRide.bind(rideSharingController));
router.get('/active', authenticate, rideSharingController.getActiveShares.bind(rideSharingController));
router.delete('/:shareId', authenticate, rideSharingController.stopSharing.bind(rideSharingController));

router.get('/track/:token', rideSharingController.getSharedRideStatus.bind(rideSharingController));

export default router;
