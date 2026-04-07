import { Router } from 'express';
import { sosController } from '../controllers/sos.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/sos', authenticate, sosController.triggerSOS.bind(sosController));
router.post('/incidents', authenticate, sosController.reportIncident.bind(sosController));
router.get('/incidents', authenticate, sosController.getActiveIncidents.bind(sosController));
router.post('/share-trip', authenticate, sosController.shareTrip.bind(sosController));

router.get('/emergency-contacts', authenticate, sosController.getEmergencyContacts.bind(sosController));
router.post('/emergency-contacts', authenticate, sosController.addEmergencyContact.bind(sosController));
router.delete('/emergency-contacts/:contactId', authenticate, sosController.removeEmergencyContact.bind(sosController));

export default router;
