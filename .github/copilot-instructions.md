# Copilot Instructions — RidePool

## Architecture

This is a monorepo with three independently-installed packages and a shared type library:

| Package | Path | Runtime | Framework |
|---------|------|---------|-----------|
| **Server** | `Server/` | Node 20, TypeScript (CommonJS) | Express 5, Supabase, Redis/in-memory cache |
| **CarPoolApp** (rider) | `Client/CarPoolApp/` | Expo 54, React Native 0.81 | Expo Router (file-based), NativeWind/Tailwind |
| **DriverApp** | `Client/DriverApp/` | Expo 54, React Native 0.81 | Expo Router (file-based), NativeWind/Tailwind |
| **shared** | `shared/` | TypeScript | Type definitions only (`@ridepool/shared-types`) |

There is **no root-level workspace**. Each package has its own `package.json` and `node_modules`. Run `npm ci` inside each directory separately.

### Server layers

Request flow: **Routes → Controllers → Services → Supabase**

- `src/routes/` — HTTP route definitions, apply middleware (auth, rate limiting).
- `src/controllers/` — Parse request, validate, call services, format response. All controller methods follow the pattern: extract user from `req.user`, validate input, call service, return JSON.
- `src/services/` — Business logic. No HTTP/request objects here. Services call Supabase or external APIs (Google Maps, payment gateways).
- `src/middleware/` — Auth (`authenticate` / `optionalAuth`), rate limiters, input sanitizer, security headers, error handler.
- `src/config/env.ts` — Centralized config from env vars. `config.mvpMode` switches between Redis and in-memory cache.

Authentication is via Supabase Auth — the `authenticate` middleware validates a Bearer JWT with `supabase.auth.getUser(token)` and attaches the user to `req.user`. Use the `AuthRequest` type (from `src/middleware/auth.ts`) for typed access.

### Client apps

Both Expo apps use:
- **Expo Router** with file-based routing in `app/` directory.
- **Zustand** for global state (`store/useAppStore.ts` in CarPoolApp, `src/store/useDriverStore.ts` in DriverApp).
- **React Context** for auth, theme, and notifications.
- **NativeWind** (Tailwind CSS classes in React Native via `className` prop).
- **Leaflet/react-leaflet** for web maps, **react-native-maps** for native in CarPoolApp.
- Service files in `services/` call the backend API and follow a consistent pattern per domain (auth, pool, ride, payment, etc.).

### Shared types

`shared/src/` exports TypeScript interfaces for all domain models (Ride, Pool, User, Payment, etc.) and API request/response types. Both server and client reference these. When adding a new domain entity, define its types here first.

### Geospatial: H3 indexing

Pool matching uses **Uber H3** hexagonal grid indexing. Key concepts:
- Rides/pools store `pickup_h3_index` and `dropoff_h3_index` columns.
- `poolMatching.service.ts` uses H3 ring searches at configurable resolutions (pickup res 9 ~174m, destination res 7 ~1.2km).
- Route overlap scoring determines pool viability.

### Database

**Supabase (PostgreSQL)** — migrations in `Server/supabase/migrations/`. Schema includes: users, rides, pools, pool_members, payments, wallets, ratings, emergency_contacts, saved_places, driver profiles with H3-indexed location columns.

## Build / Test / Lint

### Server (`cd Server`)
```sh
npm run build          # TypeScript compile (tsc)
npm run dev            # nodemon with ts-node
npm run test           # vitest run (all tests)
npm run test:unit      # vitest run tests/unit
npm run test:integration  # vitest run tests/integration
npx vitest run tests/unit/myfile.test.ts  # single test file
```

### CarPoolApp (`cd Client/CarPoolApp`)
```sh
npx expo start --clear   # dev server
npm run lint             # expo lint (ESLint)
npm test                 # jest
npm test -- --testPathPattern=MyComponent  # single test
npx tsc --noEmit         # type check
```

### DriverApp (`cd Client/DriverApp`)
```sh
npx expo start --clear
npm run lint
npm test
npx tsc --noEmit
```

### Shared (`cd shared`)
```sh
npm run build   # tsc — produces dist/
```

## Key Conventions

- **MVP mode**: Set `MVP_MODE=true` in Server `.env` to skip Redis and use in-memory cache. This is checked via `config.mvpMode` throughout the codebase.
- **Controller pattern**: Every controller method signature is `(req: AuthRequest, res: Response, next: NextFunction)`. Extract `req.user?.id`, validate, call service, respond with `{ message, data }`, catch errors with `next(error)`.
- **Rate limiters**: Separate limiters exist for auth, search, payment, and SOS endpoints. They are applied in `app.ts` before the route mounts.
- **Env vars**: Server uses `dotenv` loaded in `src/config/env.ts`. Client apps use `EXPO_PUBLIC_` prefixed vars. See `.env.example` in each package.
- **Zod validation**: The project uses Zod for input validation (Zod v4 on server, v3 on DriverApp).
- **Docker**: Server has a `Dockerfile` and `docker-compose.yml` / `docker-compose.mvp.yml` for containerized runs.
- **CI**: GitHub Actions in `.github/workflows/` — `ci.yml` runs lint + build + unit tests for all three packages. Integration tests spin up Redis. Security audit runs `npm audit`.
- **Bangladesh context**: Currency is BDT, payment gateways are SSLCommerz and bKash, routing defaults to Mapbox (configurable to Google Maps via `ROUTING_PROVIDER` env).
