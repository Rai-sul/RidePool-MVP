import { Router } from 'express';
import { savedPlacesController } from '../controllers/savedPlaces.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, savedPlacesController.getSavedPlaces.bind(savedPlacesController));
router.post('/', authenticate, savedPlacesController.createSavedPlace.bind(savedPlacesController));
router.get('/:placeId', authenticate, savedPlacesController.getSavedPlace.bind(savedPlacesController));
router.put('/:placeId', authenticate, savedPlacesController.updateSavedPlace.bind(savedPlacesController));
router.delete('/:placeId', authenticate, savedPlacesController.deleteSavedPlace.bind(savedPlacesController));

export default router;
