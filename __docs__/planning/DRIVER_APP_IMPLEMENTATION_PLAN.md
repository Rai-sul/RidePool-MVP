# Driver App Backend & MapBox Implementation Plan

**Date:** December 2, 2024  
**Project:** RidePool - Driver App Backend Integration  
**Architecture:** MVC with Supabase  
**Current Status:** Passenger app (CarPoolApp) backend exists, Driver app needs backend implementation

---

## 📋 Executive Summary

The existing server handles **passenger-side operations** (pool creation, matching, ride requests). We need to extend it with **driver-specific controllers and services** to handle driver workflows while maintaining a **unified backend** that coordinates between drivers and passengers.

### Key Decisions:
1. ✅ **Single Backend Server** - Extend existing server with driver controllers
2. ✅ **Shared Database** - Use existing Supabase schema (already has driver support)
3. ✅ **MapBox Integration** - Add for driver navigation and real-time tracking
4. ✅ **Unified Pool System** - Drivers and passengers interact with same pools table

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE BACKEND SERVER                     │
│                   (Port 4000 - Express.js)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Passenger APIs  │         │   Driver APIs    │          │
│  │  (Existing)      │         │   (NEW)          │          │
│  ├──────────────────┤         ├──────────────────┤          │
│  │ - Pool Search    │         │ - Go Online      │          │
│  │ - Join Pool      │         │ - Accept Pool    │          │
│  │ - Ride Request   │         │ - Navigate       │          │
│  │ - Rating         │         │ - Complete Ride  │          │
│  │ - Payment        │         │ - Earnings       │          │
│  └──────────────────┘         └──────────────────┘          │
│                                                               │
│  ┌─────────────────────────────────────────────┐            │
│  │         Shared Services Layer               │            │
│  ├─────────────────────────────────────────────┤            │
│  │ - MapService (ENHANCED with MapBox)         │            │
│  │ - PoolService (matching logic)              │            │
│  │ - PaymentService (split earnings)           │            │
│  │ - NotificationService (push to both sides)  │            │
│  │ - LocationService (real-time tracking)      │            │
│  └─────────────────────────────────────────────┘            │
│                                                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   SUPABASE DATABASE   │
            │   (Single Schema)     │
            ├───────────────────────┤
            │ - users (role flag)   │
            │ - pools               │
            │ - rides               │
            │ - vehicles            │
            │ - payments            │
            │ - ratings             │
            └───────────────────────┘

┌──────────────┐              ┌──────────────┐
│  CarPoolApp  │              │  DriverApp   │
│  (Passenger) │              │  (Driver)    │
│  Port 8081   │              │  Port 8081   │
│  React Native│              │  React Native│
└──────┬───────┘              └──────┬───────┘
       │                              │
       └──────────────┬───────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  API Gateway  │
              │  Port 4000    │
              └───────────────┘
```

---

## 🎯 Implementation Strategy

### Phase 1: MapBox Setup & Location Services (Week 1)
**Goal:** Enable real-time navigation and location tracking

#### 1.1 MapBox API Integration
```bash
# Install dependencies
npm install @mapbox/mapbox-sdk @mapbox/mapbox-gl-directions
npm install --save-dev @types/mapbox__mapbox-sdk
```

**Environment Variables:**
```env
# Add to Server/.env
MAPBOX_ACCESS_TOKEN=pk.your_actual_mapbox_token
MAPBOX_STYLE_URL=mapbox://styles/mapbox/streets-v11

