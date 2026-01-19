# RidePool - Ride Sharing Platform for Dhaka

![CI/CD Pipeline](https://github.com/Ahsaniat/Carpool-dev/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/Ahsaniat/Carpool-dev/actions/workflows/codeql.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020.svg)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933.svg)](https://nodejs.org/)

A destination-based carpooling platform designed for Dhaka city, enabling efficient ride sharing with intelligent pool matching.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├────────────────────────┬────────────────────────────────────────┤
│     CarPoolApp         │           DriverApp                    │
│   (Passenger App)      │         (Driver App)                   │
│   React Native/Expo    │       React Native/Expo                │
└────────────────────────┴────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Nginx)                           │
│              Rate Limiting | Load Balancing | SSL                │
└────────────────────────────────────────────────────────────────-┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS API SERVER                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐           │
│  │ Controllers │  │   Services   │  │  Middleware   │           │
│  │  - auth     │  │ - poolMatch  │  │ - auth        │           │
│  │  - ride     │  │ - fare       │  │ - rateLimiter │           │
│  │  - pool     │  │ - geocode    │  │ - validation  │           │
│  │  - driver   │  │ - cache      │  │ - security    │           │
│  │  - payment  │  │ - queue      │  │ - audit       │           │
│  └─────────────┘  └──────────────┘  └───────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌──────────────────────┐    ┌──────────────────────┐
│   SUPABASE           │    │   REDIS              │
│   (PostgreSQL + Auth)│    │   (Cache + Sessions) │
└──────────────────────┘    └──────────────────────┘
```

## 📁 Project Structure

```
RideShareDev/
├── Client/
│   ├── CarPoolApp/        # Passenger mobile app (Expo)
│   └── DriverApp/         # Driver mobile app (Expo)
├── Server/
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── config/        # Configuration
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utilities
│   ├── supabase/          # Database migrations
│   └── tests/             # Test suites
├── shared/                # Shared types package
├── __docs__/              # Documentation
├── .github/workflows/     # CI/CD pipelines
└── logs/                  # Agent logs
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 9+
- Redis (optional for development)
- Supabase account

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/Ahsaniat/Carpool-dev.git
cd Carpool-dev

# Install server dependencies
cd Server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

### Client Setup (CarPoolApp)

```bash
cd Client/CarPoolApp
npm install

# Start Expo development
npx expo start
```

### Client Setup (DriverApp)

```bash
cd Client/DriverApp
npm install

# Start Expo development
npx expo start
```

## 🔧 Configuration

### Required Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Maps (or Mapbox)
GOOGLE_MAPS_API_KEY=your-api-key

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

See `Server/.env.example` for the complete list.

## 🧪 Testing

```bash
# Run unit tests
cd Server && npm run test:unit

# Run with coverage
npm run test:unit -- --coverage

# Run integration tests (requires Redis)
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## 📚 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| POST | `/api/rides` | Create ride request |
| GET | `/api/pools/search` | Search matching pools |
| POST | `/api/pools/:id/join` | Join a pool |
| POST | `/api/driver/go-online` | Driver goes online |
| POST | `/api/driver/pools/:id/accept` | Accept pool |

Full API documentation: [`__docs__/api/`](__docs__/api/)

## 🏛️ Key Features

### Pool Matching Algorithm
- H3 hexagonal indexing for geospatial matching
- Multi-factor scoring (distance, route overlap, gender preference)
- Dynamic fare calculation with pooling discounts

### Security
- Rate limiting per endpoint
- Input validation with Zod schemas
- CSRF and XSS protection
- SQL injection prevention via Supabase RLS

### Scalability
- Redis caching layer
- Circuit breaker pattern
- Message queue for async operations
- Docker + Kubernetes ready

## 🐳 Docker Deployment

```bash
# Development
docker-compose up -d

# Production (3 replicas)
docker-compose -f docker-compose.yml up -d --scale app=3
```

## 📊 Monitoring

The project includes Prometheus and Loki integration for observability.

```bash
# Health check endpoints
GET /health         # Readiness probe
GET /health/live    # Liveness probe
GET /health/detailed # Full health status
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [`__docs__/MVP.md`](__docs__/MVP.md) | MVP scaling strategy |
| [`__docs__/financial.md`](__docs__/financial.md) | Cost analysis |
| [`__docs__/audit-report.md`](__docs__/audit-report.md) | Comprehensive audit |
| [`__docs__/database/`](__docs__/database/) | Database schema & backup |
| [`__docs__/security/`](__docs__/security/) | Security reports |
| [`__docs__/operations/`](__docs__/operations/) | Runbooks & DR |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `chore:` Maintenance
- `docs:` Documentation
- `test:` Tests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) - Backend as a Service
- [Expo](https://expo.dev/) - React Native framework
- [H3](https://h3geo.org/) - Hexagonal indexing
- [Uber](https://uber.com/) - Inspiration for pooling algorithms

---

**Built with ❤️ for Dhaka**
