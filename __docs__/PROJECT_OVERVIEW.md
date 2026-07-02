# RidePool - Complete Project Documentation

> A production-grade carpooling platform built for Bangladesh, enabling shared rides with smart matching, real-time tracking, and cost-effective transportation.

**Version:** 1.2.0  
**Last Updated:** 2026-05-31  
**Repository Structure:** Monorepo with Server + CarPoolApp (Rider) + DriverApp + Shared Types

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Vision & Goals](#project-vision--goals)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Package Structure](#package-structure)
6. [Core Features](#core-features)
7. [User Flows](#user-flows)
8. [Pool Matching Algorithm](#pool-matching-algorithm)
9. [Fare Calculation System](#fare-calculation-system)
10. [Database Schema](#database-schema)
11. [API Reference](#api-reference)
12. [Security Architecture](#security-architecture)
13. [Integration Status](#integration-status)
14. [Deployment & Scaling](#deployment--scaling)
15. [Financial Analysis](#financial-analysis)

---

## Executive Summary

**RidePool** is a comprehensive ride-sharing platform designed specifically for the Bangladesh market (with focus on Dhaka). The platform enables passengers to share rides going in similar directions, significantly reducing individual travel costs while providing safe, reliable transportation.

### What Makes RidePool Unique

| Feature | Description |
|---------|-------------|
| **Smart Pool Matching** | Uses H3 hexagonal geospatial indexing for sub-millisecond matching of riders heading similar directions |
| **Cost Savings** | Riders save 25-40% compared to solo rides through intelligent pooling |
| **Safety-First Design** | Female-only ride options, SOS alerts, emergency contacts, trip sharing |
| **Social Features** | Priyo Sathi (trusted companions) - ride preferentially with friends |
| **Realtime Updates** | Supabase Realtime channels with polling fallback in clients |
| **Payment Flexibility** | Wallet + cash flows live; card/mobile banking gateway placeholders |
| **Offline Resilience** | Continues working during network interruptions |

### Key Metrics

| Metric | Value |
|--------|-------|
| Database Tables | 40+ |
| API Endpoints | 120+ |
| Route Files | 22 |
| Controllers | 23 |
| Services | 37 |
| Middleware | 8 |
| CarPoolApp Screens | 34 |
| CarPoolApp Components | 192 |
| DriverApp Screens | 12 |
| DriverApp Components | 87 |
| Shared Type Definitions | 80+ interfaces/types |
| Unit Test Files | 15+ |

---

## Project Vision & Goals

### Vision
To revolutionize urban transportation in Bangladesh by making carpooling the default choice for daily commutes, reducing traffic congestion, lowering individual transportation costs, and decreasing carbon emissions.

### Primary Goals

1. **Affordable Transportation**
   - Reduce individual ride costs by 25-40% through intelligent pooling
   - Provide transparent, predictable pricing
   - Enable wallet-based payments for convenience

2. **Safe & Reliable Service**
   - Female-only ride options for women's safety
   - Real-time trip sharing with emergency contacts
   - SOS button with instant alerts
   - Driver & passenger verification systems

3. **Efficient Matching**
   - Match riders within 40 seconds
   - Minimize detour time for all passengers
   - Optimize routes for multiple pickups/dropoffs

4. **Platform Sustainability**
   - 20% platform commission model
   - Scalable from MVP ($0/month) to enterprise ($1,500+/month)
   - Path to profitability at 5,000+ DAU

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────┐              ┌─────────────────────┐               │
│  │     CarPoolApp      │              │      DriverApp      │               │
│  │   (Rider Mobile)    │              │   (Driver Mobile)   │               │
│  │  Expo 54 + React    │              │  Expo 54 + React    │               │
│  │  Native 0.81        │              │  Native 0.81        │               │
│  └──────────┬──────────┘              └──────────┬──────────┘               │
└─────────────┼────────────────────────────────────┼──────────────────────────┘
              │              HTTPS/WSS             │
              └────────────────┬───────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EDGE LAYER (OPTIONAL)                               │
│  ┌──────────────────┐  ┌──────────────────────────┐                          │
│  │      Nginx       │  │     Rate Limiting        │                          │
│  │ (Reverse Proxy)  │  │  (per endpoint/user)     │                          │
│  └──────────────────┘  └──────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    Express.js 5.1 + TypeScript                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                         CONTROLLERS                              │   │ │
│  │  │  Auth │ User │ Ride │ Pool │ Driver │ Payment │ Safety │ etc.   │   │ │
│  │  └───────────────────────────┬─────────────────────────────────────┘   │ │
│  │                              │                                          │ │
│  │  ┌───────────────────────────▼─────────────────────────────────────┐   │ │
│  │  │                          SERVICES                                │   │ │
│  │  │  PoolMatching │ Fare │ Cache │ Notification │ GoogleMaps │ etc.  │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    SUPABASE     │  │      REDIS      │  │    EXTERNAL     │
│  ┌───────────┐  │  │  ┌───────────┐  │  │     APIS        │
│  │PostgreSQL │  │  │  │  Cache    │  │  │  ┌───────────┐  │
│  │ + PostGIS │  │  │  │  Routes   │  │  │  │Google Maps│  │
│  ├───────────┤  │  │  │  Pools    │  │  │  ├───────────┤  │
│  │   Auth    │  │  │  │  Sessions │  │  │  │   FCM     │  │
│  ├───────────┤  │  │  └───────────┘  │  │  ├───────────┤  │
│  │ Realtime  │  │  │                 │  │  │  Gateway  │  │
│  ├───────────┤  │  │  ┌───────────┐  │  │  │  Placeholder│ │
│  │    RLS    │  │  │  │  BullMQ   │  │  │  └───────────┘  │
│  └───────────┘  │  │  │  (Jobs)   │  │  │                 │
└─────────────────┘  │  └───────────┘  │  └─────────────────┘
                     └─────────────────┘
```

### Request Flow

```
1. Client Request (Mobile App)
         │
         ▼
2. Nginx (optional reverse proxy)
         │
         ▼
3. Express Middleware Pipeline
   ├── Security Headers (Helmet)
   ├── Input Sanitization
  ├── CORS Configuration
   ├── Authentication (JWT via Supabase)
   ├── Request Logging (Morgan + Winston)
   └── Rate Limiting
         │
         ▼
4. Route → Controller
   ├── Input Validation (Zod schemas)
   ├── Authorization Check
   └── Call Service Layer
         │
         ▼
5. Service Layer (Business Logic)
   ├── Cache Check (Redis/Memory)
   ├── Database Operations
   ├── External API Calls
   └── Notifications
         │
         ▼
6. Response
   └── Formatted JSON { success, data, message }
```

---

## Technology Stack

### Backend (Server)

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Node.js 20+ | JavaScript runtime |
| **Framework** | Express.js 5.1 | Web server |
| **Language** | TypeScript 5.9 | Type safety |
| **Database** | PostgreSQL (Supabase) | Primary data store |
| **Cache** | Redis / In-memory | Performance optimization |
| **Geospatial** | H3-js 4.3 + PostGIS | Location indexing |
| **Auth** | Supabase Auth | JWT authentication |
| **Validation** | Zod v4 | Schema validation |
| **Queue** | BullMQ 5.66 | Background jobs (defined, not initialized in app.ts) |
| **Circuit Breaker** | Opossum 9.0 | Fault tolerance |
| **Testing** | Vitest 4.0 | Unit & integration tests |
| **Logging** | Winston 3.19 | Structured logging |

### Mobile Apps (CarPoolApp & DriverApp)

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | React Native 0.81.5 | Cross-platform mobile |
| **Build System** | Expo 54 | Development & deployment |
| **Routing** | Expo Router 6 | File-based navigation |
| **State** | Zustand 5.0 | Global state management |
| **Context** | React Context | Auth, theme, notifications |
| **Styling** | NativeWind 4.2 + Tailwind 3.4 | Utility-first CSS |
| **Maps (Native)** | react-native-maps 1.20 | Native Google Maps |
| **Maps (Web)** | Leaflet 1.9 + react-leaflet 5.0 | Web platform maps |
| **Storage** | AsyncStorage | Local persistence |
| **Icons** | Lucide React Native 0.548 | Consistent iconography |
| **Testing** | Jest (CarPoolApp) / Jest 30 (DriverApp) | Component testing |

### Shared Types

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Package** | @ridepool/shared-types | Shared type definitions |
| **Language** | TypeScript 5.0 | Type safety across packages |
| **Domains** | User, Ride, Pool, Driver, Payment, etc. | 81+ interfaces/types across 9 modules |

### External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| **Maps & Routing** | Google Maps | Route calculation, traffic-aware ETA, deep links |
| **Push Notifications** | Firebase Cloud Messaging | Push alerts (FCM key required) |
| **Payments** | Wallet + gateway placeholders | Card/mobile banking integrations not wired |
| **Database** | Supabase | PostgreSQL + Auth + Realtime |
| **Edge/CDN** | Optional | Reverse proxy/CDN if deployed (not required by code) |

---

## Package Structure

```
Carpool-dev/
├── Server/                         # Backend API Server
│   ├── src/
│   │   ├── app.ts                  # Express application entry
│   │   ├── config/                 # Environment & service configs
│   │   │   ├── constants.ts        # App constants
│   │   │   ├── env.ts              # Centralized configuration
│   │   │   └── supabase.ts         # Supabase client
│   │   ├── controllers/            # Request handlers (23 files)
│   │   │   ├── auth.controller.ts
│   │   │   ├── pool.controller.ts
│   │   │   ├── driver.controller.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── heatmap.controller.ts
│   │   │   ├── i18n.controller.ts
│   │   │   ├── navigation.controller.ts
│   │   │   ├── shift.controller.ts
│   │   │   └── ... (15 more)
│   │   ├── services/               # Business logic (37 files)
│   │   │   ├── poolMatching.service.ts
│   │   │   ├── fare.service.ts
│   │   │   ├── googleMaps.service.ts
│   │   │   ├── smartRoute.service.ts
│   │   │   ├── routeOverlap.service.ts
│   │   │   ├── heatmap.service.ts
│   │   │   ├── geofencing.service.ts
│   │   │   ├── fraudDetection.service.ts
│   │   │   ├── voiceNavigation.service.ts
│   │   │   ├── circuitBreaker.service.ts
│   │   │   └── ... (27 more)
│   │   ├── middleware/             # Request pipeline (8 files)
│   │   │   ├── auth.ts             # JWT authentication
│   │   │   ├── validation.ts       # Input validation
│   │   │   ├── rateLimiter.ts      # Rate limiting
│   │   │   ├── errorHandler.ts     # Error handling
│   │   │   ├── inputSanitizer.ts   # XSS/injection protection
│   │   │   ├── securityHeaders.ts  # Helmet security headers
│   │   │   ├── authorization.ts    # Role-based access
│   │   │   └── auditMiddleware.ts  # Audit logging
│   │   ├── routes/                 # API routes (22 files)
│   │   │   ├── auth.routes.ts
│   │   │   ├── pool.routes.ts
│   │   │   ├── driver.routes.ts
│   │   │   ├── analytics.routes.ts
│   │   │   ├── heatmap.routes.ts
│   │   │   ├── navigation.routes.ts
│   │   │   ├── shift.routes.ts
│   │   │   ├── i18n.routes.ts
│   │   │   └── ... (14 more)
│   │   ├── types/                  # TypeScript types
│   │   └── utils/                  # Utilities (H3, logging)
│   ├── supabase/migrations/        # Database migrations (5 files)
│   ├── tests/                      # Test suites
│   │   ├── unit/                   # 18 unit test files
│   │   └── integration/
│   ├── scripts/                    # Utility scripts
│   ├── nginx/                      # Nginx configuration
│   ├── Dockerfile                  # Container build
│   ├── docker-compose.yml          # Production setup
│   ├── docker-compose.mvp.yml      # MVP setup (no Redis)
│   └── package.json
│
├── Client/
│   ├── CarPoolApp/                 # Rider Mobile App
│   │   ├── app/                    # Expo Router screens (34 files)
│   │   │   ├── (tabs)/             # Tab navigation
│   │   │   │   ├── index.tsx       # Home tab
│   │   │   │   └── explore.tsx     # Explore tab
│   │   │   ├── _layout.tsx         # Root layout
│   │   │   ├── home.tsx            # Home screen
│   │   │   ├── login.tsx           # Authentication
│   │   │   ├── ride-confirmation.tsx
│   │   │   ├── searching.tsx       # Pool search
│   │   │   ├── trip-progress.tsx   # Active trip
│   │   │   ├── wallet.tsx          # Payment wallet
│   │   │   ├── safety-center.tsx   # Safety features
│   │   │   ├── friends.tsx         # Priyo Sathi
│   │   │   └── ... (24 more screens)
│   │   ├── components/             # Reusable components (192 files)
│   │   │   ├── HomeMap.tsx         # Map components (native/web)
│   │   │   ├── TripProgress.tsx    # Trip tracking
│   │   │   ├── RideConfirmation.tsx
│   │   │   ├── WalletScreen.tsx
│   │   │   ├── SafetyCenter.tsx
│   │   │   ├── ui/                 # Base UI components
│   │   │   └── figma/              # Figma-derived components
│   │   ├── contexts/               # React contexts (3 files)
│   │   │   ├── AuthContext.tsx     # Authentication state
│   │   │   ├── GlobalContext.tsx   # App-wide state
│   │   │   └── NotificationContext.tsx
│   │   ├── hooks/                  # Custom hooks (11 files)
│   │   │   ├── useAuth.ts          # Auth utilities
│   │   │   ├── usePoolRealtime.ts  # Pool subscriptions
│   │   │   ├── useChatRealtime.ts  # Chat subscriptions
│   │   │   ├── useLocation.ts      # GPS tracking
│   │   │   ├── usePayments.ts      # Payment operations
│   │   │   └── ... (6 more)
│   │   ├── services/               # API services (9 files)
│   │   │   ├── auth.service.ts
│   │   │   ├── pool.service.ts
│   │   │   ├── ride.service.ts
│   │   │   ├── driver.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── safety.service.ts
│   │   │   ├── messaging.service.ts
│   │   │   ├── priyoSathi.service.ts
│   │   │   └── googleMapsService.ts
│   │   ├── store/                  # Zustand store
│   │   │   └── useAppStore.ts      # Global app state
│   │   └── package.json
│   │
│   └── DriverApp/                  # Driver Mobile App
│       ├── app/                    # Expo Router screens (12 files)
│       │   ├── (tabs)/             # Tab navigation
│       │   │   ├── _layout.tsx     # Tab layout
│       │   │   ├── home.tsx        # Pool discovery
│       │   │   ├── earnings.tsx    # Earnings tracking
│       │   │   └── profile.tsx     # Driver profile
│       │   ├── _layout.tsx         # Root layout
│       │   ├── index.tsx           # Entry screen
│       │   ├── register.tsx        # Driver registration
│       │   ├── trip-progress.tsx   # Active trip management
│       │   ├── settings.tsx        # App settings
│       │   ├── safety.tsx          # Safety features
│       │   └── help.tsx            # Help & support
│       ├── src/
│       │   ├── components/         # UI components (87 files)
│       │   │   ├── driver/         # Driver-specific components
│       │   │   ├── home/           # Home screen components
│       │   │   ├── pool/           # Pool-related components
│       │   │   ├── map/            # Map components
│       │   │   ├── screens/        # Screen components
│       │   │   ├── layout/         # Layout components
│       │   │   └── ui/             # Base UI components
│       │   ├── services/           # API services (4 files)
│       │   │   ├── auth.service.ts
│       │   │   ├── driver.service.ts
│       │   │   ├── location.service.ts
│       │   │   └── notification.service.ts
│       │   ├── hooks/              # Custom hooks
│       │   │   └── usePoolRealtime.ts
│       │   ├── store/              # Zustand store
│       │   │   └── useDriverStore.ts
│       │   ├── contexts/           # React contexts
│       │   ├── config/             # App configuration
│       │   ├── utils/              # Utilities
│       │   └── types/              # TypeScript types
│       └── package.json
│
├── shared/                         # Shared Type Definitions
│   ├── src/
│   │   ├── index.ts                # Export hub
│   │   ├── user.ts                 # User & Auth types
│   │   ├── ride.ts                 # Ride & Pool types
│   │   ├── driver.ts               # Driver & Vehicle types
│   │   ├── payment.ts              # Payment & Wallet types
│   │   ├── messaging.ts            # Chat types
│   │   ├── safety.ts               # Safety types
│   │   ├── api.ts                  # API types
│   │   └── misc.ts                 # Ratings, Promo, etc.
│   └── package.json
│
├── __docs__/                       # Documentation
│   ├── PROJECT_OVERVIEW.md         # This file
│   ├── architecture/               # Architecture docs
│   ├── database/                   # Schema documentation
│   ├── security/                   # Security guidelines
│   ├── operations/                 # Deployment & ops
│   ├── troubleshooting/            # Troubleshooting guides
│   └── planning/                   # Planning documents
│
├── .github/workflows/              # CI/CD (5 files)
│   ├── ci.yml                      # Main CI pipeline
│   ├── codeql.yml                  # Security scanning
│   ├── e2e.yml                     # End-to-end tests
│   ├── expo-preview.yml            # Expo preview builds
│   └── security-scan.yml           # Security audits
│
└── package.json                    # Root package.json
```

---

## Core Features

### 1. Smart Pool Matching

The heart of RidePool - automatically matching riders heading in similar directions.

**How It Works:**
1. User requests a ride (pickup → destination)
2. System converts locations to H3 hexagons (geospatial indexing)
3. Database query finds pools within search radius
4. Scoring algorithm ranks pools by compatibility
5. Top matches enriched with Google Maps routes
6. User selects preferred pool or creates new one

**Key Technologies:**
- **H3 Hexagonal Indexing**: Resolution 9 for pickups (~174m precision), Resolution 7 for destinations (~1.2km precision)
- **Multi-phase scoring**: Distance + Route overlap + Hexagon matching + Destination proximity
- **Cache optimization**: Routes cached for 10 minutes, reducing API costs by 66%
- **Smart Route Service**: Traffic-aware combined routing with optimized waypoint ordering

### 2. Real-time Tracking

Live updates throughout the entire ride lifecycle.

**Technologies:**
- **Supabase Realtime**: WebSocket subscriptions to pools and pool_members tables
- **Polling Fallback**: 3-second fast polling when WebSocket disconnected
- **Background Location**: Continuous GPS tracking during active rides

**Data Synced:**
- Pool status changes
- New members joining
- Driver location updates
- Message notifications

### 3. Fare Calculation & Savings

Transparent, predictable pricing with significant savings.

**Formula:**
```
Base Fare (CAR: ৳50, CNG: ৳30)
+ Distance Fare (৳15/km)
+ Time Fare (৳2/minute)
- Pool Discount (25-40% based on passengers)
- Full Pool Bonus (5% if 4 passengers)
+ Platform Surcharge (৳10)
= Final Fare Per Person
```

**Savings Example:**
- Solo ride: ৳155
- Pool ride (2 passengers): ৳65 each
- **Savings: ৳90 per person (58%)**

### 4. Safety Features

**Female-Only Rides:**
- Women can request rides with only female co-passengers
- Enforced at matching level - no mixed pools

**Emergency SOS:**
- One-tap emergency alert
- Automatically shares location with emergency contacts
- Notifies backend for incident tracking

**Trip Sharing:**
- Share live trip link with friends/family
- Real-time location visible without app installation

**Emergency Contacts:**
- Store up to 5 trusted contacts
- Auto-notified on SOS or trip share

### 5. Priyo Sathi (Trusted Companions)

Social feature allowing preferential matching with friends.

**Features:**
- Add up to 5 trusted companions
- Auto-matching when both heading similar direction
- Max 7 minutes detour time, 1km detour distance
- Notification when friend is going your way

### 6. Driver Features

**Pool Discovery:**
- Map view of nearby available pools
- Push notifications for new pool requests
- Supabase Realtime with polling fallback (fast 3s / slow 30s)
- Filter by vehicle type and preferences

**Ride Management:**
- Accept/reject pool requests
- Mark individual passenger pickups/dropoffs
- Optimized multi-stop navigation via smart route service
- Per-passenger earnings display
- Traffic-aware combined route calculation

**Earnings Tracking:**
- Daily/weekly/monthly breakdown
- 20% platform commission (driver keeps 80%)
- Performance bonuses for completed rides
- Real-time earnings updates

**Shift Management:**
- Track online/offline hours
- Shift-based earnings reporting
- Availability scheduling

### 7. Wallet & Payments

**Prepaid Wallet System:**
- Add funds via wallet top-up (card/mobile banking placeholders)
- Automatic payment on ride completion
- Transaction history

**Payment Flow:**
1. Ride completes → Fare calculated
2. Wallet debited automatically
3. Driver credited (minus commission)
4. Receipt notification sent

### 8. Advanced Features

**Analytics & Heatmaps:**
- Demand heatmap visualization
- Pool density analytics
- Driver availability tracking
- Peak hour insights

**Internationalization (i18n):**
- Multi-language support
- Localized content delivery
- Bengali and English support

**Voice Navigation:**
- Turn-by-turn voice instructions
- Traffic-aware routing updates
- Multi-language voice support

**Geofencing:**
- Service area boundaries
- Pickup/dropoff zone validation
- Restricted area detection

**Fraud Detection:**
- Suspicious activity monitoring
- Rate abuse prevention
- Location spoofing detection

**Offline Support:**
- Offline data synchronization
- Queue-based request handling
- Graceful degradation

---

## User Flows

### Rider: Book a Pool Ride

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. HOME SCREEN                                                  │
│    • Auto-detect current location                               │
│    • Enter destination via search                               │
│    • Select ride type (Regular / Female Only)                   │
│    • Select vehicle type (CAR / CNG)                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SEARCHING (40 seconds)                                       │
│    • System searches for matching pools                         │
│    • H3 geospatial indexing for fast matching                   │
│    • Option to "Extend Search" or "Create Pool"                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. RIDE CONFIRMATION                                            │
│    • View available pools with:                                 │
│      - Fare per person                                          │
│      - Savings vs solo ride                                     │
│      - Current passengers                                       │
│      - ETA to pickup                                            │
│    • Select pool to join OR create new                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. WAITING FOR DRIVER                                           │
│    • Pool status updates in real-time                           │
│    • Chat with co-riders                                        │
│    • Driver accepts → transition to active trip                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. TRIP PROGRESS                                                │
│    • Live driver location on map                                │
│    • Optimized route with all pickup/dropoff points             │
│    • Chat with driver & co-riders                               │
│    • SOS button for emergencies                                 │
│    • Driver marks your pickup/dropoff                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. RIDE COMPLETE                                                │
│    • Rate driver & co-riders                                    │
│    • View fare breakdown                                        │
│    • Payment auto-processed from wallet                         │
│    • Receipt available in ride history                          │
└─────────────────────────────────────────────────────────────────┘
```

### Driver: Accept & Complete Pool

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. GO ONLINE                                                    │
│    • Toggle online status                                       │
│    • GPS location tracking starts                               │
│    • System updates driver_sessions & vehicle_locations         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. POOL DISCOVERY                                               │
│    • Map shows nearby available pools                           │
│    • Push notifications for new requests                        │
│    • Supabase Realtime with polling fallback (3s/30s)           │
│    • View pool details: passengers, earnings, distance          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. ACCEPT POOL                                                  │
│    • Tap pool → View details sheet                              │
│    • Accept → Atomic assignment (prevents race conditions)      │
│    • Driver status → BUSY                                       │
│    • Navigation link generated                                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. TRIP PROGRESS                                                │
│    • Optimized route displayed                                  │
│    • Navigate via Google Maps deep link                         │
│    • For each passenger:                                        │
│      - Mark PICKUP when they board                              │
│      - Mark DROPOFF when they exit                              │
│    • Per-passenger earnings shown                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. COMPLETE RIDE                                                │
│    • All passengers dropped off                                 │
│    • Rate passengers (optional)                                 │
│    • Earnings added to daily total                              │
│    • Return to online status                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pool Matching Algorithm

### Overview

The pool matching system uses a **3-phase approach** to efficiently match riders:

```
PHASE 1: DATABASE FILTERING (SQL + H3)
         ↓
PHASE 2: COMPATIBILITY SCORING (In-memory)
         ↓
PHASE 3: GOOGLE MAPS ENRICHMENT (Top candidates only)
```

### Phase 1: Database Filtering

**H3 Geospatial Indexing:**
- Convert pickup/dropoff to H3 hexagons
- Pickup: Resolution 9 (~174m hexagons) → 6-ring search = 2.1km radius
- Destination: Resolution 7 (~1.2km hexagons) → 2-ring search = 4.8km radius

**SQL Query Filters:**
- Vehicle type matches (CAR/CNG)
- Status is WAITING_FOR_RIDERS or WAITING_FOR_DRIVER
- Has available capacity
- H3 index overlap with search area
- Not user's own pool
- Respects gender preferences

**Result:** ~50-200 candidate pools

### Phase 2: Compatibility Scoring

Each pool is scored (max 100 points):

| Component | Max Points | Formula |
|-----------|-----------|---------|
| Distance Score | 25 | Closer pickup = higher score |
| Route Overlap | 35 | % of route overlap × 35 |
| Common Hexagons | 20 | Shared H3 hexagons ratio × 20 |
| Destination Proximity | 10 | Closer destination = higher |
| Exact Pickup Match | +5 | Bonus if same H3 hexagon |
| Exact Destination Match | +5 | Bonus if same H3 hexagon |

**Minimum Threshold:** Score ≥ 30 required

### Phase 3: Google Maps Enrichment

For top 3-5 pools only:
- Fetch exact routes from Directions API
- Calculate precise ETA with traffic
- Generate polylines for map display
- Cache results for 10 minutes

### Example Matching

```
User Request: Gulshan 2 → Dhanmondi
              
Step 1: H3 Encoding
├─ Pickup H3 (res 9): "897325647821"
└─ Dropoff H3 (res 7): "8733216"

Step 2: DB Query finds 150 candidate pools

Step 3: Score each pool
│
│ Pool A (Gulshan → Dhanmondi):
│   ├─ Distance: 0.3km away → 24 pts
│   ├─ Route overlap: 92% → 32 pts
│   ├─ Common hexagons: 8/12 → 13 pts
│   ├─ Destination: 0.5km away → 9 pts
│   ├─ Exact pickup match: +5 pts
│   └─ Exact destination: +5 pts
│   TOTAL: 88/100 ✓
│
│ Pool B (Baridhara → Dhanmondi):
│   ├─ Distance: 1.2km away → 18 pts
│   ├─ Route overlap: 75% → 26 pts
│   └─ ... TOTAL: 62/100 ✓

Step 4: Return [Pool A, Pool B, Pool C, ...]
Step 5: Enrich top 3 with Google Maps routes
```

---

## Fare Calculation System

### Components

| Component | Rate | Description |
|-----------|------|-------------|
| **Base Fare** | CAR: ৳50, CNG: ৳30 | Fixed starting fare |
| **Distance Fare** | ৳15/km | Per kilometer charge |
| **Time Fare** | ৳2/min | Per minute charge |
| **Platform Surcharge** | ৳10 | Fixed platform fee |

### Pool Discounts

| Passengers | Discount |
|------------|----------|
| 2 | 25% |
| 3 | 35% |
| 4 | 40% |
| 4 (Full Pool Bonus) | +5% additional |

### Calculation Example

```
Ride: 5km, 15 minutes, CAR, 2 passengers

Base Fare:       ৳50
Distance (5km):  ৳75  (5 × ৳15)
Time (15min):    ৳30  (15 × ৳2)
─────────────────────
Subtotal:        ৳155

Pool Discount (25%): -৳39
─────────────────────
After Discount:  ৳116

Per Person:      ৳58  (৳116 ÷ 2)
Platform Fee:    ৳10
─────────────────────
Final Charge:    ৳68 per person

SAVINGS vs SOLO: ৳87 per person (56%)
```

### Driver Earnings

```
Total Fare Collected: ৳136 (৳68 × 2 riders)
Platform Commission (20%): -৳27
─────────────────────
Driver Earnings: ৳109

Daily Bonus: +৳100 per 3 completed rides
```

---

## Database Schema

### Core Tables (44 total)

#### User Domain
| Table | Purpose |
|-------|---------|
| `users` | User accounts, profiles, preferences |
| `user_preferences` | Ride preferences (music, AC, pets) |
| `emergency_contacts` | Up to 5 emergency contacts |
| `saved_places` | Home, work, favorite locations |
| `priyo_sathi` | Trusted companion relationships |
| `device_tokens` | Push notification tokens |

#### Ride & Pool Domain
| Table | Purpose |
|-------|---------|
| `rides` | Individual ride requests |
| `pools` | Carpooling groups |
| `pool_members` | Pool membership records |
| `pool_invites` | Pending pool invitations |

#### Driver Domain
| Table | Purpose |
|-------|---------|
| `vehicles` | Driver vehicles |
| `vehicle_locations` | Real-time driver GPS |
| `driver_sessions` | Online/offline/busy status |
| `driver_ratings` | Driver rating history |

#### Payment Domain
| Table | Purpose |
|-------|---------|
| `wallets` | User wallet balances |
| `wallet_transactions` | Credit/debit history |
| `payments` | Ride payment records |
| `promo_codes` | Discount codes |
| `user_promo_usage` | Promo usage tracking |
| `promise_money_transactions` | Security deposit tracking |

#### Messaging Domain
| Table | Purpose |
|-------|---------|
| `conversations` | Chat threads |
| `messages` | Individual messages |
| `conversation_participants` | Thread membership |

#### Safety Domain
| Table | Purpose |
|-------|---------|
| `safety_incidents` | Reported incidents |
| `ride_sharing` | Trip sharing records |
| `sos_requests` | Emergency SOS records |

#### System Domain
| Table | Purpose |
|-------|---------|
| `notifications` | In-app notifications |
| `audit_logs` | Admin action logs |
| `app_metadata` | App configuration |
| `route_cache` | Cached route data |
| `demand_heatmap_cache` | Demand analytics |

### Key Indexes

```sql
-- H3 geospatial indexes for fast pool matching
CREATE INDEX idx_pools_pickup_h3 ON pools(pickup_h3_index);
CREATE INDEX idx_pools_dest_h3 ON pools(destination_h3_index);
CREATE INDEX idx_vehicle_locations_h3 ON vehicle_locations(h3_index_res8);

-- Status-based indexes for common queries
CREATE INDEX idx_pools_status ON pools(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_rides_status ON rides(status) WHERE deleted_at IS NULL;
```

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Drivers can access pool/ride data they're assigned to
- Pool members can see co-rider information
- Admins have full access for moderation

---

## API Reference

### Route Modules (22 route files, 153+ endpoints)

| Module | Base Path | Description |
|--------|-----------|-------------|
| `auth.routes.ts` | `/auth` | Authentication & registration |
| `user.routes.ts` | `/users` | User profiles & preferences |
| `pool.routes.ts` | `/pools` | Pool search, create, join, route |
| `ride.routes.ts` | `/rides` | Ride requests & history |
| `driver.routes.ts` | `/driver` | Driver operations & earnings |
| `payment.routes.ts` | `/payments` | Payment processing |
| `wallet.routes.ts` | `/wallet` | Wallet operations |
| `safety.routes.ts` | `/safety` | SOS & incident reporting |
| `priyoSathi.routes.ts` | `/priyo-sathi` | Trusted companions |
| `rating.routes.ts` | `/ratings` | User & driver ratings |
| `rideSharing.routes.ts` | `/sharing` | Trip sharing links |
| `messaging.routes.ts` | `/messages` | In-app messaging |
| `promo.routes.ts` | `/promos` | Promo code management |
| `savedPlaces.routes.ts` | `/saved-places` | Saved locations |
| `emergencyContacts.routes.ts` | `/emergency-contacts` | Emergency contacts |
| `analytics.routes.ts` | `/analytics` | Usage analytics |
| `heatmap.routes.ts` | `/heatmap` | Demand heatmaps |
| `shift.routes.ts` | `/shifts` | Driver shift management |
| `offline.routes.ts` | `/offline` | Offline sync |
| `navigation.routes.ts` | `/navigation` | Navigation & voice |
| `i18n.routes.ts` | `/i18n` | Internationalization |

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Create new account |
| `/auth/login` | POST | Authenticate user |
| `/auth/logout` | POST | End session |
| `/auth/refresh` | POST | Refresh JWT token |
| `/auth/me` | GET | Get current user |
| `/auth/verify-email` | POST | Email verification |
| `/auth/reset-password` | POST | Password reset |

### Users

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/profile` | GET/PUT | User profile |
| `/users/preferences` | GET/PUT | Ride preferences |
| `/users/saved-places` | GET/POST/DELETE | Saved locations |
| `/users/emergency-contacts` | GET/POST/DELETE | Emergency contacts |
| `/users/priyo-sathi` | GET/POST/DELETE | Trusted companions |
| `/users/device-token` | POST | Register push token |

### Rides

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rides/estimate` | POST | Get fare estimate |
| `/rides` | POST | Create ride request |
| `/rides` | GET | Ride history |
| `/rides/:id` | GET | Ride details |
| `/rides/:id/cancel` | POST | Cancel ride |

### Pools

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pools/search` | POST | Find matching pools |
| `/pools` | POST | Create new pool |
| `/pools/:id` | GET | Pool details |
| `/pools/:id/join` | POST | Join pool |
| `/pools/:id/leave` | POST | Leave pool |
| `/pools/:id/route` | GET | Get pool route |
| `/pools/:id/combined-route` | GET | Route with driver (traffic-aware) |
| `/pools/:id/fare` | GET | Fare breakdown |
| `/pools/:id/navigation-link` | GET | Google Maps link |

### Driver

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/driver/go-online` | POST | Go online |
| `/driver/go-offline` | POST | Go offline |
| `/driver/status` | GET | Current status |
| `/driver/location` | PUT | Update location |
| `/driver/available-pools` | GET | Nearby pools |
| `/driver/pools/:id/accept` | POST | Accept pool |
| `/driver/pools/:id/reject` | POST | Reject pool |
| `/driver/active-pool` | GET | Current active pool |
| `/driver/ride/start` | POST | Start ride |
| `/driver/pickup/:id` | POST | Mark pickup |
| `/driver/dropoff/:id` | POST | Mark dropoff |
| `/driver/ride/complete` | POST | Complete ride |
| `/driver/earnings/today` | GET | Today's earnings |
| `/driver/earnings/history` | GET | Earnings history |
| `/driver/stats` | GET | Performance stats |
| `/driver/vehicle` | POST/PUT | Vehicle management |

### Payments & Wallet

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/payments` | POST | Process payment |
| `/payments/history` | GET | Payment history |
| `/wallet/balance` | GET | Wallet balance |
| `/wallet/add-funds` | POST | Top up wallet |
| `/wallet/transactions` | GET | Transaction history |
| `/promo/validate` | POST | Validate promo code |
| `/promo/apply` | POST | Apply promo code |

### Safety

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/safety/sos` | POST | Trigger SOS |
| `/safety/incident` | POST | Report incident |
| `/safety/share-trip` | POST | Share trip link |

### Messaging

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/messages/conversations` | GET | List conversations |
| `/messages/conversations/:id` | GET | Conversation messages |
| `/messages/send` | POST | Send message |

### Analytics & Heatmaps

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analytics/usage` | GET | Usage statistics |
| `/analytics/pools` | GET | Pool analytics |
| `/heatmap/demand` | GET | Demand heatmap data |
| `/heatmap/drivers` | GET | Driver availability map |

### Shifts & Navigation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/shifts/current` | GET | Current shift info |
| `/shifts/start` | POST | Start shift |
| `/shifts/end` | POST | End shift |
| `/shifts/history` | GET | Shift history |
| `/navigation/voice` | GET | Voice navigation data |
| `/navigation/route` | POST | Get navigation route |

### Internationalization

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/i18n/translations` | GET | Get translations |
| `/i18n/languages` | GET | Available languages |

### Offline Sync

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/offline/sync` | POST | Sync offline data |
| `/offline/pending` | GET | Pending sync items |

---

## Security Architecture

### Multi-Layer Security

```

---

## Integration Status

| Service | Status | Notes |
|---------|--------|-------|
| Google Maps Directions API | Live (key required) | Used for routing, traffic-aware ETA, and combined routes |
| Google Maps Deep Links | Live | Navigation opens Google Maps app without API cost |
| Supabase (DB/Auth/Realtime) | Live | Primary data store and client realtime channels |
| Redis Cache | Optional | Enabled when `MVP_MODE`/`SKIP_REDIS` is false |
| FCM Push Notifications | Conditional | Requires `FCM_SERVER_KEY`; otherwise stored in DB only |
| Payment Gateways (Card/Mobile Banking) | Placeholder | Gateway flow not wired in server |
| SMS/999 Emergency Delivery | Placeholder | Logged in DB; external delivery not integrated |
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: NETWORK                                                │
│   • SSL/TLS Encryption (HTTPS only)                             │
│   • Firewall Rules                                              │
│   • Optional edge proxy/CDN                                     │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 2: APPLICATION                                            │
│   • Rate Limiting (per IP, per user, per endpoint)              │
│   • Input Validation (Zod schemas)                              │
│   • CORS Configuration                                          │
│   • Security Headers (Helmet.js)                                │
│   • Input Sanitization                                          │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 3: AUTHENTICATION                                         │
│   • JWT Tokens (Supabase Auth)                                  │
│   • Token Refresh Flow                                          │
│   • Role-Based Access Control                                   │
│   • Resource Ownership Checks                                   │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 4: DATA                                                   │
│   • Row Level Security (RLS)                                    │
│   • Parameterized Queries                                       │
│   • Encryption at Rest                                          │
│   • Audit Logging                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| API (general) | 100 requests | 1 minute |
| Auth (login/register) | 5 attempts | 15 minutes |
| Search (pool matching) | 10 requests | 1 minute |
| Payment | 5 requests | 1 minute |
| SOS | Unlimited | - |

### Authentication Flow

```
1. User login with email/password OR OAuth (Google/Facebook)
2. Supabase Auth validates credentials
3. JWT access token + refresh token issued
4. Client stores tokens in AsyncStorage
5. API requests include "Bearer {token}" header
6. Auth middleware validates token with Supabase
7. User ID extracted and attached to request
8. Refresh token used to get new access token when expired
```

---

## Deployment & Scaling

### MVP Deployment ($0/month)

```yaml
# docker-compose.mvp.yml
services:
  api:
    build: ./Server
    environment:
      - MVP_MODE=true  # In-memory cache, no Redis
      - NODE_ENV=production
    ports:
      - "3000:3000"
```

**Free Tier Services:**
- Supabase Free (500MB DB, 50K auth)
- Render.com Free (750 hours/month)
- Google Maps $200 credit (~40K requests)
- Knock.app Free (10K notifications)

### Production Deployment

```yaml
# docker-compose.yml
services:
  api:
    build: ./Server
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
  
  redis:
    image: redis:7
    
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
```

### Scaling Phases

| Phase | DAU | Infrastructure | Monthly Cost |
|-------|-----|----------------|--------------|
| **MVP** | 0-1,000 | Single server, Supabase Free | $0 |
| **Growth** | 1,000-10,000 | Supabase Pro, Railway | $50-200 |
| **Scale** | 10,000-50,000 | Docker Compose on VPS | $200-500 |
| **Enterprise** | 50,000+ | Kubernetes cluster | $1,500+ |

---

## Financial Analysis

### Revenue Model

| Source | Rate | Example |
|--------|------|---------|
| Platform Commission | 20% of fare | ৳27 on ৳136 ride |
| Cancellation Fees | 10-50% of fare | ৳15-75 |
| Promo Sponsorships | Per campaign | Varies |
| Driver Subscriptions | Future | TBD |

### Unit Economics

```
Average Ride Value: ৳136 (2 passengers × ৳68)
Platform Commission: ৳27 (20%)
Cost per Ride (APIs): ~৳5

Net Revenue per Ride: ৳22
Rides per DAU per Day: 0.5

Revenue per 1,000 DAU/month: ৳22 × 0.5 × 1000 × 30 = ৳330,000 (~$3,000)
```

### Breakeven Analysis

| DAU | Monthly Rides | Revenue | Infra Cost | Profit |
|-----|---------------|---------|------------|--------|
| 1,000 | 15,000 | $2,100 | $0 | $2,100 |
| 5,000 | 75,000 | $10,500 | $50 | $10,450 |
| 20,000 | 300,000 | $42,000 | $200 | $41,800 |
| 100,000 | 1,500,000 | $210,000 | $1,500 | $208,500 |

---

## Quick Start Guide

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- Google Maps API key
- Expo CLI (`npm install -g expo-cli`)

### Server Setup

```bash
cd Server
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

### CarPoolApp Setup

```bash
cd Client/CarPoolApp
cp .env.example .env
# Edit .env with EXPO_PUBLIC_API_URL
npm install
npx expo start --clear
```

### DriverApp Setup

```bash
cd Client/DriverApp
cp .env.example .env
npm install
npx expo start --clear
```

### Build Commands

```bash
# Server
npm run build     # TypeScript compile
npm run test      # Run all tests
npm run test:unit # Unit tests only

# Mobile Apps
npx tsc --noEmit  # Type check
npm run lint      # ESLint
npm test          # Jest tests
```

---

## Conclusion

RidePool is a **production-ready foundation** for a carpooling platform with:

✅ **Smart Matching**: H3 geospatial indexing for sub-millisecond pool matching  
✅ **Real-time Updates**: Supabase Realtime + intelligent polling fallback  
✅ **Cost Efficiency**: 25-40% savings through intelligent pooling  
✅ **Safety First**: Female-only rides, SOS, trip sharing, emergency contacts  
✅ **Social Features**: Priyo Sathi trusted companions, in-pool messaging  
✅ **Payments**: Wallet + cash flows live; gateway integrations are placeholders  
✅ **Scalable Architecture**: MVP-ready with clear scaling path  
✅ **Cross-Platform**: Single codebase for iOS, Android, and Web  
✅ **Advanced Features**: Heatmaps, voice navigation, geofencing, fraud detection  
✅ **Internationalization**: Multi-language support (Bengali, English)  
✅ **Fault Tolerance**: Circuit breakers, graceful degradation, offline sync  

The codebase is well-organized with clear separation of concerns, consistent error handling, and security controls in place. External gateway integrations and a custom realtime server are still optional add-ons.

### Key Services Breakdown

| Service Category | Count | Examples |
|-----------------|-------|----------|
| **Core Business** | 10 | poolMatching, fare, route, rideEstimation |
| **Infrastructure** | 8 | cache, memoryCache, unifiedCache, circuitBreaker |
| **External APIs** | 3 | googleMaps, notification, promo |
| **Analytics** | 4 | analytics, heatmap, lookupTime, tracing |
| **Safety** | 4 | emergency, fraudDetection, geofencing, penalty |
| **Driver** | 4 | shift, voiceNavigation, smartRoute, routeOverlap |
| **Misc** | 4 | i18n, offline, wallet, priyoSathi |

---

**Document Version:** 1.1.0  
**Generated:** 2026-04-08  
**Total Exploration:** Server (37 services, 23 controllers, 22 route files, 153+ endpoints) + CarPoolApp (34 screens, 190+ components) + DriverApp (12 screens, 75+ components) + Shared Types (81+ interfaces/types across 9 modules)