# MapBox Routing API
MAPBOX_ROUTING_PROFILE=mapbox/driving-traffic
MAPBOX_ENABLE_TRAFFIC=true
```

#### 1.2 Enhanced Map Service
**File:** `Server/src/services/map.service.ts` (EXTEND existing)

**New Methods to Add:**
- `getRealtimeRoute(origin, destination, waypoints)` - MapBox Directions API
- `getNavigationInstructions(routeId)` - Turn-by-turn directions
- `getTrafficAwareETA(origin, destination)` - Real-time ETA with traffic
- `geocodeAddress(address)` - MapBox Geocoding
- `reverseGeocode(lat, lng)` - Get address from coordinates
- `getRouteBounds(polyline)` - For map viewport adjustment
- `optimizeWaypoints(locations[])` - TSP optimization for pickups

#### 1.3 Real-Time Location Tracking
**New Service:** `Server/src/services/location.service.ts`

```typescript
// Core functionality:
- updateDriverLocation(driverId, lat, lng, heading, speed)
- subscribeToDriverLocation(driverId, callback)
- getDriversInRadius(lat, lng, radiusKm)
- trackRideProgress(rideId)
- calculateETAToPickup(driverId, pickupLocation)
```

**Use WebSocket for real-time updates:**
```typescript
// Server/src/websocket/location.ws.ts
socket.on('driver:location:update', handleLocationUpdate)
socket.emit('passenger:driver:location', locationData)
```

---

### Phase 2: Driver Controllers & APIs (Week 1-2)
**Goal:** Build driver-specific endpoints

#### 2.1 Enhance Existing Driver Controller
**File:** `Server/src/controllers/driver.controller.ts` (EXTEND)

**New Endpoints Needed:**
```typescript
// Driver Status Management
POST   /api/v1/driver/go-online          - Go online, set location
POST   /api/v1/driver/go-offline         - Go offline
GET    /api/v1/driver/status              - Get online status
PUT    /api/v1/driver/location            - Update location (continuous)

// Pool Management (Driver View)
GET    /api/v1/driver/available-pools     - Get pools waiting for drivers
POST   /api/v1/driver/pools/:poolId/accept - Accept a pool
POST   /api/v1/driver/pools/:poolId/reject - Reject a pool
GET    /api/v1/driver/active-pool         - Get current active pool

// Navigation
GET    /api/v1/driver/navigation/route    - Get MapBox navigation route
GET    /api/v1/driver/navigation/next-stop - Get next pickup/dropoff
POST   /api/v1/driver/pickup/:passengerId  - Mark passenger picked up
POST   /api/v1/driver/dropoff/:passengerId - Mark passenger dropped off

// Ride Lifecycle
POST   /api/v1/driver/ride/start          - Start the ride
POST   /api/v1/driver/ride/complete       - Complete the ride
POST   /api/v1/driver/ride/cancel         - Cancel the ride

// Earnings & Stats
GET    /api/v1/driver/earnings/today      - Today's earnings
GET    /api/v1/driver/earnings/history    - Earnings history
GET    /api/v1/driver/stats               - Driver statistics
```

#### 2.2 New Priority Location Controller
**File:** `Server/src/controllers/priority.controller.ts` (NEW)

```typescript
POST   /api/v1/driver/priority-location   - Set priority destination
GET    /api/v1/driver/priority-location   - Get priority location
DELETE /api/v1/driver/priority-location   - Clear priority location
GET    /api/v1/driver/priority-pools      - Get pools matching priority
```

---

### Phase 3: Pool Assignment & Matching (Week 2)
**Goal:** Connect drivers to passenger pools

#### 3.1 Pool Assignment Logic
**File:** `Server/src/services/pool.service.ts` (EXTEND)

**Enhanced Methods:**
```typescript
// Driver Discovery
async findAvailableDrivers(poolId: string): Promise<Driver[]> {
  // 1. Get pool pickup location
  // 2. Query drivers within 5km radius
  // 3. Filter: online, not busy, rating > 4.0
  // 4. Sort by: distance, priority match, rating
  // 5. Return top 10 drivers
}

// Driver Notification
async notifyDriversOfPool(poolId: string): Promise<void> {
  // 1. Find available drivers
  // 2. Send push notification to each
  // 3. Set 30-second acceptance window
  // 4. First to accept gets the pool
}

// Auto-Assignment
async autoAssignDriver(poolId: string): Promise<void> {
  // Called after lookup time expires (3 mins)
  // If pool has ≥2 passengers:
  // 1. Find best driver match
  // 2. Notify driver
  // 3. Wait 30 seconds
  // 4. If declined, try next driver
  // 5. Repeat until assigned or pool expires
}

