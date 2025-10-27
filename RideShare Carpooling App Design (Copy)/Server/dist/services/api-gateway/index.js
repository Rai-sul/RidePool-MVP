"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_http_proxy_1 = __importDefault(require("express-http-proxy"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_middleware_js_1 = require("./auth.middleware.js");
dotenv_1.default.config();
const router = (0, express_1.Router)();
// Authentication routes (public)
router.use('/auth', (0, express_http_proxy_1.default)(process.env.AUTH_SERVICE_URL || 'http://localhost:3002'));
// Apply authentication middleware to all other routes
router.use(auth_middleware_js_1.authenticateToken);
// Protected routes
router.use('/profiles', (0, express_http_proxy_1.default)(process.env.PROFILE_SERVICE_URL || 'http://localhost:3001'));
router.use('/trips', (0, express_http_proxy_1.default)(process.env.TRIP_SERVICE_URL || 'http://localhost:3003'));
router.use('/dispatch', (0, express_http_proxy_1.default)(process.env.DISPATCH_SERVICE_URL || 'http://localhost:3004'));
router.use('/pricing', (0, express_http_proxy_1.default)(process.env.PRICING_SERVICE_URL || 'http://localhost:3005'));
router.use('/payments', (0, express_http_proxy_1.default)(process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006'));
router.use('/maps', (0, express_http_proxy_1.default)(process.env.MAPS_SERVICE_URL || 'http://localhost:3007'));
router.use('/notifications', (0, express_http_proxy_1.default)(process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3008'));
exports.default = router;
