import { Router } from 'express';
import { shiftController } from '../controllers/shift.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, (req, res, next) => shiftController.getSchedule(req, res, next));
router.post('/', authenticateToken, (req, res, next) => shiftController.setShift(req, res, next));
router.put('/:shiftId', authenticateToken, (req, res, next) => shiftController.updateShift(req, res, next));
router.delete('/:shiftId', authenticateToken, (req, res, next) => shiftController.deleteShift(req, res, next));
router.delete('/day/:dayOfWeek', authenticateToken, (req, res, next) => shiftController.clearDaySchedule(req, res, next));
router.get('/stats', authenticateToken, (req, res, next) => shiftController.getStats(req, res, next));
router.get('/reminders', authenticateToken, (req, res, next) => shiftController.getReminders(req, res, next));
router.get('/status', authenticateToken, (req, res, next) => shiftController.checkShiftStatus(req, res, next));

export default router;
