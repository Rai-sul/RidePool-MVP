# Complete Backend Architecture Walkthrough

## 📋 Table of Contents

1. [Entry Point & Initial Loading](#1-entry-point--initial-loading)
2. [Data Flow Through Files](#2-data-flow-through-files)
3. [User Interaction Points](#3-user-interaction-points)
4. [Request Flow Through Layers](#4-request-flow-through-layers)
5. [Response Generation](#5-response-generation)
6. [Architecture Overview](#6-architecture-overview)
7. [Visual Flow Diagrams](#7-visual-flow-diagrams)

---

## 1. Entry Point & Initial Loading

### 🚀 Where It All Starts

**Entry Point File:** `backend/src/app.ts`

The application starts here when you run:

```bash
npm run dev    # Development mode (uses nodemon)
npm start      # Production mode (runs compiled dist/app.js)
```

### Initial Loading Sequence

```
1. Node.js executes: src/app.ts
   ↓
2. Imports are loaded in order:
   ├─ express (web framework)
   ├─ cors (cross-origin resource sharing)
   ├─ helmet (security headers)
   ├─ morgan (HTTP request logging)
   ├─ dotenv (environment variables)
   ├─ routes (from ./routes/index.ts)
   ├─ errorHandler (from ./middleware/errorHandler.ts)
   └─ logger (from ./utils/logger.ts)
   ↓
3. dotenv.config() loads .env file
   ↓
4. Express app instance created: const app = Express()
   ↓
5. Middleware stack configured:
   ├─ helmet() - Security headers
   ├─ cors() - Allow cross-origin requests
   ├─ express.json() - Parse JSON bodies
   ├─ express.urlencoded() - Parse URL-encoded bodies
   └─ morgan() - Log HTTP requests
   ↓
6. Routes mounted:
   └─ app.use('/api', routes) → routes/index.ts
   ↓
7. Error handler registered:
   └─ app.use(errorHandler) → middleware/errorHandler.ts
   ↓
8. Server starts listening:
   └─ app.listen(PORT) → Default port 3000
```

### Configuration Loading

**File:** `backend/src/config/env.ts`

This file loads environment variables and creates a centralized config object:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `H3_RESOLUTION` - H3 hexagon resolution (default: 10)
- `H3_SEARCH_RADIUS` - Search radius for hexagons (default: 2)

**File:** `backend/src/config/supabase.ts`

Creates Supabase client instances:

- `supabase` - Regular client (uses anon key)
- `supabaseAdmin` - Admin client (uses service role key)

---

## 2. Data Flow Through Files

### Route Registration Flow

```
app.ts (Entry Point)
  ↓ imports
routes/index.ts (Main Router)
  ↓ registers sub-routers
  ├─ user.routes.ts → /api/users/*
  ├─ pool.routes.ts → /api/pools/*
  ├─ ride.routes.ts → /api/rides/*
  └─ payment.routes.ts → /api/payments/*
```

### Example: User Profile Request Flow

```
1. HTTP Request: GET /api/users/profile
   ↓
2. app.ts receives request
   ↓
3. Routes to: routes/index.ts
   ↓
4. Matches: router.use('/users', userRoutes)
   ↓
5. Routes to: routes/user.routes.ts
   ↓
6. Matches: router.get('/profile', authenticate, handler)
   ↓
7. Middleware: authenticate (from middleware/auth.ts)
   ├─ Extracts Bearer token from Authorization header
   ├─ Validates token with Supabase
   ├─ Attaches user to req.user
   └─ Calls next() to continue
   ↓
8. Route Handler executes:
   ├─ Accesses req.user (set by auth middleware)
   └─ Returns JSON response
   ↓
9. Response sent back to client
```

### Example: Pool Search Request Flow

```
1. HTTP Request: GET /api/pools/search?lat=23.8103&lng=90.4125
   ↓
2. app.ts → routes/index.ts → routes/pool.routes.ts
   ↓
3. Matches: router.get('/search', authenticate, handler)
   ↓
4. Auth middleware validates user
   ↓
5. Route handler (currently placeholder):
   └─ Would call: poolMatchingService.findMatchingPools()
      ├─ Uses: services/poolMatching.service.ts
      ├─ Uses: utils/h3.utils.ts (for hexagon calculations)
      ├─ Uses: config/supabase.ts (for database queries)
      └─ Returns: ScoredMatchingResult[]
   ↓
6. Response sent to client
```

---

## 3. User Interaction Points

### API Endpoints Overview

All endpoints are prefixed with `/api`:

#### **User Endpoints** (`/api/users`)

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

#### **Pool Endpoints** (`/api/pools`)

- `GET /api/pools/search` - Search for matching pools
- `POST /api/pools/create` - Create a new pool
- `POST /api/pools/:poolId/join` - Join an existing pool

#### **Ride Endpoints** (`/api/rides`)

- `POST /api/rides/request` - Request a ride
- `GET /api/rides/history` - Get ride history
- `PUT /api/rides/:rideId/cancel` - Cancel a ride

#### **Payment Endpoints** (`/api/payments`)

- `POST /api/payments/process` - Process a payment
- `GET /api/payments/history` - Get payment history

#### **Health Check**

- `GET /health` - Server health check (no auth required)

### Authentication Flow

**File:** `backend/src/middleware/auth.ts`

Every protected endpoint requires:

```
Authorization: Bearer <supabase_jwt_token>
```

The `authenticate` middleware:

1. Extracts token from `Authorization` header
2. Validates token with Supabase Auth API
3. Attaches user object to `req.user`
4. Calls `next()` if valid, returns 401 if invalid

---

## 4. Request Flow Through Layers

### Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                           │
│  GET /api/pools/search?lat=23.8103&lng=90.4125             │
│  Headers: Authorization: Bearer <token>                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: Express App (app.ts)                             │
│  - Receives HTTP request                                    │
│  - Applies global middleware:                               │
│    • helmet() - Security headers                            │
│    • cors() - CORS handling                                 │
│    • express.json() - Parse JSON body                       │
│    • morgan() - Request logging                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: Route Router (routes/index.ts)                   │
│  - Matches /api prefix                                      │
│  - Routes to appropriate sub-router:                        │
│    /api/pools → pool.routes.ts                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: Route Handler (routes/pool.routes.ts)            │
│  - Matches /search endpoint                                 │
│  - Applies route-specific middleware:                      │
│    • authenticate - Validates JWT token                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: Authentication Middleware (middleware/auth.ts)   │
│  - Extracts Bearer token                                    │
│  - Validates with Supabase Auth                            │
│  - Attaches user to req.user                                │
│  - Calls next() to continue                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: Route Handler Logic                               │
│  - Currently placeholder (TODO)                              │
│  - Would call: poolMatchingService.findMatchingPools()      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 6: Service Layer (services/poolMatching.service.ts) │
│  - Business logic for pool matching                        │
│  - Uses H3 hexagon indexing                                 │
│  - Calculates match scores                                  │
│  - Queries database via Supabase                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 7: Utility Functions                                 │
│  - utils/h3.utils.ts - H3 hexagon operations               │
│  - utils/helper.ts - Distance calculations                  │
│  - config/supabase.ts - Database client                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 8: Database (Supabase PostgreSQL)                   │
│  - Stores pools, rides, users, etc.                         │
│  - Returns query results                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  RESPONSE FLOW (Reverse)                                    │
│  Database → Service → Route Handler → Middleware → Client  │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Layer Breakdown

#### **Layer 1: Express Application** (`app.ts`)

- **Purpose:** Application initialization and global middleware
- **Responsibilities:**
  - Load environment variables
  - Configure Express app
  - Register global middleware
  - Mount route handlers
  - Register error handler
  - Start HTTP server

#### **Layer 2: Route Router** (`routes/index.ts`)

- **Purpose:** Route aggregation and organization
- **Responsibilities:**
  - Import all route modules
  - Mount routes under `/api` prefix
  - Organize routes by domain (users, pools, rides, payments)

#### **Layer 3: Route Handlers** (`routes/*.routes.ts`)

- **Purpose:** Define HTTP endpoints and request handlers
- **Responsibilities:**
  - Define route paths (GET, POST, PUT, DELETE)
  - Apply route-specific middleware
  - Call service layer functions
  - Handle request/response
  - Error handling (pass to errorHandler via `next()`)

#### **Layer 4: Middleware** (`middleware/*.ts`)

- **Purpose:** Cross-cutting concerns
- **Files:**
  - `auth.ts` - Authentication & authorization
  - `errorHandler.ts` - Global error handling
  - `validation.ts` - Request validation (using express-validator)

#### **Layer 5: Service Layer** (`services/*.service.ts`)

- **Purpose:** Business logic implementation
- **Files:**
  - `poolMatching.service.ts` - Pool matching algorithm using H3
  - `fare.service.ts` - Fare calculation
  - `geolocation.service.ts` - Location validation & H3 conversion
  - `route.service.ts` - Route optimization (TODO)
  - `notification.service.ts` - Push notifications (TODO)

#### **Layer 6: Utilities** (`utils/*.ts`)

- **Purpose:** Reusable helper functions
- **Files:**
  - `h3.utils.ts` - H3 hexagon operations
  - `helper.ts` - Distance calculations, location utilities
  - `logger.ts` - Structured logging with Winston

#### **Layer 7: Configuration** (`config/*.ts`)

- **Purpose:** Application configuration
- **Files:**
  - `env.ts` - Environment variables
  - `supabase.ts` - Supabase client setup
  - `constants.ts` - Application constants

#### **Layer 8: Database** (Supabase PostgreSQL)

- **Purpose:** Data persistence
- **Access:** Via Supabase client from `config/supabase.ts`

---

## 5. Response Generation

### Response Flow

```
Service Layer (e.g., poolMatchingService.findMatchingPools())
  ↓ Returns: ScoredMatchingResult[]
  ↓
Route Handler (e.g., routes/pool.routes.ts)
  ↓ Calls: res.json({ data: results })
  ↓
Express Response Object
  ↓ Serializes to JSON
  ↓ Adds HTTP headers
  ↓
Client receives JSON response
```

### Error Response Flow

```
Error occurs in any layer
  ↓
Caught by try/catch or Express error handler
  ↓
Calls: next(error)
  ↓
Error Handler Middleware (middleware/errorHandler.ts)
  ├─ Logs error using logger
  ├─ Determines status code (default: 500)
  └─ Returns JSON: { error: "Error message", stack: "..." }
  ↓
Client receives error response
```

### Response Examples

**Success Response:**

```json
{
  "message": "Search pools endpoint using H3 hexagons"
}
```

**Error Response:**

```json
{
  "error": "Invalid or expired token"
}
```

**Health Check Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 6. Architecture Overview

### Folder Structure & Responsibilities

```
backend/
├── src/
│   ├── app.ts                    # 🚀 ENTRY POINT - Application initialization
│   │
│   ├── config/                   # ⚙️ CONFIGURATION
│   │   ├── constants.ts         # Application constants (pickup range, etc.)
│   │   ├── env.ts               # Environment variable loading
│   │   └── supabase.ts          # Supabase client initialization
│   │
│   ├── middleware/              # 🛡️ MIDDLEWARE (Request processing)
│   │   ├── auth.ts             # JWT authentication
│   │   ├── errorHandler.ts     # Global error handling
│   │   └── validation.ts       # Request validation
│   │
│   ├── routes/                  # 🛣️ ROUTES (API endpoints)
│   │   ├── index.ts            # Main router (aggregates all routes)
│   │   ├── user.routes.ts      # User-related endpoints
│   │   ├── pool.routes.ts      # Pool-related endpoints
│   │   ├── ride.routes.ts      # Ride-related endpoints
│   │   └── payment.routes.ts   # Payment-related endpoints
│   │
│   ├── services/                # 💼 BUSINESS LOGIC
│   │   ├── poolMatching.service.ts  # H3-based pool matching algorithm
│   │   ├── fare.service.ts          # Fare calculation logic
│   │   ├── geolocation.service.ts   # Location validation & H3 conversion
│   │   ├── route.service.ts         # Route optimization (TODO)
│   │   └── notification.service.ts  # Push notifications (TODO)
│   │
│   ├── types/                   # 📝 TYPE DEFINITIONS
│   │   └── index.ts            # TypeScript interfaces & types
│   │
│   └── utils/                   # 🔧 UTILITIES
│       ├── h3.utils.ts         # H3 hexagon operations
│       ├── helper.ts           # Distance calculations, location utils
│       └── logger.ts           # Winston logger setup
│
├── supabase/                    # 🗄️ DATABASE
│   ├── migrations/             # SQL migration files
│   └── config.toml            # Supabase configuration
│
├── package.json                # Dependencies & scripts
└── tsconfig.json               # TypeScript configuration
```

### Key Design Patterns

#### **1. Layered Architecture**

- **Separation of Concerns:** Each layer has a specific responsibility
- **Dependency Flow:** Routes → Services → Utils → Config → Database

#### **2. Service Layer Pattern**

- Business logic isolated in service classes
- Services are stateless and reusable
- Example: `PoolMatchingService` handles all pool matching logic

#### **3. Middleware Pattern**

- Cross-cutting concerns handled by middleware
- Applied globally or per-route
- Example: Authentication middleware applied to protected routes

#### **4. Dependency Injection**

- Services and utilities exported as singletons
- Imported where needed
- Example: `import { poolMatchingService } from './services/poolMatching.service'`

### Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5.x
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (JWT)
- **Geospatial:** H3 (Uber's hexagonal hierarchical geospatial indexing)
- **Logging:** Winston
- **Security:** Helmet, CORS
- **Validation:** express-validator

---

## 7. Visual Flow Diagrams

### Complete Request Flow

```
┌──────────────┐
│   CLIENT     │
│  (Mobile App)│
└──────┬───────┘
       │ HTTP Request
       │ GET /api/pools/search
       │ Authorization: Bearer <token>
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express App (app.ts)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Global Middleware Stack:                             │  │
│  │ • helmet() - Security                                │  │
│  │ • cors() - CORS handling                            │  │
│  │ • express.json() - Parse JSON                       │  │
│  │ • morgan() - Logging                                │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Route Router (routes/index.ts)                │
│  Matches: /api → routes to sub-router                     │
└───────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Route Handler (routes/pool.routes.ts)              │
│  Matches: /search → GET /api/pools/search                  │
└───────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│      Auth Middleware (middleware/auth.ts)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Extract token from Authorization header          │  │
│  │ 2. Validate with Supabase Auth API                 │  │
│  │ 3. Attach user to req.user                          │  │
│  │ 4. Call next() if valid                             │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    Route Handler Logic (routes/pool.routes.ts)            │
│  Currently placeholder - would call service layer          │
└───────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│   Service Layer (services/poolMatching.service.ts)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Extract pickup/destination from request          │  │
│  │ 2. Convert to H3 hexagons (utils/h3.utils.ts)      │  │
│  │ 3. Query database for matching pools                │  │
│  │ 4. Calculate match scores                           │  │
│  │ 5. Filter by minimum score threshold               │  │
│  │ 6. Sort by score                                    │  │
│  │ 7. Return ScoredMatchingResult[]                    │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (Supabase PostgreSQL)                  │
│  Query: SELECT * FROM pools WHERE ...                      │
│  Returns: Pool records                                      │
└───────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESPONSE FLOW                            │
│  Database → Service → Route → Middleware → Express → Client │
└─────────────────────────────────────────────────────────────┘
```

### Pool Matching Algorithm Flow

```
User requests ride
  ↓
Route Handler receives request
  ↓
Calls: poolMatchingService.findMatchingPools(ride, userId)
  ↓
┌─────────────────────────────────────────────────────────────┐
│              Pool Matching Service                          │
│                                                             │
│  1. Extract locations from ride                             │
│     pickup: { lat, lng }                                   │
│     destination: { lat, lng }                              │
│                                                             │
│  2. Generate H3 indices                                    │
│     pickupH3 = h3Utils.latLngToH3(pickup, 9)              │
│     destinationH3 = h3Utils.latLngToH3(destination, 7)    │
│                                                             │
│  3. Get search area hexagons                                │
│     pickupSearchHexagons = h3Utils.getH3Ring(pickupH3, 2) │
│     destinationSearchHexagons = h3Utils.getH3Ring(...)    │
│                                                             │
│  4. Query database                                          │
│     SELECT * FROM pools                                     │
│     WHERE destination_h3_index IN (...)                    │
│     AND vehicle_type = ...                                 │
│     AND status IN ('WAITING_FOR_RIDERS', ...)              │
│                                                             │
│  5. For each pool:                                          │
│     ├─ Check pickup distance (hard filter)                 │
│     ├─ Check gender restriction                             │
│     ├─ Calculate route overlap                              │
│     ├─ Calculate match score                                │
│     └─ Filter by minimum score (30+)                        │
│                                                             │
│  6. Sort by score (highest first)                          │
│                                                             │
│  7. Return ScoredMatchingResult[]                           │
└─────────────────────────────────────────────────────────────┘
  ↓
Route Handler formats response
  ↓
Returns JSON to client
```

### Error Handling Flow

```
Error occurs anywhere in the stack
  ↓
Caught by try/catch block
  ↓
Calls: next(error)
  ↓
┌─────────────────────────────────────────────────────────────┐
│         Error Handler Middleware (errorHandler.ts)          │
│                                                             │
│  1. Log error using logger                                  │
│     logger.error('Error:', err)                             │
│                                                             │
│  2. Determine status code                                   │
│     - Use existing statusCode if set                        │
│     - Default to 500 if not set                            │
│                                                             │
│  3. Format error response                                   │
│     {                                                       │
│       error: err.message || 'Internal server error',        │
│       stack: err.stack (only in development)                │
│     }                                                       │
│                                                             │
│  4. Send response                                           │
│     res.status(statusCode).json({ error, stack })           │
└─────────────────────────────────────────────────────────────┘
  ↓
Client receives error response
```

### File Dependency Graph

```
app.ts
  ├─→ routes/index.ts
  │     ├─→ routes/user.routes.ts
  │     │     └─→ middleware/auth.ts
  │     │           └─→ config/supabase.ts
  │     │                 └─→ config/env.ts
  │     ├─→ routes/pool.routes.ts
  │     │     └─→ middleware/auth.ts
  │     │     └─→ services/poolMatching.service.ts (TODO)
  │     │           ├─→ utils/h3.utils.ts
  │     │           ├─→ utils/helper.ts
  │     │           ├─→ config/supabase.ts
  │     │           └─→ config/constants.ts
  │     ├─→ routes/ride.routes.ts
  │     │     └─→ middleware/auth.ts
  │     └─→ routes/payment.routes.ts
  │           └─→ middleware/auth.ts
  ├─→ middleware/errorHandler.ts
  │     └─→ utils/logger.ts
  └─→ utils/logger.ts
```

---

## 📚 Key Concepts Explained

### H3 Hexagon Indexing

**What is H3?**

- H3 is Uber's hexagonal hierarchical geospatial indexing system
- Divides the Earth into hexagons at different resolutions
- Used for efficient location-based queries

**Resolutions Used:**

- **Resolution 7** (~5.2 km): Destination area matching
- **Resolution 8** (~461 m): Driver search radius
- **Resolution 9** (~174 m): Pickup point matching

**Why H3?**

- Fast spatial queries (no complex distance calculations)
- Efficient database indexing
- Grid-based matching for pools

### Pool Matching Algorithm

The pool matching service uses a scoring system:

1. **Distance Score (25 points):** Closer pickup = higher score
2. **Route Overlap Score (35 points):** Higher overlap = higher score
3. **Common Hexagons Score (20 points):** More passengers = higher score
4. **Exact Match Bonuses (10 points):** Exact pickup/destination matches
5. **Destination Proximity Score (10 points):** Closer destination = higher score

**Minimum Score:** 30/100 to be considered a match

### Authentication Flow

1. Client sends request with `Authorization: Bearer <token>`
2. Auth middleware extracts token
3. Validates token with Supabase Auth API
4. If valid, attaches user to `req.user`
5. Route handler can access `req.user` for user info

---

## 🔍 Example: Complete Request Walkthrough

### Scenario: User searches for pools

**Step 1: Client Request**

```http
GET /api/pools/search?lat=23.8103&lng=90.4125
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Step 2: Express App** (`app.ts`)

- Receives request
- Applies helmet, cors, json parsing
- Logs request with morgan

**Step 3: Route Router** (`routes/index.ts`)

- Matches `/api` prefix
- Routes to `pool.routes.ts`

**Step 4: Route Handler** (`routes/pool.routes.ts`)

- Matches `/search` endpoint
- Applies `authenticate` middleware

**Step 5: Auth Middleware** (`middleware/auth.ts`)

- Extracts token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Calls `supabase.auth.getUser(token)`
- Supabase validates token
- Attaches user to `req.user`
- Calls `next()`

**Step 6: Route Handler Logic** (`routes/pool.routes.ts`)

- Currently returns placeholder response
- (Would call `poolMatchingService.findMatchingPools()`)

**Step 7: Response**

```json
{
  "message": "Search pools endpoint using H3 hexagons"
}
```

**Step 8: Client Receives Response**

- JSON response parsed by client
- Displayed in mobile app

---

## 🎯 Summary

This backend follows a **layered architecture** pattern:

1. **Entry Point:** `app.ts` initializes the Express server
2. **Routes:** Define API endpoints and apply middleware
3. **Middleware:** Handle authentication, errors, validation
4. **Services:** Implement business logic (pool matching, fare calculation)
5. **Utils:** Provide helper functions (H3 operations, distance calculations)
6. **Config:** Manage environment variables and database connections
7. **Database:** Supabase PostgreSQL for data persistence

The flow is: **Client → Express → Routes → Middleware → Services → Utils → Database → Response**

Each layer has a clear responsibility, making the codebase maintainable and scalable.
