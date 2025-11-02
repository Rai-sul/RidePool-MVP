import { Router } from 'express';
import proxy from 'express-http-proxy';
import dotenv from 'dotenv';
import { authenticateToken } from './auth.middleware.js';
import { profileClient } from '../../clients/profile.client';
import { authClient } from '../../clients/auth.client';
import { tripClient } from '../../clients/trip.client';
import { dispatchClient } from '../../clients/dispatch.client';
import { pricingClient } from '../../clients/pricing.client';
import { paymentClient } from '../../clients/payment.client';
import { mapsClient } from '../../clients/maps.client';
import { notificationsClient } from '../../clients/notifications.client';
import { CreateUserProfileRequest, GetUserProfileRequest, GetUserByUniqueIdRequest, AddFriendRequest, UserProfile as ProtoUserProfile, UserProfileResponse } from '../../proto/profile_pb';
import { RegisterRequest, LoginRequest, RegisterResponse, LoginResponse } from '../../proto/auth_pb';
import { CreateTripRequest, GetTripRequest, GetPoolRequest, JoinPoolRequest, LeavePoolRequest, GetOpenPoolsRequest, AddFriendToPoolRequest, TripResponse, PoolResponse, OpenPoolsResponse, Trip as ProtoTrip, VehicleType as ProtoVehicleType, Location as ProtoLocation, TripStatus as ProtoTripStatus } from '../../proto/trip_pb';
import { FindDriverRequest, FindDriverResponse } from '../../proto/dispatch_pb';
import { CalculateFareRequest, CalculateFareResponse } from '../../proto/pricing_pb';
import { InitiatePaymentRequest, InitiatePaymentResponse, HandlePaymentCallbackRequest, HandlePaymentCallbackResponse, Payment } from '../../proto/payment_pb';
import { GeocodeRequest, GeocodeResponse, ReverseGeocodeRequest, ReverseGeocodeResponse, GetRouteRequest, GetRouteResponse } from '../../proto/maps_pb';
import { SendNotificationRequest, GetNotificationsRequest, MarkAsReadRequest, NotificationResponse, NotificationsResponse } from '../../proto/notifications_pb';
import * as grpc from '@grpc/grpc-js';

dotenv.config();

const router = Router();

// Authentication routes (public)
router.post('/auth/register', (req, res) => {
  const request = new RegisterRequest();
  request.setEmail(req.body.email);
  request.setPassword(req.body.password);

  authClient.register(request, (error: grpc.ServiceError | null, response: RegisterResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().user);
  });
});

router.post('/auth/login', (req, res) => {
  const request = new LoginRequest();
  request.setEmail(req.body.email);
  request.setPassword(req.body.password);

  authClient.login(request, (error: grpc.ServiceError | null, response: LoginResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().user);
  });
});

// Apply authentication middleware to all other routes
router.use(authenticateToken);

// Protected routes
// gRPC for Profile Service
router.post('/profiles', (req, res) => {
  const request = new CreateUserProfileRequest();
  const profile = new ProtoUserProfile();
  profile.setId(req.body.id);
  profile.setUniqueId(req.body.uniqueId);
  profile.setName(req.body.name);
  profile.setEmail(req.body.email);
  profile.setPhoneNumber(req.body.phoneNumber);
  profile.setAvatarUrl(req.body.avatarUrl);
  profile.setFriendsList(req.body.friends || []);
  request.setProfile(profile);

  profileClient.createUserProfile(request, (error: grpc.ServiceError | null, response: UserProfileResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().profile);
  });
});

router.get('/profiles/:id', (req, res) => {
  const request = new GetUserProfileRequest();
  request.setId(req.params.id);

  profileClient.getUserProfile(request, (error: grpc.ServiceError | null, response: UserProfileResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().profile);
  });
});

router.get('/profiles/unique/:uniqueId', (req, res) => {
  const request = new GetUserByUniqueIdRequest();
  request.setUniqueId(req.params.uniqueId);

  profileClient.getUserByUniqueId(request, (error: grpc.ServiceError | null, response: UserProfileResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().profile);
  });
});

router.post('/profiles/add-friend', (req, res) => {
  const request = new AddFriendRequest();
  request.setUserId(req.body.userId);
  request.setFriendUniqueId(req.body.friendUniqueId);

  profileClient.addFriend(request, (error: grpc.ServiceError | null, response: UserProfileResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().profile);
  });
});

