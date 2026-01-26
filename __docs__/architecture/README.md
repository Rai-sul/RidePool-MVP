# System Architecture

## Overview

RidePool uses a modular monolith architecture with clear separation of concerns, designed to evolve into microservices as the platform scales.

## High-Level Architecture

```
                                    ┌─────────────────────┐
                                    │   Mobile Clients    │
                                    │ CarPoolApp/DriverApp│
                                    └──────────┬──────────┘
                                               │
                                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           EDGE LAYER                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐     │
│  │   Cloudflare   │  │     Nginx      │  │   Rate Limiter      │     │
│  │   (DNS/CDN)    │  │ (Load Balancer)│  │   (per endpoint)    │     │
│  └────────────────┘  └────────────────┘  └─────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                              │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Express.js API Server                         │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │ │
│  │  │   Auth    │  │   Ride    │  │   Pool    │  │  Driver   │    │ │
│  │  │Controller │  │Controller │  │Controller │  │Controller │    │ │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘    │ │
│  │        │              │              │              │           │ │
│  │        └──────────────┴──────────────┴──────────────┘           │ │
│  │                              │                                   │ │
│  │  ┌───────────────────────────┴───────────────────────────────┐  │ │
│  │  │                    SERVICE LAYER                           │  │ │
│  │  │  PoolMatching │ Fare │ Geolocation │ Cache │ Notification │  │ │
│  │  └───────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────┐
                    ▼                          ▼                      ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌────────────────┐
│      SUPABASE        │    │        REDIS         │    │  Message Queue │
│  ┌────────────────┐  │    │  ┌────────────────┐  │    │  ┌──────────┐  │
│  │  PostgreSQL    │  │    │  │ Session Cache  │  │    │  │  BullMQ  │  │
│  │  (Database)    │  │    │  │ Route Cache    │  │    │  │  Jobs    │  │
│  ├────────────────┤  │    │  │ Pool Search    │  │    │  └──────────┘  │
│  │  Auth          │  │    │  └────────────────┘  │    └────────────────┘
│  │  (Supabase)    │  │    └──────────────────────┘
│  ├────────────────┤  │
│  │  RLS Policies  │  │
│  └────────────────┘  │
└──────────────────────┘
```

## Component Descriptions

### Edge Layer
- **Cloudflare**: DNS management, DDoS protection, global CDN
- **Nginx**: Load balancing, SSL termination, request routing
- **Rate Limiter**: Endpoint-specific rate limiting to prevent abuse

### Application Layer
- **Controllers**: Handle HTTP requests, validate input, format responses
- **Services**: Contain business logic, interact with data layer
- **Middleware**: Authentication, logging, error handling, security

### Data Layer
- **Supabase/PostgreSQL**: Primary data store with Row Level Security
- **Redis**: Caching layer for performance optimization
- **BullMQ**: Async job processing for notifications, payments

## Request Flow

```
1. Client Request
        │
        ▼
2. Nginx (Rate Limit Check)
        │
        ▼
3. Express Middleware
   ├── Security Headers
   ├── Input Sanitization
   ├── Authentication
   └── Request Logging
        │
        ▼
4. Controller
   ├── Validate Input (Zod)
   └── Call Service
        │
        ▼
5. Service Layer
   ├── Business Logic
   ├── Check Cache
   └── Query Database
        │
        ▼
6. Response
   └── Formatted JSON
```

## Pool Matching Flow

```
┌──────────────────┐
│ Ride Request     │
│ (pickup, dropoff)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ H3 Index         │
│ Generation       │
│ (resolution 7,9) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Cache Lookup     │───── Hit ───▶ Return Cached
└────────┬─────────┘
         │ Miss
         ▼
┌──────────────────┐
│ Database Query   │
│ (nearby pools)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Score Calculation│
│ - Distance       │
│ - Route Overlap  │
│ - Gender Match   │
│ - Passenger Count│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Return Top 10    │
│ Matching Pools   │
└──────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: Network                                                 │
│   - Cloudflare DDoS Protection                                   │
│   - SSL/TLS Encryption                                           │
│   - Firewall Rules                                               │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Application                                             │
│   - Rate Limiting (per IP, per user)                             │
│   - Input Validation (Zod schemas)                               │
│   - CORS Configuration                                           │
│   - Security Headers (Helmet)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Authentication                                          │
│   - JWT Tokens (Supabase Auth)                                   │
│   - Role-Based Access Control                                    │
│   - Session Management                                           │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: Data                                                    │
│   - Row Level Security (RLS)                                     │
│   - Parameterized Queries                                        │
│   - Encryption at Rest                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Scaling Strategy

### Phase 1: Single Server (0-5K DAU)
- Single Express instance
- Supabase managed database
- Optional Redis caching

### Phase 2: Horizontal Scale (5K-50K DAU)
- 3 Express instances behind Nginx
- Redis cluster for sessions
- Message queue for async jobs

### Phase 3: Full Scale (50K+ DAU)
- Kubernetes orchestration
- Database read replicas
- Multi-region deployment
- Dedicated message broker

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Mobile | React Native + Expo | Cross-platform apps |
| API | Express.js + TypeScript | REST API server |
| Database | PostgreSQL (Supabase) | Primary data store |
| Cache | Redis (Upstash) | Performance caching |
| Auth | Supabase Auth | User authentication |
| Maps | Mapbox/Google Maps | Routing & geocoding |
| Queue | BullMQ | Background jobs |
| Monitoring | Prometheus + Grafana | Observability |

## File Organization (MVC Pattern)

```
Server/src/
├── controllers/       # C - Controllers (handle requests)
│   ├── auth.controller.ts
│   ├── ride.controller.ts
│   ├── pool.controller.ts
│   └── driver.controller.ts
│
├── services/          # M - Model logic (business rules)
│   ├── poolMatching.service.ts
│   ├── fare.service.ts
│   ├── cache.service.ts
│   └── notification.service.ts
│
├── routes/            # Route definitions
│   ├── index.ts
│   ├── auth.routes.ts
│   └── driver.routes.ts
│
├── middleware/        # Request pipeline
│   ├── auth.ts
│   ├── validation.ts
│   └── rateLimiter.ts
│
├── types/             # TypeScript interfaces
│   └── index.ts
│
└── utils/             # Utilities
    ├── h3.utils.ts
    └── logger.ts
```

---

**Last Updated:** 2026-01-19
