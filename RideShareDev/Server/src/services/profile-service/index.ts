import { Router } from 'express';
import * as profileController from './profile.controller';

const router = Router();

router.post('/profiles', profileController.createUserProfile);
router.get('/profiles/:id', profileController.getUserProfile);
router.post('/profiles/add-friend', profileController.addFriend);

export default router;
