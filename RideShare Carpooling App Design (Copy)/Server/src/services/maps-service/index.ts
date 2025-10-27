import { Router } from 'express';
import * as mapsController from './maps.controller';

const router = Router();

router.get('/geocode', mapsController.geocodeAddress);
router.get('/reverse-geocode', mapsController.reverseGeocode);
router.get('/route', mapsController.calculateRoute);
router.get('/h3-index', mapsController.getH3Index);
router.get('/h3-k-ring', mapsController.getKRing);

export default router;