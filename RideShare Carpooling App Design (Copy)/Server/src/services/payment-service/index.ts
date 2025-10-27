import { Router } from 'express';
import * as paymentController from './payment.controller';

const router = Router();

router.post('/payments/initiate', paymentController.initiatePayment);
router.get('/payments/success', paymentController.handleSuccess);
router.get('/payments/fail', paymentController.handleFail);
router.get('/payments/cancel', paymentController.handleCancel);
router.post('/payments/ipn', paymentController.handleIpn);

export default router;