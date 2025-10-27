import { Router } from 'express';
import proxy from 'express-http-proxy';
import dotenv from 'dotenv';
import { authenticateToken } from './auth.middleware.js';

dotenv.config();

const router = Router();

// Authentication routes (public)
router.use('/auth', proxy(process.env.AUTH_SERVICE_URL || 'http://localhost:3002'));

// Apply authentication middleware to all other routes
router.use(authenticateToken);

// Protected routes
router.use('/profiles', proxy(process.env.PROFILE_SERVICE_URL || 'http://localhost:3001'));
router.use('/trips', proxy(process.env.TRIP_SERVICE_URL || 'http://localhost:3003'));
router.use('/dispatch', proxy(process.env.DISPATCH_SERVICE_URL || 'http://localhost:3004'));
router.use('/pricing', proxy(process.env.PRICING_SERVICE_URL || 'http://localhost:3005'));
router.use('/payments', proxy(process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006'));
router.use('/maps', proxy(process.env.MAPS_SERVICE_URL || 'http://localhost:3007'));
router.use('/notifications', proxy(process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3008'));

export default router;
