import { Router } from 'express';
import { walletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/balance', authenticate, walletController.getBalance.bind(walletController));
router.post('/topup', authenticate, walletController.topUp.bind(walletController));
router.get('/transactions', authenticate, walletController.getTransactions.bind(walletController));
router.get('/check-balance', authenticate, walletController.checkBalance.bind(walletController));
router.post('/pay', authenticate, walletController.payForRide.bind(walletController));

export default router;
