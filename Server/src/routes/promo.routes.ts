import { Router } from 'express';
import { promoController } from '../controllers/promo.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/validate', authenticate, promoController.validatePromo.bind(promoController));
router.get('/active', authenticate, promoController.getActivePromos.bind(promoController));
router.get('/history', authenticate, promoController.getMyPromoHistory.bind(promoController));

router.post('/', authenticate, promoController.createPromo.bind(promoController));
router.delete('/:promoId', authenticate, promoController.deactivatePromo.bind(promoController));

export default router;
