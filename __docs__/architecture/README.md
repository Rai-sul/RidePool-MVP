# Architecture

RidePool is a ride-**pooling** app for Dhaka: several riders heading the same
way share one vehicle and split the fare.

---

## Packages

A TypeScript monorepo with **no root workspace** — every package is installed
and run from its own directory.

| Package | Path | Runtime |
|---|---|---|
| Server | `Server/` | Node 20, TypeScript (CommonJS), Express 5 |
| CarPoolApp (rider) | `Client/CarPoolApp/` | Expo 54, React Native 0.81, Expo Router, NativeWind |
| DriverApp | `Client/DriverApp/` | Expo 54, React Native 0.81, Expo Router, NativeWind |
| shared | `shared/` | Type-only package `@ridepool/shared-types`, built with `tsc` |

`shared/src/` defines the domain model and API request/response types used by
both the server and the apps. **Define a new domain entity there first**, then
`cd shared && npm run build` before consuming it elsewhere.

## Shape

```
CarPoolApp ─┐
            ├─→  Express API  ──→  Services  ──→  Supabase (PostgreSQL + RLS + Realtime)
DriverApp  ─┘         │                │
                      │                └──→  Google Maps (Directions + Routes)
                      └──→  Cache (Redis, or in-memory in MVP mode)
```

- **Routes → Controllers → Services → Supabase.** Controllers never contain
  business logic; services never touch `req`/`res`.
- **Auth** is Supabase Auth. `authenticate` validates a Bearer JWT and attaches
  `req.user`.
- **Concurrency-sensitive operations** are atomic Postgres functions, not
  application-level transactions.

## Read next

| Topic | Page |
|---|---|
| Boot, request lifecycle, service map, cost model | [server.md](./server.md) |
| How riders are matched to pools | [pool-matching.md](./pool-matching.md) |
| Traffic-optimized multi-stop routing | [combined-route.md](./combined-route.md) |
| Scheduled rides | [advance-booking.md](./advance-booking.md) |
| Fare formula and wallet | [fares.md](./fares.md) |
| Push and in-app notifications | [notifications.md](./notifications.md) |
| Tables, functions, migrations | [../database/README.md](../database/README.md) |

## Clients

Both apps use Expo Router (file-based routing in `app/`), Zustand for global
state (`store/useAppStore.ts` in CarPoolApp, `src/store/useDriverStore.ts` in
DriverApp), React Context for auth/theme/notifications, and NativeWind for
styling. Each domain has a matching `services/*.service.ts` that calls the API.

Maps: the rider app renders `react-native-maps` natively and Leaflet /
`@react-google-maps/api` on web, selected inside `components/` (`NativeMap.tsx`,
`WebMap.tsx`, `StaticMapView.tsx`, `GoogleMapView.tsx`). The driver app uses
`react-native-maps` only. See [../guides/expo-go-maps.md](../guides/expo-go-maps.md)
for the Expo Go fallback.

## App-wide invariants

- **Vehicle capacity**: CNG 2 passengers, CAR 3. `CONSTANTS.VEHICLE_CAPACITY`
  is the only source; `max_passengers` is never accepted from the client.
- **Gender restriction**: `FEMALE_ONLY` is granted only when the stored profile
  says `gender = 'FEMALE'`. Use `utils/genderRestriction.ts`.
- **Advance-booking durations** always derive from `config.advanceBooking` via
  `utils/advanceWindow.ts`. Never hardcode one.
- **Caching** always goes through `unifiedCacheService`, never `cacheService`
  directly.

## Validation

Zod — **v4 on the Server, v3 on DriverApp**. The versions differ; do not assume
the APIs match one-to-one across packages.

## Scaling notes

The server is stateless and horizontally scalable, with two caveats:

- In MVP mode the cache is in-process, so cache hits are not shared between
  instances. Redis is required for multi-instance deployments.
- `smartRoute`'s in-flight request de-duplication is per-process, so N instances
  can each issue one billed route call for the same pool on a cold cache.
