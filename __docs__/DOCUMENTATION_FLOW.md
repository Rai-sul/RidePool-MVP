# RidePool — Complete Documentation & Flow Reference

**Last Updated**: 2026-05-31  
**Version**: 1.1  
**Status**: Active Development (MVP)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Authentication Flow](#6-authentication-flow)
7. [Passenger Flow (CarPoolApp)](#7-passenger-flow-carpoolapp)
8. [Driver Flow (DriverApp)](#8-driver-flow-driverapp)
9. [Pool Lifecycle](#9-pool-lifecycle)
10. [Real-Time System](#10-real-time-system)
11. [Fare Calculation](#11-fare-calculation)
12. [Pool Matching Algorithm (H3)](#12-pool-matching-algorithm-h3)
13. [Payment & Wallet System](#13-payment--wallet-system)
14. [Messaging System](#14-messaging-system)
15. [Safety & Emergency Features](#15-safety--emergency-features)
16. [Priyo Sathi (Travel with Friends)](#16-priyo-sathi-travel-with-friends)
17. [Rating System](#17-rating-system)
18. [Navigation & Routing](#18-navigation--routing)
19. [API Reference](#19-api-reference)
20. [Middleware Stack](#20-middleware-stack)
21. [State Management](#21-state-management)
22. [Error Handling Patterns](#22-error-handling-patterns)
23. [Environment Configuration](#23-environment-configuration)
24. [Build, Test & Deploy](#24-build-test--deploy)
25. [Detailed File-to-File Data Flow Traces](#25-detailed-file-to-file-data-flow-traces)

---

## 1. Project Overview

RidePool is a carpooling platform built for Bangladesh (Dhaka). Passengers create or join shared ride pools, a driver accepts the pool, and everyone shares the ride. The platform uses **H3 hexagonal grid indexing** for geospatial pool matching, **Supabase** for the database and real-time subscriptions, and **Expo/React Native** for cross-platform mobile apps.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Pool** | A shared ride group. 1–4 passengers heading in the same direction. |
| **Ride** | An individual passenger's trip request (pickup → dropoff). Linked to a pool. |
| **Pool Member** | A passenger who has joined a pool. Tracked in `pool_members`. |
| **Driver** | Accepts a pool and picks up/drops off all passengers along the optimized route. |
| **H3 Index** | Uber's hexagonal grid system used to match nearby pickups and destinations. |
| **Priyo Sathi** | "Close companion" — a social feature to ride with friends. |

### Currency & Locale

- Currency: **BDT (Bangladeshi Taka)**
- Payment methods: Wallet, Cash, Card, Mobile Banking (wallet top-ups support bKash, Nagad, Rocket)
- Routing provider: Google Maps Directions API + Google Maps app deep links (client maps via react-native-maps and Leaflet; Mapbox token optional for tiles)
- Language: English (default), Bangla (i18n support)

---

## 2. Architecture

### High-Level Diagram

```
┌─────────────────────┐    ┌─────────────────────┐
│    CarPoolApp        │    │     DriverApp        │
│  (Expo 54 / RN 0.81)│    │  (Expo 54 / RN 0.81)│
│  Passenger App       │    │  Driver App          │
└────────┬────────────┘    └────────┬────────────┘
         │                          │
         │  HTTPS / REST API        │
         │  Supabase Realtime (client) │
         ▼                          ▼
┌─────────────────────────────────────────────────┐
│              Server (Express 5 / Node 20)       │
│                                                 │
│  Routes → Controllers → Services → Supabase     │
│                                                 │
│  ┌─────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Auth MW  │  │ Validation│  │ Rate Limiting│  │
│  │ (JWT)    │  │ (Zod v4)  │  │              │  │
│  └─────────┘  └───────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
┌──────────────┐ ┌────────┐ ┌──────────┐
│  Supabase    │ │ Redis  │ │ Google   │
│  (PostgreSQL │ │ /In-   │ │ Maps API │
│  + Realtime) │ │ Memory │ │ + Deep   │
│              │ │        │ │ Links   │
└──────────────┘ └────────┘ └──────────┘
```

### Server Layered Architecture

```
Request Flow:

  HTTP Request
       │
       ▼
  ┌─────────────────┐
  │   Middleware     │  Security headers, rate limiting, input sanitization,
  │                  │  authentication (JWT via Supabase Auth)
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │   Routes         │  HTTP route definitions, apply middleware per endpoint
  │   (src/routes/)  │
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │   Controllers    │  Parse request, validate input, call services,
  │   (src/controllers/)│  format response. AuthRequest type. No business logic.
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │   Services       │  Business logic. No HTTP/req objects.
  │   (src/services/)│  Call Supabase, Google Maps, payment gateways.
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │   Supabase       │  PostgreSQL + PostGIS + RLS + Realtime
  │   (Database)     │
  └─────────────────┘
```

### Monorepo Layout

```
Carpool-dev/
├── Server/                 # Express 5 API server
├── Client/
│   ├── CarPoolApp/         # Passenger Expo app
│   └── DriverApp/          # Driver Expo app
├── shared/                 # @ridepool/shared-types (TypeScript interfaces)
├── __docs__/               # Documentation
├── app.json                # Root Expo config
└── eas.json                # EAS Build config
```

> **No root workspace.** Each package has its own `package.json` and `node_modules`. Install dependencies independently in each directory.

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Server Runtime** | Node.js | 20.x |
| **Server Framework** | Express | 5.1.x |
| **Language** | TypeScript (CommonJS on server) | 5.9.x |
| **Database** | PostgreSQL (via Supabase) | 15.x |
| **Spatial Extension** | PostGIS | — |
| **Real-time** | Supabase Realtime (client) + polling fallback | — |
| **Cache** | Redis / In-memory (MVP mode) | — |
| **Validation** | Zod 4.3.x (server), Zod 3.24.x (DriverApp) | — |
| **Mobile Framework** | React Native | 0.81.5 |
| **Mobile Toolkit** | Expo | 54.0.x |
| **Navigation** | Expo Router (file-based) | 6.x |
| **React** | React 19.1 | — |
| **Styling** | NativeWind (Tailwind CSS for RN) | — |
| **State Management** | Zustand + React Context | — |
| **Maps (Web)** | Leaflet / react-leaflet | — |
| **Maps (Native)** | react-native-maps | — |
| **Geospatial Indexing** | Uber H3 | — |
| **Testing** | Vitest 4.x (server), Jest 29/30 (client) | — |
| **CI/CD** | GitHub Actions | — |

---

## 4. Project Structure

### Server (`Server/`)

```
Server/
├── src/
│   ├── app.ts                    # Express app setup, middleware, route mounting
│   ├── config/
│   │   └── env.ts                # Centralized env config (config.mvpMode, etc.)
│   ├── routes/
│   │   ├── index.ts              # Route aggregator (mounts all routes at /api)
│   │   ├── auth.routes.ts        # /api/auth/*
│   │   ├── pool.routes.ts        # /api/pools/*
│   │   ├── ride.routes.ts        # /api/rides/*
│   │   ├── driver.routes.ts      # /api/driver/*
│   │   ├── payment.routes.ts     # /api/payments/*
│   │   ├── user.routes.ts        # /api/users/*
│   │   ├── wallet.routes.ts      # /api/wallet/*
│   │   ├── rating.routes.ts      # /api/ratings/*
│   │   ├── messaging.routes.ts   # /api/messages/*
│   │   ├── safety.routes.ts      # /api/safety/*
│   │   ├── priyoSathi.routes.ts  # /api/priyo-sathi/*
│   │   ├── analytics.routes.ts   # /api/analytics/*
│   │   ├── heatmap.routes.ts     # /api/heatmap/*
│   │   ├── shift.routes.ts       # /api/shifts/*
│   │   ├── navigation.routes.ts  # /api/navigation/*
│   │   ├── offline.routes.ts     # /api/offline/*
│   │   ├── i18n.routes.ts        # /api/i18n/*
│   │   ├── savedPlaces.routes.ts # /api/saved-places/*
│   │   ├── emergencyContacts.routes.ts  # /api/emergency-contacts/*
│   │   ├── promo.routes.ts       # /api/promos/*
│   │   └── rideSharing.routes.ts # /api/sharing/*
│   ├── controllers/              # 23 controller files
│   ├── services/                 # 41 service files
│   ├── middleware/
│   │   ├── auth.ts               # authenticate, optionalAuth, AuthRequest
│   │   ├── authorization.ts      # checkResourceOwnership, checkPoolAccess
│   │   ├── rateLimiter.ts        # apiLimiter, authLimiter, searchLimiter, etc.
│   │   ├── validation.ts         # Zod schemas + validate() middleware
│   │   ├── inputSanitizer.ts     # XSS/injection prevention
│   │   ├── securityHeaders.ts    # CORS, Helmet, security headers
│   │   ├── errorHandler.ts       # Global error handler
│   │   └── auditMiddleware.ts    # Request auditing
│   └── utils/
│       └── h3.utils.ts           # H3 hex conversion utilities
├── supabase/
│   └── migrations/               # SQL migration files
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── docker-compose.yml
└── docker-compose.mvp.yml
```

### CarPoolApp (`Client/CarPoolApp/`)

```
CarPoolApp/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout, Stack navigator, error boundaries
│   ├── (tabs)/                   # Tab navigator screens
│   ├── home.tsx                  # Home/landing page
│   ├── login.tsx                 # Login screen
│   ├── profile-setup.tsx         # First-time profile setup
│   ├── ride-confirmation.tsx     # Destination selection & ride type
│   ├── searching.tsx             # Pool search animation
│   ├── trip-progress.tsx         # Active trip tracking
│   ├── payment-summary.tsx       # Post-trip payment
│   ├── wallet.tsx                # Wallet management
│   ├── chat.tsx                  # Co-rider chat
│   ├── driver-chat.tsx           # Driver chat
│   └── ...                       # 30+ screen files
├── components/
│   ├── TripProgress.native.tsx   # Main trip tracking UI (~1200 lines)
│   ├── ActiveTripButton.tsx      # Floating "active trip" FAB
│   ├── GoogleMapView.native.tsx  # Native map component
│   ├── BottomNav.native.tsx      # Bottom navigation bar
│   ├── RideConfirmation.native.tsx
│   ├── SearchingDriver.native.tsx
│   └── ...                       # Platform-specific (.native/.web) components
├── hooks/
│   ├── usePoolRealtime.ts        # Real-time pool updates (core hook)
│   ├── useChatRealtime.ts        # Real-time chat messages
│   ├── useAuth.ts                # Auth utilities
│   ├── useLocation.ts            # GPS location tracking
│   ├── usePools.ts               # Pool CRUD operations
│   └── useRides.ts               # Ride operations
├── services/
│   ├── pool.service.ts           # Pool API calls
│   ├── ride.service.ts           # Ride API calls
│   ├── auth.service.ts           # Auth API calls
│   ├── payment.service.ts        # Payment API calls
│   ├── messaging.service.ts      # Chat API calls
│   └── ...
├── contexts/
│   ├── AuthContext.tsx            # Authentication state
│   ├── GlobalContext.tsx          # App-wide state (activeTrip, selectedPool)
│   └── NotificationContext.tsx    # Push notifications
├── store/
│   └── useAppStore.ts            # Zustand store
├── lib/
│   └── supabase.ts               # Supabase client instance
├── utils/
│   └── apiClient.ts              # HTTP client (30s timeout, 3 retries)
└── patches/                      # patch-package patches for @react-navigation
```

### DriverApp (`Client/DriverApp/`)

```
DriverApp/
├── app/
│   ├── _layout.tsx               # Root layout
│   ├── index.tsx                 # Login screen
│   ├── register.tsx              # Driver registration
│   ├── trip-progress.tsx         # Active trip (uses poolId from store)
│   ├── settings.tsx
│   └── (tabs)/
│       ├── home.tsx              # Home + pool discovery + accept/reject
│       ├── earnings.tsx          # Earnings dashboard
│       └── profile.tsx           # Driver profile
├── src/
│   ├── components/
│   │   ├── pool/
│   │   │   ├── TripProgress.native.tsx  # Driver trip tracking UI
│   │   │   ├── PassengerBillingDialog.native.tsx
│   │   │   └── PoolDetailsSheet.native.tsx
│   │   ├── home/
│   │   │   ├── HomeScreen.native.tsx    # Pool request cards
│   │   │   └── PoolRequestAlert.native.tsx
│   │   └── driver/
│   │       └── AppHeader.native.tsx     # Online/offline toggle
│   ├── hooks/
│   │   └── usePoolRealtime.ts           # Driver-side real-time pool updates
│   ├── services/
│   │   ├── driver.service.ts            # Driver API calls
│   │   ├── auth.service.ts
│   │   └── location.service.ts          # GPS tracking
│   ├── store/
│   │   └── useDriverStore.ts            # Zustand store (activePool, isOnline)
│   └── contexts/
│       └── ThemeContext.tsx
```

### Shared Types (`shared/`)

```
shared/
├── src/
│   ├── index.ts          # Re-exports all types
│   ├── api.ts            # ApiResponse, PaginatedResponse
│   ├── user.ts           # User, AuthSession, LoginRequest, RegisterRequest
│   ├── ride.ts           # Ride, Pool, PoolMember, CreatePoolRequest, etc.
│   ├── driver.ts         # Vehicle, Driver, DriverStats, GoOnlineRequest
│   ├── payment.ts        # Wallet, Payment, WalletTransaction
│   ├── messaging.ts      # Message, Conversation, SendMessageRequest
│   ├── safety.ts         # SafetyIncident, EmergencyContact
│   └── misc.ts           # Rating, PriyoSathi, SavedPlace, PromoCode
└── dist/                 # Compiled output
```

---

## 5. Database Schema

**Engine**: PostgreSQL 15 via Supabase  
**Extensions**: PostGIS (geospatial), pgcrypto (UUIDs)  
**RLS**: Enabled (Row Level Security)  
**Realtime**: Enabled on `pools`, `pool_members`, `messages` tables  
**Migrations**: `Server/supabase/migrations/`

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User profiles | `id`, `full_name`, `email`, `phone`, `gender`, `average_rating` |
| `rides` | Individual ride requests | `id`, `user_id`, `pool_id`, `status`, `pickup_lat/lng`, `dropoff_lat/lng`, `pickup_h3_index`, `dropoff_h3_index`, `fare` |
| `pools` | Shared ride groups | `id`, `driver_id`, `vehicle_id`, `status`, `destination_lat/lng`, `destination_h3_index`, `pickup_h3_index`, `current_passengers`, `max_passengers`, `fare_per_person`, `vehicle_type` |
| `pool_members` | Pool membership | `id`, `pool_id`, `user_id`, `ride_id`, `join_type`, `join_score`, `joined_at`, `left_at` |
| `vehicles` | Driver vehicles | `id`, `user_id`, `vehicle_number`, `model`, `color`, `vehicle_type` |
| `vehicle_locations` | Live driver positions | `id`, `vehicle_id`, `user_id`, `latitude`, `longitude`, `h3_index`, `is_active`, `is_available`, `pool_id` |
| `driver_sessions` | Online/offline status | `id`, `user_id`, `vehicle_id`, `status` (ONLINE/OFFLINE/BUSY) |
| `driver_earnings` | Per-trip earnings | `pool_id`, `driver_id`, `total_fare`, `platform_commission`, `driver_earnings` |

### Financial Tables

| Table | Purpose |
|-------|---------|
| `payments` | Payment records per ride |
| `wallets` | User wallet balance |
| `wallet_transactions` | Credit/debit/refund history |

### Social & Safety Tables

| Table | Purpose |
|-------|---------|
| `messages` | Chat messages between users |
| `conversations` | Chat conversation threads |
| `ratings` | Post-trip ratings and reviews |
| `emergency_contacts` | User emergency contacts |
| `safety_incidents` | SOS reports |
| `ride_sharing` | Live trip sharing links |
| `priyo_sathis` | Friend/companion relationships |
| `saved_places` | User's saved locations (home, work) |
| `notifications` | Push notification records |

### Pool Status Values

```
WAITING_FOR_RIDERS  →  WAITING_FOR_DRIVER  →  READY_TO_START  →  STARTED  →  COMPLETED
                                                                            ↘ CANCELLED
```

### Ride Status Values

```
CREATING_POOL  →  WAITING_FOR_POOL  →  MATCHED  →  STARTED  →  COMPLETED
                                                              ↘ CANCELLED
```

---

## 6. Authentication Flow

### Technology

- **Provider**: Supabase Auth (email/password + Google OAuth)
- **Token**: JWT Bearer token in `Authorization` header
- **Server validation**: `supabase.auth.getUser(token)` in `authenticate` middleware
- **Client storage**: Token + user profile cached in AsyncStorage

### Login Flow

```
┌──────────────┐     POST /api/auth/login      ┌──────────────┐
│  CarPoolApp   │  ────────────────────────────▶│    Server     │
│              │     { email, password }        │              │
│              │                                │  supabase.    │
│              │     { token, user }            │  auth.sign    │
│              │  ◀────────────────────────────│  InWith()     │
│              │                                │              │
│  Store token │                                │              │
│  in Async    │                                │              │
│  Storage     │                                │              │
└──────────────┘                                └──────────────┘
```

### Auto-Login on App Restart (CarPoolApp)

1. `AuthContext.useEffect` runs on mount
2. Reads cached user from AsyncStorage → sets `user` state immediately (instant UX)
3. Background: calls `authService.getCurrentUser()` (GET `/api/auth/me`)
4. If **401/UNAUTHORIZED**: clears auth, redirects to login
5. If **network error**: keeps cached user (offline resilience)
6. If **success**: updates user profile with fresh data

### Request Authentication

Every authenticated API call:
1. Client sends `Authorization: Bearer <token>` header
2. `authenticate` middleware extracts token
3. Calls `supabase.auth.getUser(token)` to validate
4. Attaches `req.user = { id, email, ... }` to request
5. Controller accesses user via `req.user?.id`

### AuthRequest Type

```typescript
interface AuthRequest extends Request {
  user?: { id: string; email?: string; ... };
}
```

---

## 7. Passenger Flow (CarPoolApp)

### Complete User Journey

```
Login/Register
     │
     ▼
Home Screen (Map + Pickup Selection)
     │
     ▼
Destination Selection + Ride Type (Regular / Female-Only)
     │
     ├── Search for existing pools (GET /api/pools/search)
     │       │
     │       ├── Match found → Preview pool → Join Pool (POST /api/pools/:id/join)
     │       │
     │       └── No match → Create New Pool (POST /api/pools/create)
     │
     ▼
Searching Screen (30s initial + 10s extended timer)
     │
     ├── 2+ passengers joined → Status: WAITING_FOR_DRIVER
     │
     ▼
Trip Progress Page (usePoolRealtime hook)
     │
     ├── Driver accepts → Status: READY_TO_START
     ├── Driver starts ride → Status: STARTED
     ├── Driver picks up passenger
     ├── Driver drops off passenger
     │
     ▼
Trip Completed → Payment Summary → Rate Driver
```

### Screen → File Mapping

| Step | Screen | Route File | Component File |
|------|--------|-----------|----------------|
| Login | Login | `app/login.tsx` | `LandingPage.native.tsx` |
| Home | Home Map | `app/home.tsx` | `HomeMap.native.tsx` |
| Destination | Ride Confirmation | `app/ride-confirmation.tsx` | `RideConfirmation.native.tsx` |
| Search | Searching | `app/searching.tsx` | `SearchingDriver.native.tsx` |
| Trip | Trip Progress | `app/trip-progress.tsx` | `TripProgress.native.tsx` |
| Payment | Payment Summary | `app/payment-summary.tsx` | `PaymentSummary.native.tsx` |

### Active Trip Persistence

When a passenger creates/joins a pool, `GlobalContext.startTrip()` saves the trip to **AsyncStorage**:

```typescript
ActiveTripState = {
  poolId: string;
  pool: Pool;               // Full pool data
  pickupLocation: Location;
  destination: Destination;
  rideType: 'female-only' | 'regular';
  status: 'searching' | 'waiting' | 'in_progress' | 'completed';
}
```

On app restart:
1. Reads `ActiveTripState` from AsyncStorage
2. Validates pool still exists via `GET /api/pools/:poolId`
3. **Uses fresh API data** (not stale stored copy) to set `selectedPool`
4. Navigates to `trip-progress` if trip is active

### ActiveTripButton (Floating Action Button)

- Rendered in `_layout.tsx` as an overlay above all screens
- Shows when `isAuthenticated && hasActiveTrip`
- Displays: pool status, passenger count, destination
- Tap → navigates to `/trip-progress`
- Auto-clears when pool status is `COMPLETED`

---

## 8. Driver Flow (DriverApp)

### Complete Driver Journey

```
Login/Register + Vehicle Registration
     │
     ▼
Home Screen (Map + Online/Offline Toggle)
     │
     ├── Go Online (POST /api/driver/go-online)
     │       └── Server: creates driver_session, vehicle_location record
     │
     ▼
Available Pools List (GET /api/driver/available-pools)
     │
     ├── Pool Request Alert (30s auto-dismiss)
     │
     ▼
Accept Pool (POST /api/driver/pools/:id/accept)
     │
     ├── Server: atomic_accept_pool RPC
     │   └── Sets driver_id, status → READY_TO_START
     │
     ▼
Trip Progress Page (usePoolRealtime hook)
     │
     ├── Start Ride (POST /api/driver/ride/start)
     │   └── Status → STARTED
     │
     ├── For each passenger:
     │   ├── Navigate to pickup
     │   ├── Mark Pickup (POST /api/driver/pickup/:passengerId)
     │   ├── Navigate to dropoff
     │   └── Mark Dropoff (POST /api/driver/dropoff/:passengerId)
     │
     ▼
Complete Ride (POST /api/driver/ride/complete)
     │
     ├── Server calculates earnings
     ├── Driver earnings = totalFare - 20% commission
     │
     ▼
Earnings Dashboard
```

### Screen → File Mapping

| Step | Screen | Route File | Component File |
|------|--------|-----------|----------------|
| Login | Login | `app/index.tsx` | `LoginScreen.native.tsx` |
| Register | Registration | `app/register.tsx` | `RegisterScreen.native.tsx` |
| Home | Pool Discovery | `app/(tabs)/home.tsx` | `HomeScreen.native.tsx` |
| Pool Alert | Accept/Reject | — | `PoolRequestAlert.native.tsx` |
| Trip | Trip Progress | `app/trip-progress.tsx` | `TripProgress.native.tsx` |
| Dropoff | Billing Dialog | — | `PassengerBillingDialog.native.tsx` |
| Earnings | Earnings | `app/(tabs)/earnings.tsx` | `EarningsScreen.native.tsx` |

### Driver State (Zustand Store)

```typescript
// useDriverStore.ts
{
  isOnline: boolean;
  activePool: Pool | null;
  currentLocation: { latitude, longitude } | null;
  availablePools: Pool[];
  setActivePool: (pool) => void;
  setIsOnline: (online) => void;
}
```

---

## 9. Pool Lifecycle

### State Machine

```
                          ┌────────────────────┐
                          │  WAITING_FOR_RIDERS │  Pool created, searching for co-riders
                          │  (30s + 10s timer)  │
                          └────────┬───────────┘
                                   │
                          2+ passengers joined
                          OR timer expired with 2+
                                   │
                                   ▼
                          ┌────────────────────┐
                          │ WAITING_FOR_DRIVER  │  Enough passengers, waiting for driver
                          └────────┬───────────┘
                                   │
                          Driver calls acceptPool
                          (atomic_accept_pool RPC)
                                   │
                                   ▼
                          ┌────────────────────┐
                          │   READY_TO_START    │  Driver assigned, heading to pickups
                          └────────┬───────────┘
                                   │
                          Driver calls startRide
                                   │
                                   ▼
                          ┌────────────────────┐
                          │     STARTED         │  Trip in progress (pickups → dropoffs)
                          └────────┬───────────┘
                                   │
                          All passengers dropped off,
                          Driver calls completeRide
                                   │
                                   ▼
                          ┌────────────────────┐
                          │    COMPLETED        │  Trip finished, earnings calculated
                          └────────────────────┘

  At any point before STARTED:
  ┌────────────────────┐
  │    CANCELLED       │  Creator cancels, timer expires with <2, system cancel
  └────────────────────┘
```

### Pool Creation (Server-Side)

1. Validate user and check cooldown period
2. Convert pickup/dropoff coordinates to H3 hex indices
3. Get ride estimate (fare, distance, duration)
4. Insert `rides` record (status: `CREATING_POOL`)
5. Insert `pools` record (status: `WAITING_FOR_RIDERS`)
6. Insert `pool_members` record (join_type: `INITIAL`)
7. Start lookup timer (30s initial search window)
8. Return pool ID and search timing

### Pool Search & Join

1. Passenger submits pickup + dropoff + vehicle type
2. Server generates H3 indices for pickup (res 9) and destination (res 7)
3. Query `pools` table matching H3 indices, vehicle type, and capacity
4. Score each match (0–100) using distance, route overlap, hexagon matching
5. Return top 10 matches sorted by score
6. Passenger selects a pool → `joinPool` API call
7. Server: atomic insert into `pool_members`, increment `current_passengers`
8. Recalculate fare for all members based on new passenger count
9. Notify existing members of new rider

### Driver Acceptance (Atomic)

1. Driver calls `POST /api/driver/pools/:poolId/accept`
2. Server calls `atomic_accept_pool` PostgreSQL RPC function
3. RPC atomically:
   - Locks the pool row (prevents concurrent accepts)
   - Validates: no existing driver, ≥2 passengers
   - Sets `driver_id`, `vehicle_id`, `status = 'READY_TO_START'`
4. Server post-accept:
   - Updates driver session status → `BUSY`
   - Updates vehicle location: `pool_id = poolId`, `is_available = false`
   - Clears cached route (forces recalculation from driver's position)
5. Returns: passengers with pickup/dropoff details, navigation URL

---

## 10. Real-Time System

### Architecture

Two mechanisms work together:
1. **Supabase Realtime (client)**: WebSocket-based `postgres_changes` for chat/pool updates
2. **Polling Fallback**: Always-on polling safety net for realtime disconnects

### Passenger Hook (`usePoolRealtime.ts` — CarPoolApp)

```typescript
usePoolRealtime(poolId, currentUserId, initialPool?)
```

**Subscriptions:**
| Table | Events | Action |
|-------|--------|--------|
| `pools` | UPDATE | Full refetch from API (relation data not in realtime payload) |
| `pools` | DELETE | Set pool to null, show "cancelled" |
| `pool_members` | INSERT, UPDATE, DELETE | Full refetch from API |
| `messages` | INSERT | Increment unread count for sender |

**Polling:**
- **Fast**: 3s interval when realtime is disconnected
- **Slow**: 30s interval when realtime is connected (heartbeat)
- **Change detection**: Compares `status`, `driver_id`, `memberCount`, `updated_at`

**Key design decisions:**
- Realtime pool UPDATE triggers a **full API refetch** (not partial merge), because `payload.new` only contains raw column data without joined relations (driver name, vehicle info, member profiles)
- `loading` state only set to `true` on the **first fetch** — subsequent refreshes don't show loading spinners
- `initialPool` parameter allows the hook to start with real data immediately (no flash of stale defaults)

**Returns:**
```typescript
{
  pool, members, searchTiming, coRiders, hasDriver, poolStatus,
  loading, error, lastUpdated, isConnected, refresh, clearUnreadMessages
}
```

### Driver Hook (`usePoolRealtime.ts` — DriverApp)

```typescript
usePoolRealtime(poolId)
```

- Fetches via `driverService.getActivePool()` (different endpoint than passenger)
- Server returns `{ data: { active_pool: { id, status, passengers[], destination, vehicle, ... } } }`
- Same polling fallback strategy

### Important: Supabase Realtime Limitation

> **Realtime `payload.new` only contains raw column data — NO relation/join data.**
> The server does not host a custom WebSocket gateway; realtime is handled by Supabase channels in the clients.
> 
> When the `pools` table is updated (e.g., `driver_id` set), the realtime payload has `{ driver_id: 'xxx', status: 'READY_TO_START', ... }` but NOT the `driver` relation (full_name, average_rating) or `vehicles` relation. This is why we always do a **full API refetch** on realtime events instead of merging the partial payload.

---

## 11. Fare Calculation

### Base Rates

| Parameter | CAR | CNG |
|-----------|-----|-----|
| Base fare | ৳50 | ৳30 |
| Per km | ৳15 | ৳15 |
| Per minute | ৳2 | ৳2 |
| Platform surcharge | ৳10 | ৳10 |

### Pool Discounts

| Passengers | Discount | Notes |
|-----------|----------|-------|
| 2 | 25% | Minimum for pool |
| 3 | 35% | |
| 4+ | 40% + 5% full pool bonus | Maximum discount |

### Calculation Formula

```
baseFare       = baseRate + (distanceKm × 15)
timeFare       = durationMinutes × 2
totalBefore    = baseFare + timeFare
poolDiscount   = totalBefore × discountRate
farePerPerson  = ceil((totalBefore - poolDiscount) / passengerCount)
actualCharge   = farePerPerson + 10  (platform surcharge)
```

### Driver Earnings

```
totalFare          = farePerPerson × currentPassengers
platformCommission = totalFare × 20%
driverEarnings     = totalFare - platformCommission
dailyBonus         = 100 BDT per every 3 completed trips
```

### Fare Recalculation Triggers

- New passenger joins pool
- Passenger leaves pool
- Route changes (pickup/dropoff updates)

---

## 12. Pool Matching Algorithm (H3)

### H3 Hexagonal Grid

The system uses [Uber H3](https://h3geo.org/) for geospatial indexing:

| Resolution | Edge Length | Use Case |
|-----------|------------|----------|
| **9** | ~174m | Pickup matching (precise) |
| **8** | ~461m | Driver search |
| **7** | ~1.22km | Destination matching (broader) |

### Matching Process

```
Step 1: H3 Index Generation
  pickup → latLngToCell(lat, lng, resolution=9)
  destination → latLngToCell(lat, lng, resolution=7)

Step 2: Ring Search (Database Query)
  pickupRing = gridDisk(pickupH3, k=6)      →  ~2.1km radius
  destinationRing = gridDisk(destH3, k=2)    →  ~4.8km radius

Step 3: Query pools WHERE:
  - destination_h3_index IN destinationRing
  - pickup_h3_index IN pickupRing
  - vehicle_type matches
  - status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER')
  - current_passengers < max_passengers
  - age < 40 seconds (for WAITING_FOR_RIDERS)

Step 4: Score each match (0–100)
  ┌─────────────────────────────────────┐
  │ Distance Score       25 pts max     │ Pickup proximity (≤5km)
  │ Route Overlap Score  35 pts max     │ % of overlapping route segments
  │ Hexagon Match Score  20 pts max     │ Common H3 cells between routes
  │ Exact Match Bonus     5 pts        │ Same H3 res-9 pickup hex
  │ Destination Proximity 10 pts max   │ Dropoff distance
  └─────────────────────────────────────┘
  Minimum threshold: 30 points

Step 5: Top-10 Enrichment
  - Google Maps API for exact distance/ETA
  - Route geometry for map display
```

### Compatibility Check

A ride is compatible with a pool when:
1. Destination distance ≤ 5km
2. Gender restriction matches (FEMALE_ONLY ↔ FEMALE_ONLY)
3. Vehicle type matches (CAR/CNG)
4. Pool has capacity
5. Route overlap > 0%
6. Pickup distance ≤ 5km

---

## 13. Payment & Wallet System

### Payment Methods

| Method | Implementation |
|--------|---------------|
| Wallet | Internal balance (primary) |
| Mobile Banking | Generic gateway placeholder (bKash/Nagad/Rocket via wallet top-up) |
| Card | Generic card gateway placeholder |
| Cash | Driver collects, recorded in system |

### Wallet Operations

| Operation | Endpoint | Description |
|-----------|----------|-------------|
| Get Balance | `GET /api/wallet/balance` | Current wallet balance |
| Top Up | `POST /api/wallet/topup` | Add funds (bKash/Nagad/Rocket/Card) |
| Top Up (alias) | `POST /api/wallet/add-funds` | Frontend compatibility alias |
| Pay for Ride | `POST /api/wallet/pay` | Debit for completed ride |
| Withdraw | `POST /api/wallet/withdraw` | Cash out to bank |
| Transactions | `GET /api/wallet/transactions` | Paginated transaction history |
| Payment History | `GET /api/payments/history` | Paginated payment records |

### Payment Flow

```
Trip Completed
     │
     ▼
Server calculates fare (farePerPerson + surcharge)
     │
     ▼
POST /api/payments/process
  │
  ├── atomic_process_payment (Supabase RPC)
  │
  ├── Wallet: walletService.debit(userId, amount)
  │
  ├── Cash/Card/Mobile Banking: placeholder gateway flow
  │
  ├── complete_payment or fail_payment (Supabase RPC)
  │
  ▼
Payment record updated (status: COMPLETED/FAILED)
Driver earnings credited (minus 20% commission)
```

### Transaction Types

```typescript
type WalletTransactionType = 'CREDIT' | 'DEBIT' | 'REFUND' | 'BONUS';
```

---

## 14. Messaging System

### Architecture

- **Database**: `messages` table + `conversations` table
- **Real-time**: Supabase postgres_changes on `messages` table
- **Hook**: `useChatRealtime.ts` (2s polling fallback)

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages/` | Send a message |
| GET | `/api/messages/conversations` | List conversations |
| GET | `/api/messages/conversations/:id` | Get messages in conversation |
| GET | `/api/messages/unread-count` | Total unread count |
| POST | `/api/messages/conversations/:id/read` | Mark conversation as read |

### Chat Types

1. **Co-rider chat**: Between passengers in the same pool
2. **Driver chat**: Between passenger and assigned driver
3. **Support chat**: Between user and support team

### Unread Message Tracking

`usePoolRealtime` tracks unread counts per co-rider:
```typescript
unreadMessageCounts: Record<string, number>  // userId → count
```
Badge shown on co-rider's chat icon in TripProgress.

---

## 15. Safety & Emergency Features

### SOS System

| Endpoint | Description |
|----------|-------------|
| `POST /api/safety/sos` | Trigger emergency SOS alert |
| `POST /api/safety/incidents` | Report safety incident |
| `GET /api/safety/incidents` | Get active incidents |
| `POST /api/safety/share-trip` | Share live trip with contacts |

### Emergency Contacts

| Endpoint | Description |
|----------|-------------|
| `GET /api/emergency-contacts` | List emergency contacts |
| `POST /api/emergency-contacts` | Add emergency contact |
| `PUT /api/emergency-contacts/:id` | Update emergency contact |
| `DELETE /api/emergency-contacts/:id` | Remove contact |
| `POST /api/emergency-contacts/:id/primary` | Set as primary |
| `GET /api/safety/emergency-contacts` | Safety namespace aliases |

### Trip Sharing

- Generate unique token-based URL
- Anyone with the link can track the trip in real-time (no auth needed)
- `GET /api/sharing/track/:token` — public endpoint

### Gender Preference

- Users can set ride preference: `ANY` or `FEMALE_ONLY`
- `FEMALE_ONLY` pools only match with other female riders
- Set via `PUT /api/users/gender-preference`

---

## 16. Priyo Sathi (Travel with Friends)

### Concept

"Priyo Sathi" (প্রিয় সাথী) means "dear companion" in Bangla. This feature lets users add friends and auto-match for rides going in the same direction.

### Flow

1. **Add companion**: `POST /api/priyo-sathi/` with phone number
2. **Accept request**: `POST /api/priyo-sathi/requests/:requestId/respond`
3. **When creating a ride**: System checks if any Priyo Sathi is nearby and heading same direction
4. **Auto-invite**: Shows invite modal with detour estimate
5. **Constraints**: Max 7 min detour, 1km deviation, max 5 companions

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/priyo-sathi/` | List companions |
| POST | `/api/priyo-sathi/` | Add companion |
| GET | `/api/priyo-sathi/requests` | Pending friend requests |
| GET | `/api/priyo-sathi/nearby` | Nearby companions on similar route |
| POST | `/api/priyo-sathi/:id/invite` | Invite companion to ride |
| GET | `/api/priyo-sathi/invite/:rideId` | Get ride invite details |
| POST | `/api/priyo-sathi/invite/:rideId/accept` | Accept ride invite |

---

## 17. Rating System

### Post-Trip Rating

After every completed trip, both passengers and drivers can rate each other.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ratings/` | Submit rating (1–5 stars + review + tags) |
| GET | `/api/ratings/me` | Get my received ratings |
| GET | `/api/ratings/user/:userId` | Get ratings for a user |
| GET | `/api/ratings/user/:userId/breakdown` | Rating distribution (1–5 star counts) |
| GET | `/api/ratings/ride/:rideId` | Get ratings for a specific ride |

### Rating Data

```typescript
{
  ride_id: string;
  rated_user_id: string;
  rating: number;          // 1–5
  review?: string;         // Max 500 characters
  tags?: string[];         // Max 5 tags (e.g., "clean car", "friendly")
}
```

### Average Rating

User's `average_rating` in the `users` table is automatically updated after each new rating.

---

## 18. Navigation & Routing

### Route Providers

| Provider | Use Case | Config |
|----------|----------|--------|
| **Google Maps** | Directions API, traffic-aware routes, navigation deep links | `GOOGLE_MAPS_API_KEY` |

### Combined Route

For pools with multiple passengers, the server calculates an **optimized combined route**:

```
Driver Location → Passenger 1 Pickup → Passenger 2 Pickup → 
Passenger 1 Dropoff → Passenger 2 Dropoff → Pool Destination
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pools/:id/combined-route` | Get optimized multi-stop route |
| POST | `/api/pools/:id/combined-route/update` | Recalculate route (e.g., after new passenger) |
| GET | `/api/pools/:id/route` | Get basic pool route |
| GET | `/api/pools/:id/navigation-link` | Google Maps navigation deep link |

### Navigation Deep Link

Opens Google Maps turn-by-turn navigation with all waypoints:
```
https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG&waypoints=LAT,LNG|LAT,LNG&travelmode=driving
```

---

## 19. API Reference

### Base URL

```
Development: http://localhost:3000/api
```

### Response Format

All endpoints return:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "timestamp": "2026-03-05T05:00:00.000Z"
}
```

Error response:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  },
  "timestamp": "2026-03-05T05:00:00.000Z"
}
```

### Complete Endpoint List

#### Authentication (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Register new user |
| POST | `/login` | No | Login with email/password |
| POST | `/logout` | Yes | Logout (invalidate token) |
| POST | `/refresh` | No | Refresh JWT token |
| GET | `/me` | Yes | Get current user profile |
| GET | `/verify-email` | No | Verify email address |
| POST | `/reset-password` | No | Request password reset |
| POST | `/change-password` | Yes | Change password |

#### Users (`/api/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/profile` | Yes | Get user profile |
| PUT | `/profile` | Yes | Update user profile |
| PUT | `/gender-preference` | Yes | Set gender ride preference |
| POST | `/device-token` | Yes | Register push notification token |
| DELETE | `/device-token` | Yes | Unregister push notification token |
| GET | `/notifications` | Yes | Get notifications |
| POST | `/notifications/:notificationId/read` | Yes | Mark notification as read |
| POST | `/notifications/read-all` | Yes | Mark all notifications as read |
| GET | `/notifications/preferences` | Yes | Get notification preferences |
| PUT | `/notifications/preferences` | Yes | Update notification preferences |
| DELETE | `/account` | Yes | Delete user account |

#### Pools (`/api/pools`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search` | Yes | Search for matching pools |
| POST | `/` | Yes | Create new pool |
| POST | `/create` | Yes | Create new pool (alias) |
| GET | `/:poolId` | Yes | Get pool details with members |
| GET | `/:poolId/preview` | Yes | Preview pool before joining |
| GET | `/:poolId/route` | Yes | Get optimized route |
| GET | `/:poolId/combined-route` | Yes | Get multi-stop combined route |
| POST | `/:poolId/combined-route/update` | Yes | Recalculate combined route |
| GET | `/:poolId/fare` | Yes | Recalculate fare |
| POST | `/:poolId/join` | Yes | Join a pool |
| POST | `/:poolId/leave` | Yes | Leave a pool |
| POST | `/:poolId/cancel` | Yes | Cancel a pool (creator only) |
| POST | `/:poolId/extend-search` | Yes | Extend search timer |
| POST | `/:poolId/complete-search` | Yes | Complete search early |
| GET | `/:poolId/navigation-link` | Yes | Get navigation deep link |

#### Rides (`/api/rides`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/estimate` | Yes | Get ride fare estimate |
| POST | `/request` | Yes | Request a ride |
| GET | `/history` | Yes | Get ride history |
| PUT | `/:rideId/cancel` | Yes | Cancel a ride |

#### Driver (`/api/driver`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/go-online` | Yes | Go online with vehicle |
| POST | `/go-offline` | Yes | Go offline |
| GET | `/status` | Yes | Get driver status |
| PUT | `/location` | Yes | Update driver GPS location |
| GET | `/available-pools` | Yes | Get nearby available pools |
| POST | `/pools/:poolId/accept` | Yes | Accept a pool (atomic) |
| POST | `/pools/:poolId/reject` | Yes | Reject a pool |
| POST | `/pools/:poolId/unassign` | Yes | Unassign from pool |
| GET | `/active-pool` | Yes | Get current active pool |
| POST | `/ride/start` | Yes | Start the ride |
| POST | `/ride/complete` | Yes | Complete the ride |
| POST | `/pickup/:passengerId` | Yes | Mark passenger picked up |
| POST | `/dropoff/:passengerId` | Yes | Mark passenger dropped off |
| GET | `/earnings/today` | Yes | Get today's earnings |
| GET | `/earnings/history` | Yes | Get earnings history |
| GET | `/stats` | Yes | Get driver statistics |
| POST | `/vehicle` | Yes | Register a vehicle |

**Client note:** CarPoolApp references `/api/driver/priority-location`, but the server does not expose that route. Use `PUT /api/users/profile` with `driver_priority_lat/lng/address` instead.

#### Wallet (`/api/wallet`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/balance` | Yes | Get wallet balance |
| POST | `/topup` | Yes | Add funds |
| POST | `/add-funds` | Yes | Add funds (alias) |
| POST | `/withdraw` | Yes | Withdraw funds |
| GET | `/transactions` | Yes | Get transaction history |
| GET | `/check-balance` | Yes | Check if balance is sufficient |
| POST | `/pay` | Yes | Pay for a ride |

#### Payments (`/api/payments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/process` | Yes | Process a payment |
| GET | `/history` | Yes | Get payment history |

#### Ratings (`/api/ratings`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Submit a rating |
| GET | `/me` | Yes | Get my ratings |
| GET | `/user/:userId` | Yes | Get user's ratings |
| GET | `/user/:userId/breakdown` | Yes | Get rating breakdown |
| GET | `/ride/:rideId` | Yes | Get ride ratings |

#### Messages (`/api/messages`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Send a message |
| GET | `/conversations` | Yes | List conversations |
| GET | `/conversations/:conversationId` | Yes | Get messages |
| GET | `/:conversationId` | Yes | Get messages (alias) |
| GET | `/unread-count` | Yes | Get unread message count |
| POST | `/conversations/:conversationId/read` | Yes | Mark conversation as read |
| POST | `/messages/:messageId/read` | Yes | Mark a message as read |
| POST | `/:messageId/read` | Yes | Mark a message as read (alias) |

#### Safety (`/api/safety`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/sos` | Yes | Trigger SOS alert |
| POST | `/incidents` | Yes | Report incident |
| GET | `/incidents` | Yes | Get active incidents |
| POST | `/share-trip` | Yes | Share trip link |
| GET | `/emergency-contacts` | Yes | Get emergency contacts |
| POST | `/emergency-contacts` | Yes | Add emergency contact |
| DELETE | `/emergency-contacts/:contactId` | Yes | Remove emergency contact |

#### Additional Endpoints

- **Priyo Sathi** (`/api/priyo-sathi`) — `GET /`, `POST /`, `GET /requests`, `POST /requests/:requestId/respond`, `POST /:companionId/invite`, `GET /invite/:rideId`, `POST /invite/:rideId/accept`, `DELETE /:companionId`, `POST /:companionId/block`, `GET /nearby`
- **Promos** (`/api/promos`) — `POST /validate`, `GET /active`, `GET /history`, `POST /`, `DELETE /:promoId`
- **Saved Places** (`/api/saved-places`) — `GET /`, `POST /`, `GET /:placeId`, `PUT /:placeId`, `DELETE /:placeId`
- **Emergency Contacts** (`/api/emergency-contacts`) — `GET /`, `POST /`, `PUT /:contactId`, `DELETE /:contactId`, `POST /:contactId/primary`, `GET /primary`
- **Ride Sharing** (`/api/sharing`) — `POST /share`, `GET /active`, `DELETE /:shareId`, `GET /track/:token`
- **Analytics** (`/api/analytics`) — `GET /dashboard`, `GET /rides`, `GET /drivers`, `GET /users`, `GET /revenue`
- **Heatmap** (`/api/heatmap`) — `GET /`, `GET /demand`, `GET /surge-zones`, `GET /recommendations`, `GET /peak-hours`, `GET /patterns`
- **Shifts** (`/api/shifts`) — `GET /`, `POST /`, `PUT /:shiftId`, `DELETE /:shiftId`, `DELETE /day/:dayOfWeek`, `GET /stats`, `GET /reminders`, `GET /status`
- **Navigation** (`/api/navigation`) — `POST /route`, `POST /state`, `POST /voice-instruction`, `GET /waypoint-message`, `GET /recalculating`, `POST /deep-link`
- **Offline** (`/api/offline`) — `GET /package`, `POST /sync`, `POST /resolve-conflicts`, `GET /pending`, `GET /status`, `DELETE /clear`
- **i18n** (`/api/i18n`) — `GET /translations`, `GET /languages`, `POST /translate`, `GET /format/currency`, `GET /format/distance`, `GET /format/duration`, `GET /user-language`, `PUT /user-language`
- **Health** (`/health`) — Server health checks

---

## 20. Middleware Stack

### Request Processing Order (from `app.ts`)

```
1. Security Headers (Helmet, CORS)
2. Input Sanitizer (XSS, null bytes, payload size limit)
3. JSON Body Parser (100kb limit)
4. Rate Limiters (per-route)
5. Authentication (JWT validation via Supabase)
6. Validation (Zod schema validation)
7. Route Handler (controller)
8. Error Handler (global catch-all)
```

### Authentication Middleware

```typescript
// Strict auth — returns 401 if no valid token
authenticate(req, res, next)

// Optional auth — attaches user if token present, continues if not
optionalAuth(req, res, next)
```

### Rate Limiters

| Limiter | Window | Max Requests | Applied To |
|---------|--------|-------------|------------|
| `apiLimiter` | 15 min | 100 | All API routes |
| `authLimiter` | 15 min | 20 | Auth endpoints |
| `searchLimiter` | 1 min | 30 | Pool search |
| `paymentLimiter` | 1 min | 10 | Payment processing |
| `sosLimiter` | 1 min | 5 | SOS triggers |
| `passwordResetLimiter` | 15 min | 5 | Password reset |

### Validation Middleware

```typescript
validate(schema: ZodSchema, source: 'body' | 'query' | 'params')
```

Validates request data against Zod schemas. Returns 400 with detailed error messages on failure.

### Key Zod Schemas

- `CreatePoolSchema` — Pool creation payload
- `JoinPoolSchema` — Join pool payload
- `SearchPoolsSchema` — Pool search query params
- `GoOnlineSchema` — Driver go-online payload
- `UpdateLocationSchema` — GPS location update
- `RegisterVehicleSchema` — Vehicle registration
- `ProcessPaymentSchema` — Payment processing
- `UpdateProfileSchema` — Profile update

---

## 21. State Management

### CarPoolApp

| Store | Type | Purpose |
|-------|------|---------|
| `AuthContext` | React Context | Auth state, token, user profile |
| `GlobalContext` | React Context | Active trip, selected pool, pickup/destination, ride type |
| `NotificationContext` | React Context | Push notification handling |
| `useAppStore` | Zustand | General app state |

#### GlobalContext Key State

```typescript
{
  userProfile: UserProfile | null;
  pickupLocation: Location | null;
  selectedDestination: Destination | null;
  selectedPool: Pool | null;
  selectedRideType: 'female-only' | 'regular' | null;
  activeTrip: ActiveTripState | null;    // Persisted to AsyncStorage
  hasActiveTrip: boolean;
}
```

#### Trip Persistence

- `startTrip(pool)` → Saves to AsyncStorage
- On restart → `loadActiveTrip()` reads from AsyncStorage, validates via API, uses **fresh data**
- `endTrip()` → Clears AsyncStorage and state

### DriverApp

| Store | Type | Purpose |
|-------|------|---------|
| `useDriverStore` | Zustand | Driver state (online, activePool, location) |
| `ThemeContext` | React Context | Theme colors |

#### Driver Store Key State

```typescript
{
  isOnline: boolean;
  activePool: Pool | null;
  currentLocation: { latitude, longitude } | null;
}
```

---

## 22. Error Handling Patterns

### Server Error Handler

Global error middleware (`errorHandler.ts`) catches all unhandled errors:
```typescript
(err, req, res, next) => {
  // Logs error
  // Returns { success: false, error: { code, message } }
  // 500 for unexpected errors, preserves status code for known errors
}
```

### Client Error Boundaries

#### `TripProgressErrorBoundary` (trip-progress.tsx)
- Catches render errors in TripProgress component
- Retries up to 3 times with exponential backoff (500ms, 1s, 2s)
- After max retries: shows manual retry button

#### `OverlayErrorBoundary` (_layout.tsx)
- Wraps BottomNav, ActiveTripButton, and overlay components
- Renders `null` on error (hides overlays rather than crashing screens)

### API Client Retry Logic

`apiClient.ts` has built-in retry for failed requests:
- **Timeout**: 30 seconds
- **Retries**: 3 attempts with exponential backoff
- **Retry on**: Network errors, 5xx server errors
- **No retry on**: 4xx client errors (validation, auth, not found)

### Navigation Context Patches

`@react-navigation/core` and `@react-navigation/native` have throwing getter defaults in context providers. These are patched via `patch-package` to use no-op defaults, preventing crashes during transient React 19 concurrent re-renders:

```
patches/
├── @react-navigation+core+7.14.0.patch          # NavigationStateContext, NavigationBuilderContext
└── @react-navigation+native+7.1.28.patch        # UnhandledLinkingContext, LinkingContext
```

---

## 23. Environment Configuration

### Server (`Server/.env`)

```bash
# Core
NODE_ENV=development
PORT=3000
MVP_MODE=true                    # true = in-memory cache, false = Redis
SKIP_REDIS=true                  # alias that also enables MVP mode

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Google Maps
GOOGLE_MAPS_API_KEY=xxx

# H3 Configuration
H3_RESOLUTION_PICKUP=9          # ~174m hexagon
H3_RESOLUTION_DESTINATION=7     # ~1.22km hexagon
H3_RESOLUTION_DRIVER=8          # ~461m hexagon
H3_SEARCH_RADIUS_PICKUP=6       # Ring size for pickup search
H3_SEARCH_RADIUS_DESTINATION=2  # Ring size for destination search

# Cache
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=ridepool:
REDIS_DEFAULT_TTL=300
MEMORY_CACHE_MAX_SIZE=1000
MEMORY_CACHE_TTL=300
```

### Client Apps

```bash
# Expo environment variables (prefixed with EXPO_PUBLIC_)
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=xxx
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=optional
```

### MVP Mode

When `MVP_MODE=true` (development):
- Uses in-memory cache instead of Redis
- Simplifies deployment (no Redis dependency)
- Checked via `config.mvpMode` throughout the codebase

---

## 24. Build, Test & Deploy

### Server

```bash
cd Server

# Install dependencies
npm install

# Build (TypeScript → JavaScript)
npm run build

# Development (with hot reload)
npm run dev

# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run specific test file
npx vitest run tests/unit/myfile.test.ts
```

### CarPoolApp

```bash
cd Client/CarPoolApp

# Install dependencies
npm install

# Start Expo dev server (clear cache)
npx expo start --clear

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Run tests
npm test

# Run specific test
npm test -- --testPathPattern=MyComponent
```

### DriverApp

```bash
cd Client/DriverApp

# Install dependencies
npm install

# Start Expo dev server
npx expo start --clear

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Run tests
npm test
```

### Shared Types

```bash
cd shared

# Build types (TypeScript → dist/)
npm run build
```

### Docker

```bash
cd Server

# Full stack (with Redis)
docker-compose up

# MVP mode (in-memory cache, no Redis)
docker-compose -f docker-compose.mvp.yml up
```

### CI/CD (GitHub Actions)

Defined in `.github/workflows/ci.yml`:

1. **Lint**: Runs ESLint for all packages
2. **Build**: TypeScript compilation for server and shared
3. **Unit Tests**: Vitest (server), Jest (client apps)
4. **Integration Tests**: Spins up Redis for server integration tests
5. **Security Audit**: Runs `npm audit` on all packages

---

## Appendix: Key File Quick Reference

| What | Where |
|------|-------|
| Server entry point | `Server/src/app.ts` |
| Express app setup | `Server/src/app.ts` |
| Route mounting | `Server/src/routes/index.ts` |
| Database config | `Server/src/config/env.ts` |
| Auth middleware | `Server/src/middleware/auth.ts` |
| Fare calculation | `Server/src/services/fare.service.ts` |
| Pool matching (H3) | `Server/src/services/poolMatching.service.ts` |
| Pool lifecycle | `Server/src/controllers/pool.controller.ts` |
| Driver operations | `Server/src/controllers/driver.controller.ts` |
| DB schema | `Server/supabase/migrations/20260121_ridepool_merged_schema.sql` |
| Passenger trip UI | `Client/CarPoolApp/components/TripProgress.native.tsx` |
| Pool realtime hook | `Client/CarPoolApp/hooks/usePoolRealtime.ts` |
| App state/context | `Client/CarPoolApp/contexts/GlobalContext.tsx` |
| Auth context | `Client/CarPoolApp/contexts/AuthContext.tsx` |
| API client | `Client/CarPoolApp/utils/apiClient.ts` |
| Driver trip UI | `Client/DriverApp/src/components/pool/TripProgress.native.tsx` |
| Driver store | `Client/DriverApp/src/store/useDriverStore.ts` |
| Driver realtime | `Client/DriverApp/src/hooks/usePoolRealtime.ts` |
| Shared types | `shared/src/index.ts` |

---

## 25. Detailed File-to-File Data Flow Traces

This section provides **exhaustive step-by-step traces** showing exactly how data moves from file to file, function to function, for every major scenario in both the passenger (CarPoolApp) and driver (DriverApp) applications.

Each trace includes:
- **Exact file path** and function name
- **Data passed in** and **data returned**
- **Database operations** performed
- **State changes** and **side effects** (navigation, storage, notifications)

---

### 25.1 App Startup & Authentication

#### 25.1.1 CarPoolApp Startup Sequence

When the passenger app launches, the following happens in order:

```
Step 1: Root Layout Mounts
├── Step 2: AuthProvider initializes → checkAuthStatus()
├── Step 3: GlobalProvider initializes → loadActiveTrip()
├── Step 4: Navigation resolves based on auth state
└── Step 5: Home screen or login screen renders
```

**Step 1: Root Layout**
- **File:** `Client/CarPoolApp/app/_layout.tsx` → `RootLayout()`
- **Provider wrapping order (outermost → innermost):**
  1. `ThemeProvider`
  2. `SafeAreaProvider`
  3. `AuthProvider` ← triggers auth check
  4. `NotificationProvider`
  5. `GlobalProvider` ← triggers active trip load
  6. `AppLayout` (Stack navigator)

**Step 2: Auth Check**
- **File:** `Client/CarPoolApp/contexts/AuthContext.tsx` → `checkAuthStatus()`
- **Flow:**
  1. Read `authToken` from AsyncStorage
  2. If token exists:
     - Restore user from `cachedUser` in AsyncStorage (instant display)
     - Background-verify: call `userService.getProfile()` → `GET /api/users/profile`
     - On 401: clear token, set `user = null` (redirect to login)
     - On network error: keep cached user (offline support)
  3. If no token: `user = null`, show login
- **State set:** `user`, `loading = false`, `initialCheckDone = true`

**Step 3: Active Trip Restoration**
- **File:** `Client/CarPoolApp/contexts/GlobalContext.tsx` → `loadActiveTrip()`
- **Flow:**
  1. Read `@carpool_active_trip` from AsyncStorage
  2. If trip exists and status ≠ `completed`:
     - Validate pool via API: `poolService.getPoolById(trip.poolId)` → `GET /api/pools/:poolId`
     - **Server:** `Server/src/controllers/pool.controller.ts` → `getPool()` — returns pool with joins (driver, vehicles, pool_members)
     - If pool is `CANCELLED` or `COMPLETED`: clear stored trip
     - Otherwise: **use fresh API data** (not stale storage copy) → `setActiveTrip({ ...trip, pool: freshPool })`
     - Re-persist updated trip to AsyncStorage
  3. If network error: restore from storage anyway (offline support)
  4. Set `selectedPool`, `pickupLocation`, `selectedDestination` from restored trip
- **Data shape restored:**
  ```typescript
  ActiveTripState = {
    poolId: string,
    pool: Pool,            // FRESH from API, not stale copy
    pickupLocation: Location,
    destination: Destination,
    rideType: 'female-only' | 'regular',
    status: 'searching' | 'waiting' | 'in_progress' | 'completed',
    createdAt: string
  }
  ```

**Step 4: Navigation Resolution**
- **File:** `Client/CarPoolApp/app/_layout.tsx` → `AppLayout()`
- If `user` exists → show tabs (home screen)
- If `user` is null → show login screen
- If `hasActiveTrip` → show `ActiveTripButton` floating overlay

#### 25.1.2 DriverApp Startup Sequence

```
Step 1: App entry renders LoginScreen
├── Step 2: Zustand store hydrates from AsyncStorage
├── Step 3: If authenticated, driver must still login manually
└── Step 4: After login → navigate to (tabs)/home
```

**Step 1: Entry Point**
- **File:** `Client/DriverApp/app/index.tsx` → `Index()`
- Renders `LoginScreen` with `onLogin → router.replace('/(tabs)/home')`

**Step 2: Zustand Store Hydration**
- **File:** `Client/DriverApp/src/store/useDriverStore.ts`
- Persisted via Zustand middleware + AsyncStorage
- Restores: `{ user, vehicle, isAuthenticated }` (not `isOnline` or `activePool`)

**Step 3: Login (No Auto-Login)**
- ⚠️ DriverApp does NOT have auto-login on startup (unlike CarPoolApp)
- User must login manually each time

#### 25.1.3 Login Flow (Both Apps)

```
User taps Login
  │
  ├─ CarPoolApp: Client/CarPoolApp/app/login.tsx → handleSubmit()
  │  └─ AuthContext.login(email, password)
  │     └─ authService.login(email, password)
  │
  ├─ DriverApp: Client/DriverApp/src/components/screens/LoginScreen.native.tsx → handleSubmit()
  │  └─ authService.login(email, password)
  │
  └─► Both call: POST /api/auth/login
       │
       ├─ Server/src/routes/auth.routes.ts → route handler
       ├─ Server/src/controllers/auth.controller.ts → AuthController.login()
       │   ├─ supabase.auth.signInWithPassword(email, password) → session + JWT
       │   ├─ SELECT * FROM users WHERE id = auth_user.id
       │   └─ If is_driver: SELECT * FROM vehicles WHERE driver_id = user.id AND is_active = true
       │
       └─ Response:
          {
            user: { id, email, full_name, gender, is_driver, ... },
            vehicle?: { id, vehicle_type, vehicle_number, model },
            session: { access_token, refresh_token, expires_at }
          }
```

**Client-side after success:**
- Store `access_token` → AsyncStorage `authToken`
- Store `refresh_token` → AsyncStorage `refreshToken`
- CarPoolApp: `setUser(user)`, cache to AsyncStorage `cachedUser`
- DriverApp: `setUser(user)`, `setVehicle(vehicle)` in Zustand store
- Navigate to home screen

#### 25.1.4 Registration Flow

```
User taps Register
  │
  └─► POST /api/auth/register
       │
       ├─ Server/src/controllers/auth.controller.ts → AuthController.register()
       │   ├─ Validate via registerSchema.safeParse()
       │   ├─ supabaseAdmin.auth.admin.createUser() → creates Supabase auth user
       │   ├─ INSERT INTO users { id, email, full_name, gender, is_driver: false }
       │   ├─ INSERT INTO wallets { user_id, balance: 0 }
       │   ├─ If driver registration:
       │   │   ├─ INSERT INTO vehicles { driver_id, vehicle_type, vehicle_number, model }
       │   │   └─ UPDATE users SET is_driver = true
       │   └─ Return: { user, vehicle?, session }
       │
       └─ Client stores tokens + user (same as login)
```

---

### 25.2 Passenger Creates a Pool

This is the complete trace from the moment a passenger taps "Create Pool" to landing on the trip progress page.

```
FLOW OVERVIEW:
RideConfirmation → poolService.createPool() → Server createPool() →
  DB: INSERT rides, INSERT pools, INSERT pool_members →
  Response → GlobalContext.startTrip() → Navigate to SearchingDriver →
  usePoolRealtime subscribes → Timer countdown →
  Status change detected → Navigate to TripProgress
```

**Step 1: User taps "Create Pool"**
- **File:** `Client/CarPoolApp/components/RideConfirmation.native.tsx` → `handleCreatePool()`
- **Data collected from UI:**
  ```typescript
  {
    pickup_lat, pickup_lng, pickup_address, pickup_name,
    destination_lat, destination_lng, destination_address, destination_name,
    vehicle_type: 'CAR' | 'CNG',
    max_passengers: 4 (CAR) | 2 (CNG),
    gender_restriction: 'FEMALE_ONLY' | 'ANY'
  }
  ```
- **State:** `isCreatingPool = true`

**Step 2: Client API call**
- **File:** `Client/CarPoolApp/services/pool.service.ts` → `poolService.createPool(data)`
- **HTTP:** `POST /api/pools/create`
- **Headers:** `Authorization: Bearer {token}`

**Step 3: Server receives request**
- **File:** `Server/src/routes/pool.routes.ts` → route registered
- **File:** `Server/src/controllers/pool.controller.ts` → `createPool(req, res, next)`

**Step 4: Server validates and computes**
- Extract `userId` from `req.user.id` (via auth middleware)
- Check cooldown: `penaltyService.isUserInCooldown(userId)` → 403 if in cooldown
- Compute H3 indices:
  ```
  pickupH3 = h3Utils.latLngToH3(pickup, resolution=9)    // ~174m hexagon
  dropoffH3 = h3Utils.latLngToH3(destination, resolution=7) // ~1.2km hexagon
  ```
- Estimate fare: `rideEstimationService.getRideEstimate(pickup, destination, vehicleType, 2)`
  - Returns: `{ distanceKm, durationMinutes, fareEstimates: { with2Passengers: number } }`

**Step 5: Database inserts (3 tables)**

```sql
-- 1. Create ride record
INSERT INTO rides {
  user_id, pickup_lat, pickup_lng, pickup_address, pickup_h3_index,
  dropoff_lat, dropoff_lng, dropoff_address, dropoff_h3_index,
  vehicle_type, gender_restriction, status: 'CREATING_POOL',
  distance_km: rideEstimate.distanceKm
} RETURNING *
-- Returns: creatorRide

-- 2. Create pool record
INSERT INTO pools {
  creator_user_id, pickup_lat, pickup_lng, pickup_address, pickup_h3_index,
  destination_lat, destination_lng, destination_address, destination_h3_index,
  vehicle_type, max_passengers, gender_restriction,
  current_passengers: 1, status: 'WAITING_FOR_RIDERS',
  fare_per_person: rideEstimate.fareEstimates.with2Passengers,
  base_distance_km, base_duration_minutes
} RETURNING *
-- Returns: pool

-- 3. Link ride to pool + add creator as member
UPDATE rides SET pool_id = pool.id, status = 'SEARCHING' WHERE id = creatorRide.id
INSERT INTO pool_members {
  pool_id, user_id, ride_id, join_type: 'INITIAL', joined_at: NOW()
}
```

**Step 6: Start lookup timer**
- **File:** `Server/src/services/lookupTime.service.ts` → `startLookupTimer(pool.id)`
- Timer phases: 30s INITIAL + 10s EXTENDED = 40s total

**Step 7: Server response**
```json
{
  "success": true,
  "data": {
    "pool": { "id": "uuid", "status": "WAITING_FOR_RIDERS", "current_passengers": 1, ... },
    "ride": { "id": "uuid", "status": "SEARCHING", "pool_id": "uuid", ... },
    "search_timing": { "initial_seconds": 30, "extended_seconds": 10, "total_seconds": 40, "expires_at": "ISO" }
  }
}
```

**Step 8: Client processes response**
- **File:** `Client/CarPoolApp/components/RideConfirmation.native.tsx`
- If Priyo Sathi friends invited: for each → `priyoSathiService.inviteToRide(friendId, rideId)`
- Call `onPoolSelect(result.data.pool)` → triggers navigation

**Step 9: GlobalContext persists trip**
- **File:** `Client/CarPoolApp/contexts/GlobalContext.tsx` → `startTrip(pool, options)`
- Creates and saves:
  ```typescript
  activeTrip = {
    poolId: pool.id, pool, pickupLocation, destination,
    rideType, createdAt: new Date().toISOString(), status: 'waiting'
  }
  ```
- Persists to AsyncStorage key `@carpool_active_trip`

**Step 10: SearchingDriver screen**
- **File:** `Client/CarPoolApp/app/searching.tsx` → renders `SearchingDriver` component
- **File:** `Client/CarPoolApp/components/SearchingDriver.native.tsx`

**Step 11: Realtime hook activates**
- `usePoolRealtime(poolId, userId)` subscribes to Supabase channels
- **Countdown timer:** calculates `elapsed = now - pool.created_at`, shows remaining seconds
- **Monitors:** `poolStatus`, `hasDriver`, `currentPassengers`

**Step 12: Status change → Navigate**
- When `poolStatus` becomes `WAITING_FOR_DRIVER` or `READY_TO_START` or `hasDriver === true`:
  - `onDriverFound()` → `router.replace('/trip-progress')`
- When timer expires with `currentPassengers < 2`:
  - Show "No riders found" → option to create new pool or cancel

---

### 25.3 Passenger Joins an Existing Pool

```
FLOW OVERVIEW:
RideConfirmation search → Server searchPools (H3 matching) →
  Display results → User selects pool → fetchPoolPreview() →
  User taps Confirm → requestRide() + joinPool() →
  Server atomic join + fare recalculation →
  GlobalContext.startTrip() → SearchingDriver → TripProgress
```

**Step 1: Automatic pool search (triggered when pickup/destination/vehicleType changes)**
- **File:** `Client/CarPoolApp/components/RideConfirmation.native.tsx` → useEffect triggers `searchPools()`
- **File:** `Client/CarPoolApp/hooks/usePools.ts` → `searchPools(params)`
- **File:** `Client/CarPoolApp/services/pool.service.ts` → `poolService.searchPools(params)`
- **HTTP:** `GET /api/pools/search?pickup_lat=...&pickup_lng=...&dropoff_lat=...&dropoff_lng=...&vehicle_type=...&gender_restriction=...`

**Step 2: Server searches for matching pools**
- **File:** `Server/src/controllers/pool.controller.ts` → `searchPools()`
- Creates mock ride object from query params
- Records Priyo Sathi intent: `priyoSathiService.setUserRideIntent(userId, pickup, destination)`
- **File:** `Server/src/services/poolMatching.service.ts` → `findMatchingPoolsEnhanced(mockRide, userId)`
  - Query pools with `status = 'WAITING_FOR_RIDERS'`
  - H3 hexagon matching: compare pickup (res 9) and destination (res 7) indices
  - Route overlap calculation via `routeOverlapService`
  - Score each match (0–100): distance score + route overlap + hex proximity
  - Respect `gender_restriction`
  - Return top 10 scored matches
- **Response:**
  ```json
  {
    "data": {
      "pools": [{ "poolId": "uuid", "score": 85, "routeOverlapPercentage": 72, ... }],
      "analytics": { "totalPoolsChecked": 15, "searchRadius": "res9" },
      "has_matches": true, "total_found": 3
    }
  }
  ```

**Step 3: User selects a pool**
- **File:** `Client/CarPoolApp/components/RideConfirmation.native.tsx` → `handlePoolClick(poolResult)`
- Sets `selectedPoolId`
- Fetches preview: `poolService.getPoolPreview(poolId, params)` → `GET /api/pools/:poolId/preview`
- **Server:** `Server/src/controllers/pool.controller.ts` → `previewPool()` — calculates user-specific fare, combined route, stops
- **Preview response:**
  ```json
  {
    "poolId": "...", "memberCount": 2,
    "userEstimate": { "fare": 450, "savings": 150, "durationMinutes": 25, "distanceKm": 12 },
    "route": { "coordinates": [...], "totalDistance": 15.2, "fare": 450 },
    "stops": [{ "type": "pickup", "userId": "...", "location": {...}, "order": 1 }]
  }
  ```

**Step 4: User confirms — Two-step process**
- **File:** `Client/CarPoolApp/components/RideConfirmation.native.tsx` → `handleConfirm()`

**Step 4a: Create ride request**
- `requestRide()` from `useRides` hook → `POST /api/rides/request`
- Creates `rides` table entry with status `SEARCHING`
- Returns: `rideResult.data.id` (the ride_id)

**Step 4b: Join pool with ride ID**
- `joinPool(selectedPoolId, rideResult.data.id)` from `usePools` hook
- **File:** `Client/CarPoolApp/services/pool.service.ts` → `poolService.joinPool(poolId, { ride_id })`
- **HTTP:** `POST /api/pools/:poolId/join`

**Step 5: Server processes join (atomic)**
- **File:** `Server/src/controllers/pool.controller.ts` → `joinPool()`
- Validate auth + cooldown check
- Fetch ride and pool from DB, verify both exist
- Check compatibility: `poolMatchingService.isRideCompatibleWithPool(ride, pool)`
- **Atomic join via RPC:** `supabaseAdmin.rpc('atomic_join_pool', { p_pool_id, p_user_id, p_ride_id })`
  ```sql
  -- atomic_join_pool function:
  1. Check pool is not full (current_passengers < max_passengers)
  2. Increment pool.current_passengers by 1
  3. INSERT INTO pool_members { pool_id, user_id, ride_id, join_type: 'JOINED', joined_at: NOW() }
  4. UPDATE rides SET status = 'MATCHED' WHERE id = ride_id
  5. RETURN { member_id, current_passengers }
  ```
- **Fare recalculation:** Fetch all members' rides → `rideEstimationService.recalculatePoolFare()` → update `pools.fare_per_person` and all member rides
- **Pool transition:** `lookupTimeService.handleMemberJoined(poolId)` — may transition to `WAITING_FOR_DRIVER`
- **Notifications:** Push to existing members: "New rider joined! Fare updated."
- **Response:**
  ```json
  {
    "data": {
      "pool_id": "uuid", "member_id": "uuid",
      "compatibility_score": 85.5, "fare_per_person": 450, "current_passengers": 2
    }
  }
  ```

**Step 6: Client-side completion**
- Construct full Pool object from response data
- `onPoolSelect(pool)` → `GlobalContext.startTrip(pool)` → persist to AsyncStorage
- Navigate: `RideConfirmation → SearchingDriver → TripProgress` (same as creation flow)

---

### 25.4 Driver Goes Online

```
FLOW OVERVIEW:
Toggle tap → driverService.goOnline() → Server creates driver_session + vehicle_location →
  Start location watching → Start pool polling (every 15s)
```

**Step 1: UI toggle tap**
- **File:** `Client/DriverApp/app/(tabs)/home.tsx` → `handleToggleOnline()`
- If no current location: fetch via `locationService.getCurrentLocation()`
- Store location: `setCurrentLocation(location)` in Zustand store
- Call `handleGoOnline(location)`

**Step 2: Client service call**
- **File:** `Client/DriverApp/app/(tabs)/home.tsx` → `handleGoOnline(location)`
- **File:** `Client/DriverApp/src/services/driver.service.ts` → `goOnline(payload)`
- **HTTP:** `POST /api/driver/go-online`
- **Payload:** `{ lat, lng, vehicle_id?, vehicle_type? }`

**Step 3: Server processes go-online**
- **File:** `Server/src/routes/driver.routes.ts` → `POST /go-online` (middleware: `authenticate`, `validate(GoOnlineSchema)`)
- **File:** `Server/src/controllers/driver.controller.ts` → `goOnline()`

**Step 3a: Validations**
- Verify `users.is_driver = true` → 403 if not a driver
- Fetch vehicle: `SELECT * FROM vehicles WHERE driver_id = userId AND is_active = true LIMIT 1` → 404 if no vehicle

**Step 3b: Compute H3 indices**
```
h3IndexRes8 = h3Utils.latLngToH3(location, 8)   // ~461m hexagon (for pool matching)
h3IndexRes9 = h3Utils.latLngToH3(location, 9)   // ~174m hexagon
```

**Step 3c: Check existing session**
- `SELECT * FROM driver_sessions WHERE driver_id = userId AND status = 'ONLINE' LIMIT 1`
- If exists: update vehicle_location, return existing session_id
- If not exists: create new session + location record

**Step 3d: Database operations (new session)**
```sql
-- Create session
INSERT INTO driver_sessions { driver_id, vehicle_id, status: 'ONLINE', started_at: NOW() }
  RETURNING * → session

-- Create/update location
INSERT/UPDATE vehicle_locations {
  vehicle_id, driver_id, lat, lng,
  h3_index_res8, h3_index_res9,
  heading, is_active: true, is_available: true,
  recorded_at: NOW()
}
```

**Step 3e: Response**
```json
{
  "data": {
    "session_id": "uuid", "status": "ONLINE",
    "vehicle": { "id": "uuid", "type": "CAR", "number": "ABC-1234" },
    "location": { "lat": 23.8103, "lng": 90.4125 }
  }
}
```

**Step 4: Client state update**
- **File:** `Client/DriverApp/src/store/useDriverStore.ts` → `setDriverStatus('ONLINE')`
- Persisted to AsyncStorage via Zustand middleware

**Step 5: Location watching starts**
- **File:** `Client/DriverApp/app/(tabs)/home.tsx` → useEffect (when `isOnline` becomes true)
- `locationService.watchLocation()` with: `distanceInterval: 50m`, `timeInterval: 10s`
- On each update: `setCurrentLocation(location)` + `driverService.updateLocation(location)` (fire-and-forget)

**Step 6: Pool polling starts**
- **File:** `Client/DriverApp/app/(tabs)/home.tsx` → useEffect → `setInterval(fetchAvailablePools, 15000)`
- Polls `GET /api/driver/available-pools` every 15 seconds

---

### 25.5 Driver Discovers Available Pools

```
FLOW OVERVIEW:
Polling interval fires → driverService.getAvailablePools() → Server queries pools
  with H3 proximity filter → Returns scored pool list → UI renders pool cards
```

**Step 1: Poll fires**
- **File:** `Client/DriverApp/app/(tabs)/home.tsx` → `fetchAvailablePools()`
- **File:** `Client/DriverApp/src/services/driver.service.ts` → `getAvailablePools()`
- **HTTP:** `GET /api/driver/available-pools`

**Step 2: Server processes**
- **File:** `Server/src/controllers/driver.controller.ts` → `getAvailablePools()`

**Step 2a: Get driver position**
```sql
SELECT lat, lng, h3_index_res8, vehicle_id
FROM vehicle_locations
WHERE driver_id = userId AND is_active = true LIMIT 1
-- Error if not online → 400 NOT_ONLINE
```

**Step 2b: Get driver vehicle type**
```sql
SELECT vehicle_type FROM vehicles
WHERE id = driverLocation.vehicle_id AND is_active = true LIMIT 1
```

**Step 2c: Compute search area**
```
driverH3Res9 = h3Utils.latLngToH3(driverLocation, 9)
searchHexagons = h3Utils.getH3Ring(driverH3Res9, 6)  // Ring of 6 → ~2.1km radius
```

**Step 2d: Query matching pools**
```sql
SELECT *, pool_members(user_id, ride_id, left_at,
    rides(pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address),
    users:user_id(id, full_name, average_rating))
FROM pools
WHERE status = 'WAITING_FOR_DRIVER'
  AND driver_id IS NULL
  AND current_passengers >= 2
  AND vehicle_type = driverVehicleType
ORDER BY created_at ASC
```

**Step 2e: Filter by H3 proximity**
- For each pool: check if any member's pickup H3 index falls within `searchHexagons`
- Only keep pools with nearby pickups

**Step 2f: Enrich and sort**
- Calculate distance from driver to each passenger's pickup
- Find nearest pickup for each pool
- Calculate estimated earnings: `fare_per_person × current_passengers × 0.8`
- Sort by nearest pickup distance (ascending)
- Return top 10 pools

**Step 3: Client renders**
- **File:** `Client/DriverApp/app/(tabs)/home.tsx` → `setAvailablePools(response.data.pools)`
- Pool cards display: passenger count, estimated earnings, nearest pickup, destination

**Step 4: Push notification alert (optional)**
- Server may send FCM push to nearby drivers when pool becomes `WAITING_FOR_DRIVER`
- **File:** `Client/DriverApp/app/(tabs)/home.tsx` → Notifications listener
- On `action === 'VIEW_POOL'`: sets `incomingPoolRequest` → shows `PoolRequestAlert`
- **File:** `Client/DriverApp/src/components/pool/PoolRequestAlert.native.tsx`
  - Vibration: `[0, 400, 200, 400]`
  - Slide-in animation from top
  - Auto-dismiss after 30 seconds
  - Accept/Dismiss buttons

---

### 25.6 Driver Accepts a Pool

This is the most critical flow — it triggers updates across both apps simultaneously.

```
FLOW OVERVIEW:
Driver taps Accept → driverService.acceptPool() → Server atomic_accept_pool RPC →
  DB: pool.driver_id set, status → READY_TO_START →
  Supabase Realtime broadcasts change →
  BOTH APPS: receive event → full refetch → UI updates
```

**Step 1: Driver taps Accept**
- **File:** `Client/DriverApp/app/(tabs)/home.tsx` → `handleAcceptPool(poolId)`
- Sets `loading = true`

**Step 2: Client API call**
- **File:** `Client/DriverApp/src/services/driver.service.ts` → `acceptPool(poolId)`
- **HTTP:** `POST /api/driver/pools/{poolId}/accept`

**Step 3: Server validates**
- **File:** `Server/src/controllers/driver.controller.ts` → `acceptPool()`
- Validations:
  - Auth check: verify `userId` from JWT
  - No existing active pool: query `pools` where `driver_id = userId` and active status
  - Online check: query `vehicle_locations` where `driver_id = userId` and `is_active = true`
  - Vehicle type match: pool's `vehicle_type` must match driver's vehicle

**Step 4: Atomic database operation**
- **File:** `Server/supabase/migrations/20260121_ridepool_merged_schema.sql` → `atomic_accept_pool()` RPC
- **Parameters:** `p_pool_id`, `p_driver_id`, `p_vehicle_id`
- **Atomically:**
  ```sql
  -- 1. Lock pool row (prevents concurrent accepts)
  SELECT * FROM pools WHERE id = p_pool_id
    AND driver_id IS NULL
    AND status IN ('WAITING_FOR_DRIVER', 'WAITING_FOR_RIDERS')
  FOR UPDATE SKIP LOCKED

  -- 2. Validate ≥2 passengers
  IF current_passengers < 2 THEN RAISE EXCEPTION

  -- 3. Assign driver and update status
  UPDATE pools SET
    driver_id = p_driver_id,
    vehicle_id = p_vehicle_id,
    status = 'READY_TO_START',
    updated_at = NOW()
  WHERE id = p_pool_id
  ```

**Step 5: Server post-accept state updates**
```sql
-- Driver session → BUSY
UPDATE driver_sessions SET status = 'BUSY' WHERE driver_id = userId AND status = 'ONLINE'

-- Vehicle → unavailable
UPDATE vehicle_locations SET is_available = false, pool_id = poolId WHERE driver_id = userId
```
- Clear route cache: `smartRouteService.clearPoolRoute(poolId)`

**Step 6: Server assembles response**
- Query pool with joined data (pool_members, users, rides)
- Calculate nearest pickup from driver's location
- Build Google Maps navigation URL
- **Response:**
  ```json
  {
    "data": {
      "pool_id": "uuid", "status": "READY_TO_START",
      "passengers": [
        { "user_id": "uuid", "name": "Fahim", "rating": 4.5,
          "pickup": { "lat": 23.81, "lng": 90.41, "address": "Mirpur 10" },
          "dropoff": { "lat": 23.78, "lng": 90.39, "address": "Dhanmondi 27" } }
      ],
      "destination": { "lat": 23.78, "lng": 90.39, "address": "Dhanmondi 27" },
      "nearest_pickup": { "lat": 23.81, "lng": 90.41, "address": "Mirpur 10" },
      "navigation_url": "https://www.google.com/maps/dir/..."
    }
  }
  ```

**Step 7: Driver app state update**
- **File:** `Client/DriverApp/app/(tabs)/home.tsx`
- `setActivePool(acceptData)` → updates Zustand store
- **File:** `Client/DriverApp/src/store/useDriverStore.ts` → `set({ activePool: pool })`

**Step 8: Auto-navigate to trip progress**
- **File:** `Client/DriverApp/app/(tabs)/home.tsx` → useEffect watches `activePool?.id`
- When `activePool.id` becomes set → `router.replace('/trip-progress')`

**Step 9: Driver trip progress page loads**
- **File:** `Client/DriverApp/app/trip-progress.tsx` → renders `TripProgress` component
- **File:** `Client/DriverApp/src/components/pool/TripProgress.native.tsx`
- Uses `usePoolRealtime(poolId)` for live updates

**Step 10: Driver realtime hook fetches data**
- **File:** `Client/DriverApp/src/hooks/usePoolRealtime.ts` → `fetchPoolData()`
- Calls `driverService.getActivePool()` → `GET /api/driver/active-pool`
- **Server:** `Server/src/controllers/driver.controller.ts` → `getActivePool()`
  ```sql
  SELECT *, pool_members(..., users:user_id(...), rides(...)), vehicles(...)
  FROM pools WHERE driver_id = userId AND status IN ('READY_TO_START', 'STARTED')
  ```
- **Returns to driver:**
  ```json
  {
    "data": {
      "active_pool": {
        "id": "uuid", "status": "READY_TO_START",
        "passengers": [{ "user_id", "name", "rating", "pickup", "dropoff", "status": "WAITING" }],
        "destination": {...}, "vehicle": {...},
        "current_passengers": 2, "fare_per_person": 450, "total_earnings": 720
      }
    }
  }
  ```

---

### 25.7 Passenger App Receives Driver Acceptance Update

This happens simultaneously with the driver flow above. When the pool row is updated in Step 4, Supabase Realtime broadcasts to all subscribed passengers.

```
FLOW OVERVIEW:
Supabase detects pools table UPDATE →
  Broadcasts to passenger's usePoolRealtime subscription →
  Hook triggers fetchPoolData() → GET /api/pools/:poolId (with joins) →
  State update → TripProgress re-renders with driver info + updated status
```

**Step 1: Realtime event received**
- **File:** `Client/CarPoolApp/hooks/usePoolRealtime.ts`
- Channel: `pool-realtime:{poolId}` listening on `postgres_changes`
- Event: `pools` table UPDATE where `id = poolId`
- ⚠️ **Critical:** `payload.new` only has raw columns (driver_id, status) — NO relation data

**Step 2: Full API refetch (NOT partial merge)**
- Handler triggers `fetchPoolData()` — does NOT use realtime payload for state
- Calls `poolService.getPoolById(poolId)` → `GET /api/pools/:poolId`

**Step 3: Server returns enriched pool data**
- **File:** `Server/src/controllers/pool.controller.ts` → `getPool()`
```sql
SELECT *,
  pool_members(id, user_id, ride_id, join_type, join_score, joined_at, left_at),
  vehicles(vehicle_number, model, color),
  driver:users!driver_id(id, full_name, average_rating)
FROM pools WHERE id = poolId
```
- Filter members: `WHERE left_at IS NULL`
- Enrich each member with user profile + ride details
- **Response includes:**
  - `pool.status = 'READY_TO_START'` ← updated
  - `pool.driver_id = 'xxx'` ← newly set
  - `pool.driver = { id, full_name, average_rating }` ← relation data
  - `pool.vehicles = { vehicle_number, model, color }` ← relation data
  - `pool.pool_members = [{ user_id, ride, user, ... }]` ← enriched members

**Step 4: Hook updates state**
- **File:** `Client/CarPoolApp/hooks/usePoolRealtime.ts` → `setState()`
```typescript
setState(prev => ({
  ...prev,
  pool: response.data.pool,           // Full pool with driver
  members: pool.pool_members || [],   // Enriched members
  searchTiming: response.data.search_timing,
  loading: false,
  lastUpdated: new Date()
}));
```
- **Derived state automatically computed:**
  - `hasDriver = !!pool.driver_id` → `true`
  - `poolStatus = pool.status` → `'READY_TO_START'`
  - `coRiders = members.filter(m => m.user_id !== currentUserId).map(m => ({ name, pickup, dropoff, ... }))`

**Step 5: TripProgress re-renders**
- **File:** `Client/CarPoolApp/components/TripProgress.native.tsx`
- Consumes: `{ pool: poolDetails, hasDriver, poolStatus, coRiders, ... } = usePoolRealtime(poolId, userId, selectedPool)`
- **UI updates:**
  - Status text changes from "Waiting for driver..." → "Driver is on the way!"
  - Driver card appears: `poolDetails.driver.full_name`, `poolDetails.driver.average_rating`
  - Vehicle info: `poolDetails.vehicles.model`, `poolDetails.vehicles.vehicle_number`
  - Route fetched: `poolService.getCombinedRoute(poolId)` for map display
  - Co-riders section shows enriched member data

**Step 6: Polling fallback (if realtime fails)**
- If Supabase Realtime WebSocket connection fails → hook falls back to polling
- **Fast poll:** Every 3 seconds when disconnected
- **Change detection:** Compares `status`, `driver_id`, `memberCount`, `updated_at`
- When change detected → full `fetchPoolData()` refetch

---

### 25.8 Driver Starts the Ride

```
FLOW OVERVIEW:
Driver taps "Start Ride" → driverService.startRide() → Server updates pool + rides status →
  STARTED status broadcasts → Passenger apps update via realtime/polling
```

**Step 1: Driver taps "Start Ride"**
- **File:** `Client/DriverApp/src/components/pool/TripProgress.native.tsx` → start ride handler
- **File:** `Client/DriverApp/src/services/driver.service.ts` → `startRide()`
- **HTTP:** `POST /api/driver/ride/start` (no payload, auth only)

**Step 2: Server processes**
- **File:** `Server/src/controllers/driver.controller.ts` → `startRide()`
- Validate: user authenticated, has pool with `status = 'READY_TO_START'`
- Check: minimum 2 passengers

```sql
-- Update pool status
UPDATE pools SET status = 'STARTED', started_at = NOW()
WHERE driver_id = userId AND status = 'READY_TO_START'

-- Update all rides in pool
UPDATE rides SET status = 'STARTED', started_at = NOW()
WHERE pool_id = pool.id
```

- **Response:** `{ pool_id, status: 'STARTED', started_at }`

**Step 3: Realtime broadcasts to passengers**
- Supabase detects `pools` UPDATE → broadcasts to all passenger `usePoolRealtime` hooks
- Each passenger hook triggers `fetchPoolData()` → gets fresh pool with `status = 'STARTED'`
- **Passenger TripProgress UI:** Status text changes to "Trip in progress" / "Your ride has started!"

**Step 4: Driver app updates**
- Driver's `usePoolRealtime` hook also detects change → refetches
- Map shows active route with all passenger waypoints

---

### 25.9 Driver Picks Up a Passenger

```
FLOW OVERVIEW:
Driver arrives at pickup → taps "Picked Up" → driverService.markPickup(passengerId) →
  Server updates ride status → Passenger app shows "Picked up!" →
  Driver navigates to next stop
```

**Step 1: Driver taps "Picked Up"**
- **File:** `Client/DriverApp/src/components/pool/TripProgress.native.tsx` → pickup handler
- **File:** `Client/DriverApp/src/services/driver.service.ts` → `markPickup(passengerId)`
- **HTTP:** `POST /api/driver/pickup/:passengerId`

**Step 2: Server processes**
- **File:** `Server/src/controllers/driver.controller.ts` → `pickupPassenger()`
- Validate: ride exists for this passenger in the driver's active pool

```sql
UPDATE rides SET status = 'STARTED', picked_up_at = NOW()
WHERE user_id = passengerId AND pool_id = activePool.id
```

- **Response:** `{ passenger_id, ride_id, status: 'PICKED_UP' }`

**Step 3: Both apps update**
- **Driver UI:** Passenger card shows checkmark/picked-up state, navigate to next stop
- **Passenger UI:** TripProgress shows "Your driver has picked you up!" status

---

### 25.10 Driver Drops Off a Passenger

```
FLOW OVERVIEW:
Driver arrives at dropoff → taps "Drop Off" → driverService.markDropoff(passengerId) →
  Server marks ride complete → Billing dialog shown → Check if all dropped off
```

**Step 1: Driver taps "Drop Off"**
- **File:** `Client/DriverApp/src/components/pool/TripProgress.native.tsx` → dropoff handler
- **File:** `Client/DriverApp/src/services/driver.service.ts` → `markDropoff(passengerId)`
- **HTTP:** `POST /api/driver/dropoff/:passengerId`

**Step 2: Server processes**
- **File:** `Server/src/controllers/driver.controller.ts` → `dropoffPassenger()`

```sql
-- Mark ride complete
UPDATE rides SET status = 'COMPLETED', completed_at = NOW()
WHERE user_id = passengerId AND pool_id = activePool.id

-- Check remaining
SELECT COUNT(*) FROM rides
WHERE pool_id = activePool.id AND status != 'COMPLETED'
```

- **Response:** `{ passenger_id, ride_id, status: 'DROPPED_OFF', all_passengers_dropped: boolean }`

**Step 3: Billing dialog (driver app)**
- **File:** `Client/DriverApp/src/components/pool/PassengerBillingDialog.native.tsx`
- Shows fare breakdown: base fare, distance fare, platform fee (15%), net earnings
- Driver confirms/acknowledges

**Step 4: Passenger sees completion**
- Passenger's `usePoolRealtime` detects their ride status → `COMPLETED`
- TripProgress shows "Trip completed" with payment summary link
- Navigation: `router.replace('/payment-summary')`

---

### 25.11 Driver Completes the Ride (Pool)

```
FLOW OVERVIEW:
All passengers dropped off → Driver taps "Complete" →
  driverService.completeRide() → Server: pool → COMPLETED,
  driver → ONLINE, vehicle → available, earnings calculated →
  Both apps clean up state
```

**Step 1: Driver taps "Complete Ride"**
- **File:** `Client/DriverApp/src/services/driver.service.ts` → `completeRide()`
- **HTTP:** `POST /api/driver/ride/complete` (no payload)

**Step 2: Server processes**
- **File:** `Server/src/controllers/driver.controller.ts` → `completeRide()`
- Validate: all passengers must be dropped off

```sql
-- 1. Complete pool
UPDATE pools SET status = 'COMPLETED', completed_at = NOW()
WHERE id = activePool.id

-- 2. Return driver to online
UPDATE driver_sessions SET status = 'ONLINE'
WHERE driver_id = userId AND status = 'BUSY'

-- 3. Free vehicle
UPDATE vehicle_locations SET pool_id = NULL, is_available = true
WHERE driver_id = userId

-- 4. Record earnings
INSERT INTO driver_earnings {
  driver_id, pool_id,
  base_fare: fare_per_person × current_passengers,
  platform_commission: base_fare × 0.2,
  net_earnings: base_fare - commission,
  payment_status: 'PENDING'
}
```

- **Response:** `{ pool_id, status: 'COMPLETED', earnings: { total_fare, commission, net_earnings } }`

**Step 3: Driver app cleanup**
- **File:** `Client/DriverApp/src/store/useDriverStore.ts` → `setActivePool(null)`
- Navigate back to home screen
- Resume pool polling (driver is back to `ONLINE`)

**Step 4: Passenger app cleanup**
- Pool status `COMPLETED` detected via realtime/polling
- **File:** `Client/CarPoolApp/contexts/GlobalContext.tsx` → `endTrip()`
  - Clear `activeTrip` from state and AsyncStorage
  - Clear `selectedPool`
- Navigate to payment summary screen

---

### 25.12 Passenger Payment After Trip

```
FLOW OVERVIEW:
Trip completed notification → Navigate to payment-summary →
  Display fare breakdown → Process payment →
  Navigate to home with rating prompt
```

**Step 1: Navigate to payment summary**
- **File:** `Client/CarPoolApp/app/payment-summary.tsx` → renders `PaymentSummary` component
- **File:** `Client/CarPoolApp/components/PaymentSummary.native.tsx`
- Displays: fare breakdown, payment method selector, tip option

**Step 2: Process payment**
- **File:** `Client/CarPoolApp/services/payment.service.ts` → `processPayment()`
- **HTTP:** `POST /api/payments/process`
- **Payload:**
  ```json
  {
    "amount": 450,
    "ride_id": "uuid",
    "payment_method": "WALLET" | "CARD" | "MOBILE_BANKING" | "CASH",
    "idempotency_key": "uuid"
  }
  ```

**Step 3: Server processes payment**
- **File:** `Server/src/controllers/payment.controller.ts` → `processPayment()`
- RPC: `atomic_process_payment` → creates payment record
- Gateway processing:
  - WALLET: `walletService.debit(userId, amount, 'RIDE_PAYMENT', rideId)`
  - CASH: mark as success (driver collects)
  - CARD/MOBILE_BANKING: gateway integration placeholder (provider not wired)
- RPC: `complete_payment` → stores transaction_id, gateway response
- Audit log: `auditService.logUserAction('PAYMENT_COMPLETED', ...)`
- **Response:** `{ payment_id, status: 'COMPLETED', amount, transaction_id }`

**Step 4: Navigate to home with rating**
- "Done" button → `router.replace({ pathname: '/home', params: { showRating: true } })`

---

### 25.13 Rating Submission (Both Apps)

```
FLOW OVERVIEW:
Post-trip rating prompt → Submit rating → Server validates + stores →
  Update user's average rating
```

**Step 1: Rating UI**
- **CarPoolApp:** `Client/CarPoolApp/components/RateReview.native.tsx` or `RatingModal.native.tsx`
- **DriverApp:** Rating component in driver trip completion flow

**Step 2: Submit rating**
- **HTTP:** `POST /api/ratings`
- **Payload:**
  ```json
  {
    "ride_id": "uuid",
    "rated_user_id": "uuid",
    "rating": 4,
    "review": "Great driver!",
    "tags": ["Safe Driver", "Friendly"]
  }
  ```

**Step 3: Server processes**
- **File:** `Server/src/controllers/rating.controller.ts` → `submitRating()`
- Validates: user is participant in this ride, not self-rating, no duplicate
- Insert into `ratings` table
- Recalculate: `UPDATE users SET average_rating = AVG(all_ratings), total_ratings = COUNT(*)` for rated user
- **Response:** `{ rating_id, rating, message: 'Rating submitted successfully' }`

---

### 25.14 Driver Goes Offline

```
FLOW OVERVIEW:
Toggle tap → driverService.goOffline() → Server validates no active pool →
  End session, mark vehicle unavailable → Client stops polling + location watching
```

**Step 1: Driver taps toggle off**
- **File:** `Client/DriverApp/app/(tabs)/home.tsx` → `handleToggleOnline()` → `handleGoOffline()`
- **File:** `Client/DriverApp/src/services/driver.service.ts` → `goOffline()`
- **HTTP:** `POST /api/driver/go-offline`

**Step 2: Server processes**
- **File:** `Server/src/controllers/driver.controller.ts` → `goOffline()`

```sql
-- Check no active pool (prevents going offline mid-trip)
SELECT id FROM pools WHERE driver_id = userId
  AND status IN ('READY_TO_START', 'STARTED') LIMIT 1
-- Error if found → 400 ACTIVE_POOL_EXISTS

-- End session
UPDATE driver_sessions SET status = 'OFFLINE', ended_at = NOW()
WHERE driver_id = userId AND status = 'ONLINE'

-- Mark vehicle unavailable
UPDATE vehicle_locations SET is_active = false, is_available = false
WHERE driver_id = userId
```

- **Response:** `{ data: { status: 'OFFLINE' } }`

**Step 3: Client cleanup**
- `setDriverStatus('OFFLINE')` in Zustand store
- `setAvailablePools([])` — clear pool list
- Location watching cleanup (useEffect returns unsubscribe)
- Pool polling `clearInterval()`

---

### 25.15 Passenger Cancels a Pool

```
FLOW OVERVIEW:
Tap Cancel → leavePool/cancelPool API → Server removes member or cancels pool →
  GlobalContext.endTrip() → Navigate back to home
```

**Step 1: Passenger taps Cancel**
- **File:** `Client/CarPoolApp/components/TripProgress.native.tsx` → cancel handler
- If creator and only member: `poolService.cancelPool(poolId)` → `POST /api/pools/:poolId/cancel`
- If joiner: `poolService.leavePool(poolId)` → `POST /api/pools/:poolId/leave`

**Step 2: Server processes cancel**
- **File:** `Server/src/controllers/pool.controller.ts` → `cancelPool()` or `leavePool()`
- **Cancel (creator):**
  ```sql
  UPDATE pools SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = poolId
  UPDATE rides SET status = 'CANCELLED' WHERE pool_id = poolId
  ```
  - Notify all members: "Pool has been cancelled"
- **Leave (joiner):**
  ```sql
  UPDATE pool_members SET left_at = NOW() WHERE pool_id = poolId AND user_id = userId
  UPDATE pools SET current_passengers = current_passengers - 1 WHERE id = poolId
  UPDATE rides SET status = 'CANCELLED', pool_id = NULL WHERE user_id = userId AND pool_id = poolId
  ```
  - Recalculate fare for remaining members
  - Notify remaining members: "A rider has left the pool"

**Step 3: Client cleanup**
- **File:** `Client/CarPoolApp/contexts/GlobalContext.tsx` → `endTrip()`
- Clear `activeTrip` from state and AsyncStorage
- Navigate to home screen

---

### 25.16 Complete Data Flow Summary Tables

#### Passenger Scenarios — File Trace

| Scenario | Client Files | Service File | Server Route | Controller | Service | DB Tables |
|----------|-------------|-------------|-------------|------------|---------|-----------|
| **Create Pool** | `RideConfirmation.native.tsx` → `searching.tsx` | `pool.service.ts` | `POST /api/pools/create` | `pool.controller.ts` → `createPool()` | `poolMatching.service.ts`, `lookupTime.service.ts` | `rides`, `pools`, `pool_members` |
| **Search Pools** | `RideConfirmation.native.tsx` | `pool.service.ts` | `GET /api/pools/search` | `pool.controller.ts` → `searchPools()` | `poolMatching.service.ts` | `pools`, `pool_members`, `rides` |
| **Join Pool** | `RideConfirmation.native.tsx` → `searching.tsx` | `pool.service.ts`, `ride.service.ts` | `POST /api/rides/request` + `POST /api/pools/:id/join` | `pool.controller.ts` → `joinPool()` | `poolMatching.service.ts`, `rideEstimation.service.ts` | `rides`, `pools`, `pool_members` |
| **View Trip** | `TripProgress.native.tsx` | `pool.service.ts` | `GET /api/pools/:id` | `pool.controller.ts` → `getPool()` | — | `pools`, `pool_members`, `rides`, `users`, `vehicles` |
| **Cancel/Leave** | `TripProgress.native.tsx` | `pool.service.ts` | `POST /api/pools/:id/cancel` or `/leave` | `pool.controller.ts` | — | `pools`, `pool_members`, `rides` |
| **Payment** | `PaymentSummary.native.tsx` | `payment.service.ts` | `POST /api/payments/process` | `payment.controller.ts` | `wallet.service.ts` | `payments`, `wallets` |
| **Rating** | `RateReview.native.tsx` | — | `POST /api/ratings` | `rating.controller.ts` | — | `ratings`, `users` |

#### Driver Scenarios — File Trace

| Scenario | Client Files | Service File | Server Route | Controller | Service | DB Tables |
|----------|-------------|-------------|-------------|------------|---------|-----------|
| **Go Online** | `home.tsx` | `driver.service.ts` | `POST /api/driver/go-online` | `driver.controller.ts` → `goOnline()` | — | `driver_sessions`, `vehicle_locations`, `vehicles` |
| **Discover Pools** | `home.tsx` | `driver.service.ts` | `GET /api/driver/available-pools` | `driver.controller.ts` → `getAvailablePools()` | `h3.utils.ts` | `pools`, `pool_members`, `vehicle_locations` |
| **Accept Pool** | `home.tsx` | `driver.service.ts` | `POST /api/driver/pools/:id/accept` | `driver.controller.ts` → `acceptPool()` | `smartRoute.service.ts` | `pools` (RPC), `driver_sessions`, `vehicle_locations` |
| **Start Ride** | `TripProgress.native.tsx` | `driver.service.ts` | `POST /api/driver/ride/start` | `driver.controller.ts` → `startRide()` | — | `pools`, `rides` |
| **Pickup** | `TripProgress.native.tsx` | `driver.service.ts` | `POST /api/driver/pickup/:id` | `driver.controller.ts` → `pickupPassenger()` | — | `rides` |
| **Dropoff** | `TripProgress.native.tsx` | `driver.service.ts` | `POST /api/driver/dropoff/:id` | `driver.controller.ts` → `dropoffPassenger()` | — | `rides` |
| **Complete Ride** | `TripProgress.native.tsx` | `driver.service.ts` | `POST /api/driver/ride/complete` | `driver.controller.ts` → `completeRide()` | — | `pools`, `driver_sessions`, `vehicle_locations`, `driver_earnings` |
| **Go Offline** | `home.tsx` | `driver.service.ts` | `POST /api/driver/go-offline` | `driver.controller.ts` → `goOffline()` | — | `driver_sessions`, `vehicle_locations` |

#### Realtime Update Propagation

| Event | Source | Supabase Table | Passenger Hook Action | Driver Hook Action |
|-------|--------|---------------|----------------------|-------------------|
| Driver accepts pool | `atomic_accept_pool` RPC | `pools` UPDATE | `fetchPoolData()` → full refetch with joins | `fetchPoolData()` → `getActivePool()` |
| New member joins | `atomic_join_pool` RPC | `pool_members` INSERT | `fetchPoolData()` → updated members + fare | — |
| Member leaves | `leavePool()` | `pool_members` UPDATE | `fetchPoolData()` → updated members + fare | — |
| Ride started | `startRide()` | `pools` UPDATE | `fetchPoolData()` → `status: STARTED` | `fetchPoolData()` → `status: STARTED` |
| Passenger picked up | `pickupPassenger()` | `rides` UPDATE | `fetchPoolData()` → ride status updated | `fetchPoolData()` → passenger status |
| Passenger dropped off | `dropoffPassenger()` | `rides` UPDATE | `fetchPoolData()` → ride completed | `fetchPoolData()` → passenger done |
| Pool completed | `completeRide()` | `pools` UPDATE | `fetchPoolData()` → `status: COMPLETED` → `endTrip()` | `fetchPoolData()` → cleanup |
| Pool cancelled | `cancelPool()` | `pools` UPDATE | `fetchPoolData()` → `status: CANCELLED` → `endTrip()` | — |
| New message | `sendMessage()` | `messages` INSERT | Increment `unreadCount` for sender | — |
