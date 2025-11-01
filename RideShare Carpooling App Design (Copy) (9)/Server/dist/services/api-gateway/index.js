"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dotenv_1 = __importDefault(require("dotenv"));
const auth_middleware_js_1 = require("./auth.middleware.js");
const profile_client_1 = require("../../clients/profile.client");
const auth_client_1 = require("../../clients/auth.client");
const trip_client_1 = require("../../clients/trip.client");
const dispatch_client_1 = require("../../clients/dispatch.client");
const pricing_client_1 = require("../../clients/pricing.client");
const payment_client_1 = require("../../clients/payment.client");
const maps_client_1 = require("../../clients/maps.client");
const notifications_client_1 = require("../../clients/notifications.client");
const profile_pb_1 = require("../../proto/profile_pb");
const auth_pb_1 = require("../../proto/auth_pb");
const trip_pb_1 = require("../../proto/trip_pb");
const dispatch_pb_1 = require("../../proto/dispatch_pb");
const pricing_pb_1 = require("../../proto/pricing_pb");
const payment_pb_1 = require("../../proto/payment_pb");
const maps_pb_1 = require("../../proto/maps_pb");
const notifications_pb_1 = require("../../proto/notifications_pb");
dotenv_1.default.config();
const router = (0, express_1.Router)();
// Authentication routes (public)
router.post('/auth/register', (req, res) => {
    const request = new auth_pb_1.RegisterRequest();
    request.setEmail(req.body.email);
    request.setPassword(req.body.password);
    auth_client_1.authClient.register(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().user);
    });
});
router.post('/auth/login', (req, res) => {
    const request = new auth_pb_1.LoginRequest();
    request.setEmail(req.body.email);
    request.setPassword(req.body.password);
    auth_client_1.authClient.login(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().user);
    });
});
// Apply authentication middleware to all other routes
router.use(auth_middleware_js_1.authenticateToken);
// Protected routes
// gRPC for Profile Service
router.post('/profiles', (req, res) => {
    const request = new profile_pb_1.CreateUserProfileRequest();
    const profile = new profile_pb_1.UserProfile();
    profile.setId(req.body.id);
    profile.setUniqueId(req.body.uniqueId);
    profile.setName(req.body.name);
    profile.setEmail(req.body.email);
    profile.setPhoneNumber(req.body.phoneNumber);
    profile.setAvatarUrl(req.body.avatarUrl);
    profile.setFriendsList(req.body.friends || []);
    request.setProfile(profile);
    profile_client_1.profileClient.createUserProfile(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().profile);
    });
});
router.get('/profiles/:id', (req, res) => {
    const request = new profile_pb_1.GetUserProfileRequest();
    request.setId(req.params.id);
    profile_client_1.profileClient.getUserProfile(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().profile);
    });
});
router.get('/profiles/unique/:uniqueId', (req, res) => {
    const request = new profile_pb_1.GetUserByUniqueIdRequest();
    request.setUniqueId(req.params.uniqueId);
    profile_client_1.profileClient.getUserByUniqueId(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().profile);
    });
});
router.post('/profiles/add-friend', (req, res) => {
    const request = new profile_pb_1.AddFriendRequest();
    request.setUserId(req.body.userId);
    request.setFriendUniqueId(req.body.friendUniqueId);
    profile_client_1.profileClient.addFriend(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().profile);
    });
});
// gRPC for Trip Service
router.post('/trips', (req, res) => {
    const request = new trip_pb_1.CreateTripRequest();
    const trip = new trip_pb_1.Trip();
    const origin = new trip_pb_1.Location();
    origin.setLat(req.body.origin.lat);
    origin.setLng(req.body.origin.lng);
    origin.setAddress(req.body.origin.address);
    const destination = new trip_pb_1.Location();
    destination.setLat(req.body.destination.lat);
    destination.setLng(req.body.destination.lng);
    destination.setAddress(req.body.destination.address);
    trip.setUserId(req.body.userId);
    if (req.body.driverId)
        trip.setDriverId(req.body.driverId);
    trip.setOrigin(origin);
    trip.setDestination(destination);
    trip.setStatus(req.body.status);
    trip.setFare(req.body.fare);
    if (req.body.poolId)
        trip.setPoolId(req.body.poolId);
    if (req.body.passengers)
        trip.setPassengersList(req.body.passengers);
    if (req.body.vehicleType !== undefined)
        trip.setVehicleType(req.body.vehicleType);
    if (req.body.maxPassengers)
        trip.setMaxPassengers(req.body.maxPassengers);
    trip.setCreatedAt(req.body.createdAt);
    request.setTrip(trip);
    trip_client_1.tripClient.createTrip(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().trip);
    });
});
router.get('/trips/:id', (req, res) => {
    const request = new trip_pb_1.GetTripRequest();
    request.setId(req.params.id);
    trip_client_1.tripClient.getTrip(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().trip);
    });
});
router.get('/pools/:id', (req, res) => {
    const request = new trip_pb_1.GetPoolRequest();
    request.setId(req.params.id);
    trip_client_1.tripClient.getPool(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().pool);
    });
});
router.post('/pools/join', (req, res) => {
    const request = new trip_pb_1.JoinPoolRequest();
    request.setPoolId(req.body.poolId);
    request.setUserId(req.body.userId);
    trip_client_1.tripClient.joinPool(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().pool);
    });
});
router.post('/pools/leave', (req, res) => {
    const request = new trip_pb_1.LeavePoolRequest();
    request.setPoolId(req.body.poolId);
    request.setUserId(req.body.userId);
    trip_client_1.tripClient.leavePool(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().pool);
    });
});
router.get('/pools/open', (req, res) => {
    const request = new trip_pb_1.GetOpenPoolsRequest();
    if (req.query.vehicleType) {
        const vehicleType = req.query.vehicleType.toString().toUpperCase();
        if (vehicleType === 'CAR') {
            request.setVehicleType(trip_pb_1.VehicleType.VEHICLE_TYPE_CAR);
        }
        else if (vehicleType === 'CNG') {
            request.setVehicleType(trip_pb_1.VehicleType.VEHICLE_TYPE_CNG);
        }
    }
    trip_client_1.tripClient.getOpenPools(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().poolsList);
    });
});
router.post('/pools/add-friend', (req, res) => {
    const request = new trip_pb_1.AddFriendToPoolRequest();
    request.setPoolId(req.body.poolId);
    request.setFriendUniqueId(req.body.friendUniqueId);
    request.setRequestingUserId(req.body.requestingUserId);
    trip_client_1.tripClient.addFriendToPool(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().pool);
    });
});
// gRPC for Dispatch Service
router.post('/dispatch/find-driver', (req, res) => {
    const request = new dispatch_pb_1.FindDriverRequest();
    const trip = new trip_pb_1.Trip();
    const origin = new trip_pb_1.Location();
    origin.setLat(req.body.trip.origin.lat);
    origin.setLng(req.body.trip.origin.lng);
    origin.setAddress(req.body.trip.origin.address);
    const destination = new trip_pb_1.Location();
    destination.setLat(req.body.trip.destination.lat);
    destination.setLng(req.body.trip.destination.lng);
    destination.setAddress(req.body.trip.destination.address);
    trip.setId(req.body.trip.id);
    trip.setUserId(req.body.trip.userId);
    if (req.body.trip.driverId)
        trip.setDriverId(req.body.trip.driverId);
    trip.setOrigin(origin);
    trip.setDestination(destination);
    trip.setStatus(req.body.trip.status);
    trip.setFare(req.body.trip.fare);
    if (req.body.trip.poolId)
        trip.setPoolId(req.body.trip.poolId);
    if (req.body.trip.passengers)
        trip.setPassengersList(req.body.trip.passengers);
    if (req.body.trip.vehicleType !== undefined)
        trip.setVehicleType(req.body.trip.vehicleType);
    if (req.body.trip.maxPassengers)
        trip.setMaxPassengers(req.body.trip.maxPassengers);
    trip.setCreatedAt(req.body.trip.createdAt);
    request.setTrip(trip);
    dispatch_client_1.dispatchClient.findDriver(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().dispatch);
    });
});
// gRPC for Pricing Service
router.post('/pricing/calculate-fare', (req, res) => {
    const request = new pricing_pb_1.CalculateFareRequest();
    const trip = new trip_pb_1.Trip();
    const origin = new trip_pb_1.Location();
    origin.setLat(req.body.trip.origin.lat);
    origin.setLng(req.body.trip.origin.lng);
    origin.setAddress(req.body.trip.origin.address);
    const destination = new trip_pb_1.Location();
    destination.setLat(req.body.trip.destination.lat);
    destination.setLng(req.body.trip.destination.lng);
    destination.setAddress(req.body.trip.destination.address);
    trip.setId(req.body.trip.id);
    trip.setUserId(req.body.trip.userId);
    if (req.body.trip.driverId)
        trip.setDriverId(req.body.trip.driverId);
    trip.setOrigin(origin);
    trip.setDestination(destination);
    trip.setStatus(req.body.trip.status);
    trip.setFare(req.body.trip.fare);
    if (req.body.trip.poolId)
        trip.setPoolId(req.body.trip.poolId);
    if (req.body.trip.passengers)
        trip.setPassengersList(req.body.trip.passengers);
    if (req.body.trip.vehicleType !== undefined)
        trip.setVehicleType(req.body.trip.vehicleType);
    if (req.body.trip.maxPassengers)
        trip.setMaxPassengers(req.body.trip.maxPassengers);
    trip.setCreatedAt(req.body.trip.createdAt);
    request.setTrip(trip);
    pricing_client_1.pricingClient.calculateFare(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject().price);
    });
});
// gRPC for Payment Service
router.post('/payments/initiate', (req, res) => {
    const request = new payment_pb_1.InitiatePaymentRequest();
    request.setUserId(req.body.userId);
    request.setTripId(req.body.tripId);
    request.setAmount(req.body.amount);
    request.setCurrency(req.body.currency);
    payment_client_1.paymentClient.initiatePayment(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject());
    });
});
router.post('/payments/callback', (req, res) => {
    const request = new payment_pb_1.HandlePaymentCallbackRequest();
    request.setTransactionId(req.body.transactionId);
    request.setStatus(req.body.status);
    request.setGatewayResponse(req.body.gatewayResponse);
    payment_client_1.paymentClient.handleCallback(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject());
    });
});
// gRPC for Maps Service
router.post('/maps/geocode', (req, res) => {
    const request = new maps_pb_1.GeocodeRequest();
    request.setAddress(req.body.address);
    maps_client_1.mapsClient.geocode(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject());
    });
});
router.post('/maps/reverse-geocode', (req, res) => {
    const request = new maps_pb_1.ReverseGeocodeRequest();
    const location = new trip_pb_1.Location();
    location.setLat(req.body.lat);
    location.setLng(req.body.lng);
    request.setLocation(location);
    maps_client_1.mapsClient.reverseGeocode(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject());
    });
});
router.post('/maps/route', (req, res) => {
    const request = new maps_pb_1.GetRouteRequest();
    const start = new trip_pb_1.Location();
    start.setLat(req.body.start.lat);
    start.setLng(req.body.start.lng);
    const end = new trip_pb_1.Location();
    end.setLat(req.body.end.lat);
    end.setLng(req.body.end.lng);
    request.setStart(start);
    request.setEnd(end);
    maps_client_1.mapsClient.getRoute(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject());
    });
});
// gRPC for Notifications Service
router.post('/notifications/send', (req, res) => {
    const request = new notifications_pb_1.SendNotificationRequest();
    request.setUserid(req.body.userId);
    request.setMessage(req.body.message);
    notifications_client_1.notificationsClient.sendNotification(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject());
    });
});
router.get('/notifications/:userId', (req, res) => {
    const request = new notifications_pb_1.GetNotificationsRequest();
    request.setUserid(req.params.userId);
    notifications_client_1.notificationsClient.getNotifications(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject());
    });
});
router.put('/notifications/read/:id', (req, res) => {
    const request = new notifications_pb_1.MarkAsReadRequest();
    request.setId(req.params.id);
    notifications_client_1.notificationsClient.markAsRead(request, (error, response) => {
        if (error) {
            return res.status(500).send(error.message);
        }
        res.json(response === null || response === void 0 ? void 0 : response.toObject());
    });
});
exports.default = router;
