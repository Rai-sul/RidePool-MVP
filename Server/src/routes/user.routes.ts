import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { userController } from '../controllers/user.controller';

const router = Router();

router.get('/profile', authenticate, (req, res, next) => userController.getProfile(req, res, next));
router.put('/profile', authenticate, (req, res, next) => userController.updateProfile(req, res, next));
router.put('/gender-preference', authenticate, (req, res, next) => userController.setGenderPreference(req, res, next));

router.post('/device-token', authenticate, (req, res, next) => userController.registerDeviceToken(req, res, next));
router.delete('/device-token', authenticate, (req, res, next) => userController.unregisterDeviceToken(req, res, next));

router.get('/notifications', authenticate, (req, res, next) => userController.getNotifications(req, res, next));
router.post('/notifications/:notificationId/read', authenticate, (req, res, next) => userController.markNotificationRead(req, res, next));
router.post('/notifications/read-all', authenticate, (req, res, next) => userController.markAllNotificationsRead(req, res, next));
router.get('/notifications/preferences', authenticate, (req, res, next) => userController.getNotificationPreferences(req, res, next));
router.put('/notifications/preferences', authenticate, (req, res, next) => userController.updateNotificationPreferences(req, res, next));

router.delete('/account', authenticate, (req, res, next) => userController.deleteAccount(req, res, next));

export default router;