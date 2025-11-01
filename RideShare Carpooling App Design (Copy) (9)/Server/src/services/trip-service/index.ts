import { Router } from 'express';
import * as tripController from './trip.controller';

const router = Router();

router.post('/trips', tripController.createTrip);
router.get('/trips/:id', tripController.getTrip);

router.get('/pools/:id', tripController.getPool);
router.post('/pools/join', tripController.joinPool);
router.post('/pools/leave', tripController.leavePool);
router.get('/pools/open', tripController.getOpenPools);
router.post('/pools/add-friend', tripController.addFriendToPool);

export default router;