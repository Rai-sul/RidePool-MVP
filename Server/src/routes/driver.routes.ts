import { Router } from 'express';
import { driverController } from '../controllers/driver.controller';
import { authenticate } from '../middleware/auth';
import {
  validate,
  GoOnlineSchema,
  UpdateLocationSchema,
  SetPriorityLocationSchema,
  PoolIdParamSchema,
  PassengerIdParamSchema,
} from '../middleware/validation';

const router = Router();

router.post('/go-online', authenticate, validate(GoOnlineSchema), driverController.goOnline.bind(driverController));
router.post('/go-offline', authenticate, driverController.goOffline.bind(driverController));
router.get('/status', authenticate, driverController.getStatus.bind(driverController));
router.put('/location', authenticate, validate(UpdateLocationSchema), driverController.updateLocation.bind(driverController));

router.get('/available-pools', authenticate, driverController.getAvailablePools.bind(driverController));
router.post('/pools/:poolId/accept', authenticate, validate(PoolIdParamSchema, 'params'), driverController.acceptPool.bind(driverController));
router.post('/pools/:poolId/reject', authenticate, validate(PoolIdParamSchema, 'params'), driverController.rejectPool.bind(driverController));
router.get('/active-pool', authenticate, driverController.getActivePool.bind(driverController));

router.post('/ride/start', authenticate, driverController.startRide.bind(driverController));
router.post('/ride/complete', authenticate, driverController.completeRide.bind(driverController));
router.post('/pickup/:passengerId', authenticate, validate(PassengerIdParamSchema, 'params'), driverController.markPickup.bind(driverController));
router.post('/dropoff/:passengerId', authenticate, validate(PassengerIdParamSchema, 'params'), driverController.markDropoff.bind(driverController));

router.get('/earnings/today', authenticate, driverController.getEarningsToday.bind(driverController));
router.get('/earnings/history', authenticate, driverController.getEarningsHistory.bind(driverController));
router.get('/stats', authenticate, driverController.getStats.bind(driverController));

router.post('/priority-location', authenticate, validate(SetPriorityLocationSchema), driverController.setPriorityLocation.bind(driverController));
router.get('/priority-location', authenticate, driverController.getPriorityLocation.bind(driverController));
router.delete('/priority-location', authenticate, driverController.clearPriorityLocation.bind(driverController));

export default router;
