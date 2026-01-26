import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { paymentController } from '../controllers/payment.controller';

const router = Router();

router.post('/process', authenticate, (req, res, next) => paymentController.processPayment(req, res, next));
router.get('/history', authenticate, (req, res, next) => paymentController.getPaymentHistory(req, res, next));

export default router;