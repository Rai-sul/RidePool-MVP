import { Router } from 'express';
import { priyoSathiController } from '../controllers/priyoSathi.controller';
import { authenticate } from '../middleware/auth';
import { validate, PriyoSathiAddSchema, CompanionIdParamSchema } from '../middleware/validation';

const router = Router();

// Get all companions
router.get('/', authenticate, priyoSathiController.getCompanions.bind(priyoSathiController));

// Add a new companion (sends request)
router.post('/', authenticate, validate(PriyoSathiAddSchema), priyoSathiController.addCompanion.bind(priyoSathiController));

// Get pending requests (requests from others) - must be before /:companionId routes
router.get('/requests', authenticate, priyoSathiController.getPendingRequests.bind(priyoSathiController));

// Get nearby companions for pool matching preview - must be before /:companionId routes
// Query params: pickup_lat, pickup_lng, destination_lat, destination_lng
router.get('/nearby', authenticate, priyoSathiController.getNearbyCompanions.bind(priyoSathiController));

// Get ride invite details - must be before /:companionId routes
router.get('/invite/:rideId', authenticate, priyoSathiController.getRideInviteDetails.bind(priyoSathiController));

// Accept a ride invite and join the friend's pool
router.post('/invite/:rideId/accept', authenticate, priyoSathiController.acceptRideInvite.bind(priyoSathiController));

// Respond to a pending request (accept/reject)
router.post('/requests/:requestId/respond', authenticate, priyoSathiController.respondToRequest.bind(priyoSathiController));

// Remove a companion
router.delete('/:companionId', authenticate, validate(CompanionIdParamSchema, 'params'), priyoSathiController.removeCompanion.bind(priyoSathiController));

// Block a companion
router.post('/:companionId/block', authenticate, validate(CompanionIdParamSchema, 'params'), priyoSathiController.blockCompanion.bind(priyoSathiController));

// Invite a companion to join current ride
router.post('/:companionId/invite', authenticate, validate(CompanionIdParamSchema, 'params'), priyoSathiController.inviteToRide.bind(priyoSathiController));

export default router;
