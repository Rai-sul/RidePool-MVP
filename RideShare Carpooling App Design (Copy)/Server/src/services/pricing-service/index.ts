import { Router } from 'express';
import * as pricingController from './pricing.controller';

const router = Router();

router.post('/pricing', pricingController.calculateFare);

export default router;