// Priority Matching
async findPoolsForPriorityLocation(
  driverId: string, 
  priorityLat: number, 
  priorityLng: number
): Promise<Pool[]> {
  // Find pools where passengers' destinations
  // match driver's priority location
}
```

#### 3.2 Pool States for Driver Integration
```typescript
enum PoolStatus {
  WAITING = 'WAITING',          // Gathering passengers (lookup time)
  MATCHING = 'MATCHING',         // ≥2 passengers, searching for driver
  DRIVER_NOTIFIED = 'DRIVER_NOTIFIED', // Driver received notification
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED', // Driver accepted
  EN_ROUTE = 'EN_ROUTE',        // Driver heading to first pickup
  PICKING_UP = 'PICKING_UP',    // Picking up passengers
  IN_PROGRESS = 'IN_PROGRESS',  // Ride active
  COMPLETED = 'COMPLETED',      // Ride finished
  CANCELLED = 'CANCELLED'       // Cancelled
}
```

---

### Phase 4: Database Schema Updates (Week 2)
**Goal:** Support driver-specific features

#### 4.1 Existing Tables to Utilize
The schema already supports most driver features:

✅ **users** table:
- `is_driver` flag
- `driver_priority_lat`, `driver_priority_lng`
- `average_rating`, `total_rides`

✅ **vehicles** table:
- Driver vehicle info
- License, model, capacity

✅ **vehicle_locations** table:
- Real-time driver tracking

✅ **pools** table:
- `driver_id` field
- `status` field

✅ **rides** table:
- Tracks full ride lifecycle

#### 4.2 New Tables Needed

**Driver Sessions Table:**
```sql
CREATE TABLE public.driver_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status VARCHAR(20) CHECK (status IN ('ONLINE', 'BUSY', 'OFFLINE')),
  initial_location GEOGRAPHY(POINT, 4326),
  earnings_session DECIMAL(10,2) DEFAULT 0,
  rides_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_driver_sessions_driver ON driver_sessions(driver_id);
CREATE INDEX idx_driver_sessions_status ON driver_sessions(status);
```

**Driver Earnings Table:**
```sql
CREATE TABLE public.driver_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES users(id),
  ride_id UUID REFERENCES rides(id),
  pool_id UUID REFERENCES pools(id),
  base_fare DECIMAL(10,2),
  distance_fare DECIMAL(10,2),
  time_fare DECIMAL(10,2),
  tips DECIMAL(10,2) DEFAULT 0,
  bonuses DECIMAL(10,2) DEFAULT 0,
  platform_commission DECIMAL(10,2),
  net_earnings DECIMAL(10,2),
  payment_status VARCHAR(20) DEFAULT 'PENDING',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_driver_earnings_driver ON driver_earnings(driver_id);
CREATE INDEX idx_driver_earnings_date ON driver_earnings(created_at);
```

**Pool Notifications Table:**
```sql
CREATE TABLE public.pool_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID NOT NULL REFERENCES pools(id),
  driver_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(20) CHECK (notification_type IN ('NEW_POOL', 'POOL_UPDATE', 'POOL_CANCELLED')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ
);

CREATE INDEX idx_pool_notif_driver ON pool_notifications(driver_id);
CREATE INDEX idx_pool_notif_pool ON pool_notifications(pool_id);
```

---

### Phase 5: Payment & Earnings (Week 3)
**Goal:** Handle driver payouts and earnings tracking

#### 5.1 Earnings Calculation Service
**File:** `Server/src/services/earnings.service.ts` (NEW)

```typescript
class EarningsService {
  // Calculate driver earnings for a ride
  async calculateRideEarnings(rideId: string): Promise<Earnings> {
    // Get ride details
    const ride = await this.getRide(rideId);
    
    // Pricing breakdown:
    // - Base fare: ৳50
    // - Per km: ৳15/km
    // - Per minute: ৳2/min
    // - Total passenger fare (split among passengers)
    const totalFare = ride.totalFare;
    
    // Platform commission: 20%
    const commission = totalFare * 0.20;
    
    // Driver earnings: 80%
    const netEarnings = totalFare - commission;
    
    // Add bonuses
    const bonus = await this.calculateBonus(ride.driver_id);
    
    return {
      baseFare: ride.baseFare,
      distanceFare: ride.distanceFare,
      timeFare: ride.timeFare,
      tips: ride.tips || 0,
      bonus: bonus,
      platformCommission: commission,
      netEarnings: netEarnings + bonus
    };
  }
  
  // Calculate daily bonus
  async calculateBonus(driverId: string): Promise<number> {
    const today = new Date().toDateString();
    const todayRides = await this.getTodayRideCount(driverId);
    
    // Bonus: ৳100 for every 3 rides completed in a day
    const bonusSets = Math.floor(todayRides / 3);
    return bonusSets * 100;
  }
  