// gRPC for Trip Service
router.post('/trips', (req, res) => {
  const request = new CreateTripRequest();
  const trip = new ProtoTrip();
  const origin = new ProtoLocation();
  origin.setLat(req.body.origin.lat);
  origin.setLng(req.body.origin.lng);
  origin.setAddress(req.body.origin.address);
  const destination = new ProtoLocation();
  destination.setLat(req.body.destination.lat);
  destination.setLng(req.body.destination.lng);
  destination.setAddress(req.body.destination.address);

  trip.setUserId(req.body.userId);
  if (req.body.driverId) trip.setDriverId(req.body.driverId);
  trip.setOrigin(origin);
  trip.setDestination(destination);
  trip.setStatus(req.body.status);
  trip.setFare(req.body.fare);
  if (req.body.poolId) trip.setPoolId(req.body.poolId);
  if (req.body.passengers) trip.setPassengersList(req.body.passengers);
  if (req.body.vehicleType !== undefined) trip.setVehicleType(req.body.vehicleType);
  if (req.body.maxPassengers) trip.setMaxPassengers(req.body.maxPassengers);
  trip.setCreatedAt(req.body.createdAt);
  request.setTrip(trip);

  tripClient.createTrip(request, (error: grpc.ServiceError | null, response: TripResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().trip);
  });
});

router.get('/trips/:id', (req, res) => {
  const request = new GetTripRequest();
  request.setId(req.params.id);

  tripClient.getTrip(request, (error: grpc.ServiceError | null, response: TripResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().trip);
  });
});

router.get('/pools/:id', (req, res) => {
  const request = new GetPoolRequest();
  request.setId(req.params.id);

  tripClient.getPool(request, (error: grpc.ServiceError | null, response: PoolResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().pool);
  });
});

router.post('/pools/join', (req, res) => {
  const request = new JoinPoolRequest();
  request.setPoolId(req.body.poolId);
  request.setUserId(req.body.userId);

  tripClient.joinPool(request, (error: grpc.ServiceError | null, response: PoolResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().pool);
  });
});

router.post('/pools/leave', (req, res) => {
  const request = new LeavePoolRequest();
  request.setPoolId(req.body.poolId);
  request.setUserId(req.body.userId);

  tripClient.leavePool(request, (error: grpc.ServiceError | null, response: PoolResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().pool);
  });
});

router.get('/pools/open', (req, res) => {
  const request = new GetOpenPoolsRequest();
  if (req.query.vehicleType) {
    const vehicleType = req.query.vehicleType.toString().toUpperCase();
    if (vehicleType === 'CAR') {
      request.setVehicleType(ProtoVehicleType.VEHICLE_TYPE_CAR);
    } else if (vehicleType === 'CNG') {
      request.setVehicleType(ProtoVehicleType.VEHICLE_TYPE_CNG);
    }
  }

  tripClient.getOpenPools(request, (error: grpc.ServiceError | null, response: OpenPoolsResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().poolsList);
  });
});

router.post('/pools/add-friend', (req, res) => {
  const request = new AddFriendToPoolRequest();
  request.setPoolId(req.body.poolId);
  request.setFriendUniqueId(req.body.friendUniqueId);
  request.setRequestingUserId(req.body.requestingUserId);

  tripClient.addFriendToPool(request, (error: grpc.ServiceError | null, response: PoolResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().pool);
  });
});

// gRPC for Dispatch Service
router.post('/dispatch/find-driver', (req, res) => {
  const request = new FindDriverRequest();
  const trip = new ProtoTrip();
  const origin = new ProtoLocation();
  origin.setLat(req.body.trip.origin.lat);
  origin.setLng(req.body.trip.origin.lng);
  origin.setAddress(req.body.trip.origin.address);
  const destination = new ProtoLocation();
  destination.setLat(req.body.trip.destination.lat);
  destination.setLng(req.body.trip.destination.lng);
  destination.setAddress(req.body.trip.destination.address);

  trip.setId(req.body.trip.id);
  trip.setUserId(req.body.trip.userId);
  if (req.body.trip.driverId) trip.setDriverId(req.body.trip.driverId);
  trip.setOrigin(origin);
  trip.setDestination(destination);
  trip.setStatus(req.body.trip.status);
  trip.setFare(req.body.trip.fare);
  if (req.body.trip.poolId) trip.setPoolId(req.body.trip.poolId);
  if (req.body.trip.passengers) trip.setPassengersList(req.body.trip.passengers);
  if (req.body.trip.vehicleType !== undefined) trip.setVehicleType(req.body.trip.vehicleType);
  if (req.body.trip.maxPassengers) trip.setMaxPassengers(req.body.trip.maxPassengers);
  trip.setCreatedAt(req.body.trip.createdAt);
  request.setTrip(trip);

  dispatchClient.findDriver(request, (error: grpc.ServiceError | null, response: FindDriverResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().dispatch);
  });
});

