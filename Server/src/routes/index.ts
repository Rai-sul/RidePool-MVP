import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import poolRoutes from './pool.routes';
import rideRoutes from './ride.routes';
import paymentRoutes from './payment.routes';
import driverRoutes from './driver.routes';
import priyoSathiRoutes from './priyoSathi.routes';
import ratingRoutes from './rating.routes';
import messagingRoutes from './messaging.routes';
import promoRoutes from './promo.routes';
import walletRoutes from './wallet.routes';
import savedPlacesRoutes from './savedPlaces.routes';
import analyticsRoutes from './analytics.routes';
import offlineRoutes from './offline.routes';
import navigationRoutes from './navigation.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pools', poolRoutes);
router.use('/rides', rideRoutes);
router.use('/payments', paymentRoutes);
router.use('/driver', driverRoutes);
router.use('/priyo-sathi', priyoSathiRoutes);
router.use('/ratings', ratingRoutes);
router.use('/messages', messagingRoutes);
router.use('/promos', promoRoutes);
router.use('/wallet', walletRoutes);
router.use('/saved-places', savedPlacesRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/offline', offlineRoutes);
router.use('/navigation', navigationRoutes);

export default router;