  // Get earnings summary
  async getEarningsSummary(driverId: string, period: 'today' | 'week' | 'month') {
    // Aggregate earnings for period
  }
  
  // Process payout
  async processPayout(driverId: string, amount: number) {
    // Transfer to driver's wallet or bank account
  }
}
```

#### 5.2 Update Payment Controller
**File:** `Server/src/controllers/payment.controller.ts` (EXTEND)

**New endpoints:**
```typescript
POST   /api/v1/payment/driver/payout-request
GET    /api/v1/payment/driver/pending-earnings
GET    /api/v1/payment/driver/payout-history
```

---

### Phase 6: Notification System (Week 3)
**Goal:** Real-time notifications between drivers and passengers

#### 6.1 Driver Notification Service
**File:** `Server/src/services/notification.service.ts` (EXTEND)

**New notification types:**
```typescript
enum DriverNotificationType {
  NEW_POOL_AVAILABLE = 'NEW_POOL_AVAILABLE',
  POOL_UPDATED = 'POOL_UPDATED',
  POOL_CANCELLED = 'POOL_CANCELLED',
  PASSENGER_ARRIVED = 'PASSENGER_ARRIVED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  BONUS_EARNED = 'BONUS_EARNED',
  RATING_RECEIVED = 'RATING_RECEIVED'
}

// Push notifications
async notifyDriverOfPool(driverId: string, pool: Pool) {
  // Send push notification with:
  // - Pool details (pickup, destination, passenger count)
  // - Estimated earnings
  // - Distance to pickup
  // - Accept/Reject buttons
}

async notifyPassengersDriverAssigned(poolId: string, driver: Driver) {
  // Notify all passengers:
  // - Driver name, photo, rating
  // - Vehicle details
  // - ETA to pickup
}

async notifyPassengerDriverArriving(passengerId: string, eta: number) {
  // "Your driver will arrive in 2 minutes"
}
```

#### 6.2 WebSocket Events for Real-time Updates
**File:** `Server/src/websocket/driver.ws.ts` (NEW)

```typescript
// Driver-side events
socket.on('driver:online', handleDriverOnline);
socket.on('driver:location', handleLocationUpdate);
socket.on('driver:accept_pool', handlePoolAccept);
socket.on('driver:pickup_complete', handlePickupComplete);
socket.on('driver:dropoff_complete', handleDropoffComplete);

// Passenger-side events (emitted to passengers)
socket.emit('passenger:driver_assigned', driverData);
socket.emit('passenger:driver_location', locationData);
socket.emit('passenger:driver_arriving', etaData);
socket.emit('passenger:ride_started', rideData);
```

---

### Phase 7: React Native DriverApp Integration (Week 4)
**Goal:** Connect the mobile app to the backend

#### 7.1 API Client Setup
**File:** `Client/DriverApp/src/services/api.ts` (NEW)

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api/v1';

export const driverApi = {
  // Authentication
  login: (credentials) => axios.post(`${API_BASE_URL}/auth/login`, credentials),
  
  // Driver Status
  goOnline: (location) => axios.post(`${API_BASE_URL}/driver/go-online`, location),
  goOffline: () => axios.post(`${API_BASE_URL}/driver/go-offline`),
  updateLocation: (location) => axios.put(`${API_BASE_URL}/driver/location`, location),
  
  // Pools
  getAvailablePools: () => axios.get(`${API_BASE_URL}/driver/available-pools`),
  acceptPool: (poolId) => axios.post(`${API_BASE_URL}/driver/pools/${poolId}/accept`),
  getActivePool: () => axios.get(`${API_BASE_URL}/driver/active-pool`),
  
  // Navigation
  getNavigationRoute: (poolId) => axios.get(`${API_BASE_URL}/driver/navigation/route`, { params: { poolId } }),
  markPickup: (passengerId) => axios.post(`${API_BASE_URL}/driver/pickup/${passengerId}`),
  markDropoff: (passengerId) => axios.post(`${API_BASE_URL}/driver/dropoff/${passengerId}`),
  
  // Ride
  startRide: (poolId) => axios.post(`${API_BASE_URL}/driver/ride/start`, { poolId }),
  completeRide: (poolId) => axios.post(`${API_BASE_URL}/driver/ride/complete`, { poolId }),
  
  // Earnings
  getTodayEarnings: () => axios.get(`${API_BASE_URL}/driver/earnings/today`),
  getEarningsHistory: (params) => axios.get(`${API_BASE_URL}/driver/earnings/history`, { params }),
  getStats: () => axios.get(`${API_BASE_URL}/driver/stats`)
};
```

