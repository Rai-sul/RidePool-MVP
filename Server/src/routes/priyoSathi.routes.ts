import { Router } from 'express';
import { priyoSathiController } from '../controllers/priyoSathi.controller';
import { authenticate } from '../middleware/auth';
import { validate, PriyoSathiAddSchema, CompanionIdParamSchema } from '../middleware/validation';

const router = Router();

router.get('/', authenticate, priyoSathiController.getCompanions.bind(priyoSathiController));
router.post('/', authenticate, validate(PriyoSathiAddSchema), priyoSathiController.addCompanion.bind(priyoSathiController));
router.delete('/:companionId', authenticate, validate(CompanionIdParamSchema, 'params'), priyoSathiController.removeCompanion.bind(priyoSathiController));

router.get('/requests', authenticate, priyoSathiController.getPendingRequests.bind(priyoSathiController));
router.post('/requests/:requestId/respond', authenticate, priyoSathiController.respondToRequest.bind(priyoSathiController));

router.post('/:companionId/invite', authenticate, validate(CompanionIdParamSchema, 'params'), priyoSathiController.inviteToRide.bind(priyoSathiController));

export default router;
