import { Router } from 'express';
import * as dispatchController from './dispatch.controller';

const router = Router();

router.post('/dispatch', dispatchController.findDriver);

export default router;
