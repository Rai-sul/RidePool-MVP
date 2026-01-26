import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', authController.register.bind(authController));

router.post('/login', authController.login.bind(authController));

router.post('/logout', authenticate, authController.logout.bind(authController));

router.post('/refresh', authController.refresh.bind(authController));

router.get('/verify-email', authController.verifyEmail.bind(authController));

router.post('/reset-password', authController.resetPassword.bind(authController));

router.post(
  '/change-password',
  authenticate,
  authController.changePassword.bind(authController)
);

router.get('/me', authenticate, authController.getCurrentUser.bind(authController));

export default router;
