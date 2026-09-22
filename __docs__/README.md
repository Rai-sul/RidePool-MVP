# RidePool Documentation

Ride-pooling for Dhaka: several riders heading the same way share one vehicle
and split the fare. Currency is BDT.

**Everything outside [`history/`](./history/) describes the system as it is
today.** If a page here disagrees with the code, the code wins — please fix the
page.

---

## Where do I look for…

| I want to… | Read |
|---|---|
| Understand the whole system | [architecture/README.md](./architecture/README.md) |
| Run the project locally | [guides/running-the-project.md](./guides/running-the-project.md) |
| Add or change an API endpoint | [architecture/server.md](./architecture/server.md) → [reference/api.md](./reference/api.md) |
| Work on pool search / matching | [architecture/pool-matching.md](./architecture/pool-matching.md) |
| Work on routing or ETAs | [architecture/combined-route.md](./architecture/combined-route.md) |
| Reduce Google Maps cost | [architecture/server.md](./architecture/server.md#google-maps-cost-model) |
| Work on scheduled rides | [architecture/advance-booking.md](./architecture/advance-booking.md) |
| Change fares, discounts or the wallet | [architecture/fares.md](./architecture/fares.md) |
| Add a notification | [architecture/notifications.md](./architecture/notifications.md) |
| Add a table, index or migration | [database/README.md](./database/README.md) |
| Set an environment variable | [reference/environment.md](./reference/environment.md) |
| Fix maps not rendering | [guides/maps-and-navigation.md](./guides/maps-and-navigation.md) |
| Restore a backup or handle an outage | [operations/](./operations/) |
| Know *why* something was built this way | [history/README.md](./history/README.md) |

## Layout

```
__docs__/
├── architecture/     how the system works  ← start here
├── database/         schema, atomic functions, migrations
├── reference/        API endpoints, environment variables
├── guides/           setup and how-to
├── operations/       backup and disaster recovery
├── diagrams/         UML / ERD / dataflow (SVG + LaTeX source)
└── history/          point-in-time records — NOT current
```

## The five invariants

Break one of these and something silently misbehaves:

1. **Capacity** comes from `CONSTANTS.VEHICLE_CAPACITY` — CNG 2, CAR 3.
   `max_passengers` is never accepted from the client.
2. **`FEMALE_ONLY`** is granted only when the *stored* profile says
   `gender = 'FEMALE'`. Use `utils/genderRestriction.ts`; never trust a client
   flag.
3. **Advance-booking durations** always derive from `config.advanceBooking` via
   `utils/advanceWindow.ts`. Never hardcode one.
4. **Caching** always goes through `unifiedCacheService`. Importing
   `cacheService` directly disables the cache entirely whenever `MVP_MODE=true`.
5. **Concurrency** — joining a pool, accepting a pool and moving money happen in
   atomic Postgres functions, never in application code.

## Commands

Each package installs and runs from its own directory — there is no root
workspace.

```sh
# Server
cd Server
npm run dev                      # nodemon + ts-node
npm test                         # vitest
npx tsc --noEmit                 # type-check src/
npx tsc --noEmit -p tsconfig.test.json   # type-check tests too (not in npm test)
npm run migrate                  # supabase db push

# Apps
cd Client/CarPoolApp             # or Client/DriverApp
npx expo start --clear
npm run lint                     # run before UI changes

# Shared types — build before consuming elsewhere
cd shared && npm run build
```

## Diagrams

[`diagrams/`](./diagrams/) holds the activity, dataflow, EER, schema, sequence
and use-case diagrams as `.svg` with `.tex` sources.
