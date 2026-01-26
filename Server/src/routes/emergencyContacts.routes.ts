import { Router } from 'express';
import { emergencyContactsController } from '../controllers/emergencyContacts.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, emergencyContactsController.getEmergencyContacts.bind(emergencyContactsController));
router.post('/', authenticate, emergencyContactsController.createEmergencyContact.bind(emergencyContactsController));
router.put('/:contactId', authenticate, emergencyContactsController.updateEmergencyContact.bind(emergencyContactsController));
router.delete('/:contactId', authenticate, emergencyContactsController.deleteEmergencyContact.bind(emergencyContactsController));
router.post('/:contactId/primary', authenticate, emergencyContactsController.setPrimaryContact.bind(emergencyContactsController));
router.get('/primary', authenticate, emergencyContactsController.getPrimaryContact.bind(emergencyContactsController));

export default router;
