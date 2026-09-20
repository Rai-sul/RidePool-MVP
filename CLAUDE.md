# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

RidePool is a TypeScript monorepo with **no root-level workspace** — each package has its own `package.json`/`node_modules` and must be installed and run from its own directory (`npm ci` / `npm install` per package):

| Package | Path | Runtime |
|---------|------|---------|
| **Server** | `Server/` | Node 20, TypeScript (CommonJS), Express 5, Supabase, Redis/in-memory cache |
| **CarPoolApp** (rider app) | `Client/CarPoolApp/` | Expo 54, React Native 0.81, Expo Router, NativeWind |
| **DriverApp** | `Client/DriverApp/` | Expo 54, React Native 0.81, Expo Router, NativeWind |
| **shared** | `shared/` | Type-only package (`@ridepool/shared-types`), built with `tsc` |

Supabase migrations live in `Server/supabase/migrations/`; project docs live in `__docs__/` (architecture, database schema, security, planning).

## Commands

### Server (`cd Server`)
```sh
npm run dev                              # nodemon + ts-node, src/app.ts
npm run build                            # tsc -> dist/
npm run start                            # run compiled dist/app.js
npm test                                 # vitest run (all tests)
npm run test:unit                        # vitest run tests/unit
npm run test:integration                 # vitest run tests/integration
npx vitest run tests/unit/myfile.test.ts # single test file
npm run migrate                          # cd ../supabase && supabase db push
```
Backend tests match `Server/tests/**/*.test.ts`.

### CarPoolApp / DriverApp (`cd Client/CarPoolApp` or `cd Client/DriverApp`)
```sh
npx expo start --clear                          # dev server
npm run lint                                    # expo lint (ESLint) — run before UI changes
npm test                                        # jest
npm test -- --testPathPattern=MyComponent       # single test
npx tsc --noEmit                                # type check
npm run android / npm run ios / npm run web     # run on a target
```
Client tests live in `__tests__/` folders.

### shared (`cd shared`)
```sh
npm run build   # tsc -> dist/ (both apps and Server import compiled shared types)
```

## Architecture

### Server request flow
**Routes → Controllers → Services → Supabase**, under `Server/src/`:
- `routes/` — route definitions; middleware (auth, rate limiting) applied here and in `app.ts`.
- `controllers/` — parse/validate request, call services, format response. Every controller method has the signature `(req: AuthRequest, res: Response, next: NextFunction)`: extract `req.user?.id`, validate, call service, respond with `{ message, data }`, forward errors to `next(error)`.
- `services/` — business logic only, no HTTP objects; call Supabase or external APIs (Google Maps, payment gateways). Key services: `poolMatching.service.ts`, `routeOverlap.service.ts`, `smartRoute.service.ts`, `fare.service.ts`, `rideEstimation.service.ts`, `wallet.service.ts`, `penalty.service.ts`, `advanceBooking.service.ts`, `advanceDispatch.service.ts`, `advanceScheduler.service.ts`.
- `middleware/` — `auth.ts` (`authenticate` / `optionalAuth`), `authorization.ts`, `rateLimiter.ts` (separate limiters for auth, search, payment, SOS — applied in `app.ts`), `inputSanitizer.ts`, `securityHeaders.ts`, `errorHandler.ts`.
- `config/env.ts` — centralized env config. `config.mvpMode` (set via `MVP_MODE=true` or `SKIP_REDIS=true`) switches caching between Redis and in-memory; also holds H3 resolution/search-radius settings, the Google Maps key, and `config.advanceBooking` (advance-booking time windows).

Authentication is Supabase Auth: `authenticate` middleware validates a Bearer JWT via `supabase.auth.getUser(token)` and attaches the user to `req.user` (typed `AuthRequest` from `src/middleware/auth.ts`).

