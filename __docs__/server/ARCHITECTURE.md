# Backend Architecture - Controller Pattern

## Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MIDDLEWARE                              │
│  • Authentication (JWT verification)                            │
│  • CORS, Helmet, Morgan                                         │
│  • Request validation                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          ROUTES                                 │
│  • /api/rides      → ride.routes.ts                            │
│  • /api/pools      → pool.routes.ts                            │
│  • /api/users      → user.routes.ts                            │
│  • /api/payments   → payment.routes.ts                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CONTROLLERS (NEW!)                        │
│  • RideController    - Request/Cancel rides                    │
│  • PoolController    - Search/Create/Join pools                │
│  • UserController    - Profile management                      │
│  • PaymentController - Process payments                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVICES                                │
│  • poolMatchingService - H3 matching algorithm                 │
│  • fareService         - Pricing & discounts                   │
│  • geolocationService  - Location validation                   │
│  • googleMapsService   - Route calculations                    │
│  • notificationService - Push notifications                    │
│  • routeService        - Route optimization                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase)                          │
│  • users, rides, pools, payments                               │
│  • H3 indexed locations                                        │
│  • Real-time subscriptions                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Routes Layer
**Purpose**: Define HTTP endpoints and apply middleware
```typescript
// Example: ride.routes.ts
router.post('/request', authenticate, (req, res, next) => 
  rideController.requestRide(req, res, next)
);
```
**Responsibilities**:
- Map HTTP verbs to controller methods
- Apply route-specific middleware
- Define URL patterns

### 2. Controllers Layer (NEW!)
**Purpose**: Handle HTTP request/response and orchestrate services
```typescript
// Example: RideController.requestRide()
async requestRide(req: AuthRequest, res: Response, next: NextFunction) {
  // 1. Extract & validate input
  // 2. Call services
  // 3. Format response
  // 4. Handle errors
}
```
**Responsibilities**:
- Request validation
- Authentication checks
- Call appropriate services
- Format responses
- Error handling

### 3. Services Layer
**Purpose**: Business logic and data operations
```typescript
// Example: poolMatchingService.findMatchingPools()
async findMatchingPools(ride: Ride, userId: string): Promise<ScoredMatchingResult[]> {
  // Complex H3 matching algorithm
  // Database queries
  // Scoring calculations
}
```
**Responsibilities**:
- Business logic
- Data access
- Complex calculations
- External API calls

### 4. Database Layer
**Purpose**: Data persistence
- Supabase client
- Type-safe queries
- Real-time subscriptions

## API Endpoints

### Rides
```
POST   /api/rides/request         - Request a new ride
GET    /api/rides/history         - Get ride history
PUT    /api/rides/:rideId/cancel  - Cancel a ride
```

### Pools
```
GET    /api/pools/search          - Search for pools
POST   /api/pools/create          - Create a new pool
POST   /api/pools/:poolId/join    - Join a pool
```

### Users
```
GET    /api/users/profile         - Get user profile
PUT    /api/users/profile         - Update profile
```

### Payments
```
POST   /api/payments/process      - Process payment
GET    /api/payments/history      - Get payment history
```

## Controller Method Patterns

### Standard Pattern
```typescript
async methodName(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 1. Get user ID from auth
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Extract request data
    const data = req.body;

    // 3. Validate input
    if (!data.required_field) {
      return res.status(400).json({ error: 'Missing field' });
    }

    // 4. Call services
    const result = await someService.doSomething(data);

    // 5. Return response
    res.json({ 
      message: 'Success',
      data: result 
    });
  } catch (error) {
    // 6. Pass errors to error handler
    next(error);
  }
}
```

## Benefits of Controller Pattern

### ✅ Separation of Concerns
- Routes: HTTP layer
- Controllers: Request handling
- Services: Business logic
- Database: Data persistence

### ✅ Testability
```typescript
// Easy to mock and test
describe('RideController', () => {
  it('should request a ride', async () => {
    // Mock req, res, next
    // Call controller
    // Assert response
  });
});
```

### ✅ Reusability
- Controllers can be used by multiple routes
- Services can be used by multiple controllers
- Clear dependency injection

### ✅ Maintainability
- Easy to locate code
- Clear file organization
- Single responsibility per file

### ✅ Scalability
- Easy to add new features
- Easy to refactor
- Clear extension points

## File Organization

```
backend/src/
├── controllers/          # HTTP request handlers
│   ├── ride.controller.ts
│   ├── pool.controller.ts
│   ├── user.controller.ts
│   ├── payment.controller.ts
│   └── index.ts
├── routes/              # HTTP routes
│   ├── ride.routes.ts
│   ├── pool.routes.ts
│   ├── user.routes.ts
│   ├── payment.routes.ts
│   └── index.ts
├── services/            # Business logic
│   ├── poolMatching.service.ts
│   ├── fare.service.ts
│   ├── geolocation.service.ts
│   └── ...
├── middleware/          # Express middleware
├── types/               # TypeScript types
├── config/              # Configuration
└── utils/               # Utilities
```

## Summary

The controller pattern provides:
- **Clean architecture** with clear separation of concerns
- **Better testability** through dependency injection
- **Improved maintainability** with organized code structure
- **Enhanced scalability** for future growth
- **No breaking changes** to existing functionality

All functionality has been preserved while improving code quality and organization.
