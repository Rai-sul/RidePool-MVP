import { Router } from 'express';
import * as authController from './auth.controller';

const router = Router();

router.post('/login', authController.login);
router.get('/verify', authController.verifyToken);

export default router;