### Geospatial matching: H3
Pool matching uses Uber's H3 hexagonal grid (`h3-js`), configured in `config.h3`:
- Pickup indexing at resolution 9 (~0.35km cells), destination at resolution 7 (~2.4km cells), driver at resolution 8.
- Ring searches expand from those indexes (`H3_SEARCH_RADIUS_PICKUP`/`H3_SEARCH_RADIUS_DESTINATION`) to find nearby pools.
- `routeOverlap.service.ts` scores route similarity between candidate matches on top of the H3 proximity search.
- Routing/ETA uses Google Directions via `smartRoute.service.ts`, with a geometric fallback when Directions calls fail or are skipped for cost control.

### Advance booking (scheduled rides)
An advance booking is a `rides` row with `booking_type='ADVANCE'` and a `scheduled_pickup_at` — not a separate entity — so the existing matching, fare, route and notification paths apply unchanged. Advance riders are auto-assigned to a pool and never browse; instant riders can backfill a confirmed advance pool through the normal `/api/pools/search` + join flow while it is inside its Active Pickup Range.

Pools gather bookings in the `SCHEDULED` status, which every pre-existing query excludes by default — only `poolMatching.service.ts` opts them in, behind `isAdvancePoolJoinableNow`. All windows derive from `config.advanceBooking` via `utils/advanceWindow.ts`; `ADVANCE_TIME_UNIT=seconds` compresses minutes to seconds for QA. Never hardcode a duration. Full reference: `__docs__/architecture/advance-booking.md`.

### App-wide invariants
- **Vehicle capacity**: CNG carries 2 passengers, CAR carries 3. `CONSTANTS.VEHICLE_CAPACITY` is the only source; `max_passengers` is never accepted from the client.
- **Gender restriction**: `FEMALE_ONLY` is granted only when the stored profile says `gender = 'FEMALE'`. Use `utils/genderRestriction.ts`; never trust a client-supplied flag.

### Client apps
Both Expo apps use Expo Router (file-based routing in `app/`), Zustand for global state (`store/useAppStore.ts` in CarPoolApp, `src/store/useDriverStore.ts` in DriverApp), React Context for auth/theme/notifications, and NativeWind for styling. CarPoolApp additionally supports web maps via Leaflet/react-leaflet (native uses `react-native-maps`). Each domain (auth, pool, ride, payment, ...) has a corresponding service file under `services/` that calls the backend API.

### Shared types
`shared/src/` defines the domain model and API request/response TypeScript interfaces (Ride, Pool, User, Payment, etc.), consumed by both Server and clients. Define new domain entities here first, then rebuild (`cd shared && npm run build`) before consuming the types elsewhere.

### Database
Supabase/PostgreSQL, migrations in `Server/supabase/migrations/`. Notable tables: `driver_sessions`, `driver_earnings`, `user_cancellations`, `cooldown_periods` (cancellation penalty system), plus users/rides/pools/pool_members/payments/wallets/ratings/emergency_contacts/saved_places, with H3-indexed location columns. Concurrency-sensitive operations go through atomic Postgres functions rather than app-level transactions: `atomic_join_pool` (row locking; capacity, Active Pickup Range, trusted gender and duplicate-join checks), `atomic_accept_pool` (SKIP LOCKED, prevents double driver-assignment), `atomic_wallet_debit` (prevents negative balance, writes a transaction record), `atomic_assign_advance_booking` (advance auto-assignment and pool-wide pickup window), `atomic_confirm_advance_member` (opens the Active Pickup Range at 2 confirmations).

### Validation
Zod is used for input validation — v4 on the Server, v3 on DriverApp (version differs; don't assume APIs match 1:1 across packages).

### Bangladesh-specific context
Currency is BDT; payment gateways are SSLCommerz and bKash.

## Coding conventions

TypeScript throughout. 2-space indentation, single quotes in backend files, Expo/React Native patterns in client files. PascalCase components, `use...` hooks, `*.service.ts` services, `*.routes.ts` routes, platform-specific files as `.native.tsx`/`.web.tsx`.
