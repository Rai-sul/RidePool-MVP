import { Router } from 'express';
import { ratingController } from '../controllers/rating.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, ratingController.submitRating.bind(ratingController));
router.get('/me', authenticate, ratingController.getMyRatings.bind(ratingController));
router.get('/user/:userId', authenticate, ratingController.getUserRatings.bind(ratingController));
router.get('/user/:userId/breakdown', authenticate, ratingController.getRatingBreakdown.bind(ratingController));
router.get('/ride/:rideId', authenticate, ratingController.getRideRatings.bind(ratingController));

export default router;
