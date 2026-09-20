import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { advanceBookingController } from '../controllers/advanceBooking.controller';
import {
  validate,
  CreateAdvanceBookingSchema,
  PoolIdParamSchema,
  RideIdParamSchema,
} from '../middleware/validation';

const router = Router();

// Advance riders are auto-assigned to a pool - there is deliberately no
// discovery endpoint here. Eligible advance pools surface to instant riders
// through the regular /api/pools/search flow instead.
router.get('/', authenticate, (req, res, next) => advanceBookingController.listBookings(req, res, next));
router.post('/', authenticate, validate(CreateAdvanceBookingSchema), (req, res, next) => advanceBookingController.createBooking(req, res, next));
router.patch('/:rideId', authenticate, validate(RideIdParamSchema, 'params'), validate(CreateAdvanceBookingSchema), (req, res, next) => advanceBookingController.updateBooking(req, res, next));
router.delete('/:rideId', authenticate, validate(RideIdParamSchema, 'params'), (req, res, next) => advanceBookingController.cancelBooking(req, res, next));
router.post('/:poolId/confirm', authenticate, validate(PoolIdParamSchema, 'params'), (req, res, next) => advanceBookingController.confirmBooking(req, res, next));

export default router;
