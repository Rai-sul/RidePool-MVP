import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { rideController } from '../controllers/ride.controller';

const router = Router();

router.get('/estimate', authenticate, (req, res, next) => rideController.getRideEstimate(req, res, next));
router.post('/request', authenticate, (req, res, next) => rideController.requestRide(req, res, next));
router.get('/history', authenticate, (req, res, next) => rideController.getRideHistory(req, res, next));
router.put('/:rideId/cancel', authenticate, (req, res, next) => rideController.cancelRide(req, res, next));

export default router;
