import { Router } from 'express';
import { messagingController } from '../controllers/messaging.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, messagingController.sendMessage.bind(messagingController));
router.get('/conversations', authenticate, messagingController.getConversations.bind(messagingController));
router.get('/conversations/:conversationId', authenticate, messagingController.getMessages.bind(messagingController));
router.get('/unread-count', authenticate, messagingController.getUnreadCount.bind(messagingController)); // Must be before /:conversationId
router.get('/:conversationId', authenticate, messagingController.getMessages.bind(messagingController)); // Alias for frontend compatibility
router.post('/conversations/:conversationId/read', authenticate, messagingController.markConversationAsRead.bind(messagingController));
router.post('/messages/:messageId/read', authenticate, messagingController.markAsRead.bind(messagingController));
router.post('/:messageId/read', authenticate, messagingController.markAsRead.bind(messagingController)); // Alias for frontend compatibility

export default router;