#### 7.2 MapBox React Native Setup
**Install dependencies:**
```bash
cd Client/DriverApp
npm install @rnmapbox/maps
```

**Configure MapBox:**
```typescript
// Client/DriverApp/app.json
{
  "expo": {
    "plugins": [
      [
        "@rnmapbox/maps",
        {
          "RNMapboxMapsDownloadToken": "YOUR_MAPBOX_DOWNLOAD_TOKEN"
        }
      ]
    ]
  }
}
```

**Create MapBox Map Component:**
```typescript
// Client/DriverApp/src/components/map/MapboxMapView.native.tsx
import Mapbox from '@rnmapbox/maps';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

export function MapboxMapView({ route, driverLocation, passengers }) {
  return (
    <Mapbox.MapView style={{ flex: 1 }}>
      {/* Driver marker */}
      <Mapbox.PointAnnotation
        id="driver"
        coordinate={[driverLocation.lng, driverLocation.lat]}
      />
      
      {/* Route polyline */}
      <Mapbox.ShapeSource id="route" shape={route.geometry}>
        <Mapbox.LineLayer id="routeLine" style={{ lineColor: '#007AFF' }} />
      </Mapbox.ShapeSource>
      
      {/* Passenger markers */}
      {passengers.map(p => (
        <Mapbox.PointAnnotation
          key={p.id}
          id={p.id}
          coordinate={[p.location.lng, p.location.lat]}
        />
      ))}
    </Mapbox.MapView>
  );
}
```

#### 7.3 Location Tracking Hook
```typescript
// Client/DriverApp/src/hooks/useLocationTracking.ts
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export function useLocationTracking(isOnline: boolean) {
  const [location, setLocation] = useState(null);
  
  useEffect(() => {
    if (!isOnline) return;
    
    // Request permissions
    Location.requestForegroundPermissionsAsync();
    
    // Start watching location
    const subscription = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // 5 seconds
        distanceInterval: 10 // 10 meters
      },
      (newLocation) => {
        setLocation(newLocation.coords);
        // Send to backend
        driverApi.updateLocation({
          lat: newLocation.coords.latitude,
          lng: newLocation.coords.longitude,
          heading: newLocation.coords.heading,
          speed: newLocation.coords.speed
        });
      }
    );
    
    return () => subscription.then(sub => sub.remove());
  }, [isOnline]);
  
  return location;
}
```

---

## 🔄 Complete Flow: Passenger Pool to Driver

### Step-by-Step Flow:

```
PASSENGER SIDE (CarPoolApp)
1. Passenger opens app, searches for ride
2. App calls: POST /api/v1/pool/create
   - Backend creates pool with status: WAITING
   - Starts 3-minute lookup timer

3. Other passengers join pool
4. App calls: POST /api/v1/pool/:poolId/join
   - Pool now has 2+ passengers

5. After 3 minutes (lookup time expires)
   - Backend changes pool status: WAITING → MATCHING
   - Backend calls: findAvailableDrivers(poolId)

DRIVER SIDE (DriverApp)
6. Driver is online, location tracked
   - App continuously sends: PUT /api/v1/driver/location

7. Backend finds driver within 5km
   - Backend calls: notifyDriversOfPool(poolId)
   - Push notification sent to driver app
   - Pool status: MATCHING → DRIVER_NOTIFIED

8. Driver sees notification, taps to view pool details
   - App calls: GET /api/v1/driver/available-pools
   - Shows: pickup location, passenger count, earnings

9. Driver accepts pool
   - App calls: POST /api/v1/driver/pools/:poolId/accept
   - Backend assigns driver to pool
   - Pool status: DRIVER_NOTIFIED → DRIVER_ASSIGNED
   - Passengers notified: "Driver assigned!"

10. Driver navigates to first pickup
    - App calls: GET /api/v1/driver/navigation/route
    - Backend returns MapBox route with waypoints
    - Pool status: DRIVER_ASSIGNED → EN_ROUTE

11. Driver arrives at pickup, picks up passenger
    - App calls: POST /api/v1/driver/pickup/:passengerId
    - Pool status: EN_ROUTE → PICKING_UP (or IN_PROGRESS if all picked up)

12. Driver picks up all passengers
    - Pool status: PICKING_UP → IN_PROGRESS

13. Driver drops off passengers
    - App calls: POST /api/v1/driver/dropoff/:passengerId

14. All passengers dropped off
    - App calls: POST /api/v1/driver/ride/complete
    - Pool status: IN_PROGRESS → COMPLETED
    - Backend calculates earnings
    - Backend processes payments
    - Both sides prompted to rate each other
```

