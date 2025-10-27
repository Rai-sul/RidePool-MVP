import { Router } from 'express';
import * as notificationsController from './notifications.controller';

const router = Router();

router.post('/notifications', notificationsController.sendNotification);
router.get('/notifications/user/:userId', notificationsController.getNotifications);
router.put('/notifications/:notificationId/read', notificationsController.markAsRead);

export default router;