// gRPC for Pricing Service
router.post('/pricing/calculate-fare', (req, res) => {
  const request = new CalculateFareRequest();
  const trip = new ProtoTrip();
  const origin = new ProtoLocation();
  origin.setLat(req.body.trip.origin.lat);
  origin.setLng(req.body.trip.origin.lng);
  origin.setAddress(req.body.trip.origin.address);
  const destination = new ProtoLocation();
  destination.setLat(req.body.trip.destination.lat);
  destination.setLng(req.body.trip.destination.lng);
  destination.setAddress(req.body.trip.destination.address);

  trip.setId(req.body.trip.id);
  trip.setUserId(req.body.trip.userId);
  if (req.body.trip.driverId) trip.setDriverId(req.body.trip.driverId);
  trip.setOrigin(origin);
  trip.setDestination(destination);
  trip.setStatus(req.body.trip.status);
  trip.setFare(req.body.trip.fare);
  if (req.body.trip.poolId) trip.setPoolId(req.body.trip.poolId);
  if (req.body.trip.passengers) trip.setPassengersList(req.body.trip.passengers);
  if (req.body.trip.vehicleType !== undefined) trip.setVehicleType(req.body.trip.vehicleType);
  if (req.body.trip.maxPassengers) trip.setMaxPassengers(req.body.trip.maxPassengers);
  trip.setCreatedAt(req.body.trip.createdAt);
  request.setTrip(trip);

  pricingClient.calculateFare(request, (error: grpc.ServiceError | null, response: CalculateFareResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject().price);
  });
});

// gRPC for Payment Service
router.post('/payments/initiate', (req, res) => {
  const request = new InitiatePaymentRequest();
  request.setUserId(req.body.userId);
  request.setTripId(req.body.tripId);
  request.setAmount(req.body.amount);
  request.setCurrency(req.body.currency);

  paymentClient.initiatePayment(request, (error: grpc.ServiceError | null, response: InitiatePaymentResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject());
  });
});

router.post('/payments/callback', (req, res) => {
  const request = new HandlePaymentCallbackRequest();
  request.setTransactionId(req.body.transactionId);
  request.setStatus(req.body.status);
  request.setGatewayResponse(req.body.gatewayResponse);

  paymentClient.handleCallback(request, (error: grpc.ServiceError | null, response: HandlePaymentCallbackResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject());
  });
});

// gRPC for Maps Service
router.post('/maps/geocode', (req, res) => {
  const request = new GeocodeRequest();
  request.setAddress(req.body.address);

  mapsClient.geocode(request, (error: grpc.ServiceError | null, response: GeocodeResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject());
  });
});

router.post('/maps/reverse-geocode', (req, res) => {
  const request = new ReverseGeocodeRequest();
  const location = new ProtoLocation();
  location.setLat(req.body.lat);
  location.setLng(req.body.lng);
  request.setLocation(location);

  mapsClient.reverseGeocode(request, (error: grpc.ServiceError | null, response: ReverseGeocodeResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject());
  });
});

router.post('/maps/route', (req, res) => {
  const request = new GetRouteRequest();
  const start = new ProtoLocation();
  start.setLat(req.body.start.lat);
  start.setLng(req.body.start.lng);
  const end = new ProtoLocation();
  end.setLat(req.body.end.lat);
  end.setLng(req.body.end.lng);
  request.setStart(start);
  request.setEnd(end);

  mapsClient.getRoute(request, (error: grpc.ServiceError | null, response: GetRouteResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject());
  });
});

// gRPC for Notifications Service
router.post('/notifications/send', (req, res) => {
  const request = new SendNotificationRequest();
  request.setUserid(req.body.userId);
  request.setMessage(req.body.message);

  notificationsClient.sendNotification(request, (error: grpc.ServiceError | null, response: NotificationResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject());
  });
});

router.get('/notifications/:userId', (req, res) => {
  const request = new GetNotificationsRequest();
  request.setUserid(req.params.userId);

  notificationsClient.getNotifications(request, (error: grpc.ServiceError | null, response: NotificationsResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject());
  });
});

router.put('/notifications/read/:id', (req, res) => {
  const request = new MarkAsReadRequest();
  request.setId(req.params.id);

  notificationsClient.markAsRead(request, (error: grpc.ServiceError | null, response: NotificationResponse | undefined) => {
    if (error) {
      return res.status(500).send(error.message);
    }
    res.json(response?.toObject());
  });
});

export default router;