---

## 📊 Database Relationships

```
users (is_driver=true)
  ↓ has_one
vehicles
  ↓ has_many
vehicle_locations (real-time tracking)

users (driver)
  ↓ has_many
driver_sessions
  ↓ has_many
pools (assigned as driver_id)
  ↓ has_many
pool_members (passengers)
  ↓ has_one
rides
  ↓ has_one
payments (split: passengers pay, driver receives)
  ↓ has_one
driver_earnings (driver's cut after commission)
```

---

## 🔐 Security Considerations

### 1. API Authentication
- All driver endpoints require JWT token
- Token payload includes `userId` and `isDriver` flag
- Middleware validates driver role:
```typescript
// Server/src/middleware/auth.ts
export const requireDriver = async (req, res, next) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user.is_driver) {
    return res.status(403).json({ error: 'Driver access required' });
  }
  next();
};
```

### 2. Location Privacy
- Only share driver location with passengers in active pool
- Passenger locations hidden from drivers until pool accepted
- Use WebSocket rooms for location broadcasting

### 3. Payment Security
- Driver can't modify earnings
- All calculations done server-side
- Commission deducted before payout
- Audit trail for all transactions

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Server/tests/unit/driver.service.test.ts
describe('DriverService', () => {
  test('findAvailableDrivers returns drivers within radius', async () => {
    // Test driver discovery
  });
  
  test('calculateEarnings applies correct commission', async () => {
    // Test earnings calculation
  });
});
```

### Integration Tests
```typescript
// Server/tests/integration/driver-pool-flow.test.ts
describe('Driver-Pool Flow', () => {
  test('complete flow: pool creation to driver assignment', async () => {
    // 1. Create pool (passenger)
    // 2. Add passengers
    // 3. Driver goes online
    // 4. Driver accepts pool
    // 5. Verify pool status changes
  });
});
```

### End-to-End Tests
- Test actual driver app connecting to backend
- Simulate GPS location updates
- Test MapBox route rendering
- Test real-time WebSocket updates

---

## 📈 Performance Optimization

### 1. Database Indexing
```sql
-- Critical indexes for driver queries
CREATE INDEX idx_users_driver_online ON users(is_driver, id) WHERE is_driver = true;
CREATE INDEX idx_pools_status_location ON pools(status, pickup_location) USING GIST;
CREATE INDEX idx_vehicle_loc_driver_time ON vehicle_locations(driver_id, timestamp DESC);
```

### 2. Caching Strategy
```typescript
// Use Redis for:
- Active driver locations (5-second TTL)
- Pool availability cache (30-second TTL)
- Driver earnings cache (5-minute TTL)
```

### 3. WebSocket Connection Management
- Connection pooling for drivers
- Automatic reconnection on disconnect
- Heartbeat pings every 30 seconds

---

## 📝 Environment Variables Checklist

**Add to `Server/.env`:**
```env
# MapBox
MAPBOX_ACCESS_TOKEN=pk.eyJ1...your_token
MAPBOX_STYLE_URL=mapbox://styles/mapbox/streets-v11
MAPBOX_ROUTING_PROFILE=mapbox/driving-traffic

# Driver Config
DRIVER_SEARCH_RADIUS_KM=5
POOL_ACCEPTANCE_TIMEOUT_SEC=30
DRIVER_COMMISSION_RATE=0.20

# Bonus Config
RIDES_FOR_BONUS=3
BONUS_AMOUNT_BDT=100
```

**Add to `Client/DriverApp/.env`:**
```env
API_BASE_URL=http://localhost:4000/api/v1
MAPBOX_ACCESS_TOKEN=pk.eyJ1...your_token
WS_URL=ws://localhost:4000
```

---

## 🚀 Deployment Checklist

### Backend
- [ ] Add MapBox API key to production env
- [ ] Run database migrations for new tables
- [ ] Deploy updated server to production
- [ ] Test WebSocket connections in production
- [ ] Enable Redis for caching
- [ ] Set up monitoring for driver endpoints

### Mobile App
- [ ] Configure MapBox in app.json
- [ ] Build production APK/IPA
- [ ] Test background location tracking
- [ ] Submit to Google Play / App Store
- [ ] Enable push notifications

---

## 📋 API Endpoints Summary

### Driver Endpoints (NEW)
```
Status Management:
POST   /api/v1/driver/go-online
POST   /api/v1/driver/go-offline
PUT    /api/v1/driver/location

Pool Management:
GET    /api/v1/driver/available-pools
POST   /api/v1/driver/pools/:poolId/accept
GET    /api/v1/driver/active-pool

Navigation:
GET    /api/v1/driver/navigation/route
POST   /api/v1/driver/pickup/:passengerId
POST   /api/v1/driver/dropoff/:passengerId

Ride Management:
POST   /api/v1/driver/ride/start
POST   /api/v1/driver/ride/complete

Earnings:
GET    /api/v1/driver/earnings/today
GET    /api/v1/driver/earnings/history
GET    /api/v1/driver/stats

Priority Location:
POST   /api/v1/driver/priority-location
GET    /api/v1/driver/priority-location
DELETE /api/v1/driver/priority-location
```

### Passenger Endpoints (EXISTING)
```
Pool Management:
POST   /api/v1/pool/create
POST   /api/v1/pool/:poolId/join
GET    /api/v1/pool/:poolId

Ride Management:
GET    /api/v1/ride/active
GET    /api/v1/ride/history

Payment:
POST   /api/v1/payment/charge
GET    /api/v1/payment/history
```

---

## 🎯 Success Metrics

### Technical Metrics
- API response time < 200ms
- WebSocket latency < 100ms
- Location update frequency: every 5 seconds
- Driver-pool matching time < 30 seconds
- App crash rate < 1%

### Business Metrics
- Driver acceptance rate > 80%
- Average time to driver assignment < 2 minutes
- Successful ride completion rate > 95%
- Driver satisfaction rating > 4.5/5
- Earnings calculation accuracy: 100%

---

## 🔮 Future Enhancements

### Phase 8: Advanced Features (Post-MVP)
1. **Heat Maps** - Show high-demand areas to drivers
2. **Shift Scheduling** - Drivers can schedule online hours
3. **Earnings Goals** - Set daily/weekly earning targets
4. **Driver Ratings Analysis** - Detailed feedback breakdown
5. **Fuel Cost Tracking** - Track expenses
6. **Multi-Language Support** - Bengali + English
7. **Offline Mode** - Cache data for poor connectivity
8. **Voice Navigation** - Turn-by-turn voice guidance
9. **Driver Community** - In-app driver forum
10. **AI Route Optimization** - ML-based route suggestions

---

## 📞 Support & Maintenance

### Monitoring
- Set up error tracking (Sentry)
- Monitor API response times (New Relic)
- Track WebSocket connection health
- Monitor MapBox API usage/costs

### Logging
```typescript
// Enhanced logging for driver actions
logger.info('Driver went online', { driverId, location });
logger.info('Pool accepted', { driverId, poolId, earnings });
logger.info('Ride completed', { driverId, poolId, duration, earnings });
logger.error('Driver assignment failed', { poolId, reason });
```

---

## ✅ Implementation Timeline

**Week 1:** MapBox + Location Services + Core Driver APIs  
**Week 2:** Pool Assignment + Database Updates + Driver-Passenger Matching  
**Week 3:** Payment/Earnings + Notifications + WebSocket Real-time  
**Week 4:** React Native Integration + Testing + Bug Fixes  

**Total:** 4 weeks to full MVP

---

## 🎓 Key Takeaways

1. **Single Unified Backend** - One server handles both apps
2. **Shared Database** - Drivers and passengers use same schema
3. **MapBox for Navigation** - Professional-grade routing and maps
4. **Real-time with WebSockets** - Location tracking and notifications
5. **Fair Earnings Split** - 80% driver, 20% platform
6. **MVC Architecture** - Clean separation of concerns
7. **Supabase Native** - Leverage existing infrastructure

---

**Implementation Priority:** Start with Phase 1 (MapBox) and Phase 2 (Driver APIs) in parallel. This gives you immediate functionality while building out the complete system.

**Need clarification on any section? Let me know!** 🚀
