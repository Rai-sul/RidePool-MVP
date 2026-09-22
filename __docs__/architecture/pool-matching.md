# Pool Matching

How a rider's request is matched to existing pools.

Owner: `Server/src/services/poolMatching.service.ts`
Helpers: `routeOverlap.service.ts`, `utils/h3.utils.ts`, `poolSearchResponse.service.ts`

> The scoring weights and thresholds below are the live values. Changing any of
> them changes which pools riders are offered — treat them as product config,
> not implementation detail.

---

## H3 geospatial index

Matching is built on Uber's H3 hexagonal grid (`h3-js`), configured in
`config.h3`:

| What | Resolution | Cell size | Env var |
|---|---|---|---|
| Pickup | 9 | ~0.35 km | `H3_RESOLUTION_PICKUP` |
| Destination | 7 | ~2.4 km | `H3_RESOLUTION_DESTINATION` |
| Driver | 8 | — | `H3_RESOLUTION_DRIVER` |

Ring searches expand outward from those indexes, bounded by
`H3_SEARCH_RADIUS_PICKUP` (default 6 rings ≈ 2.1 km) and
`H3_SEARCH_RADIUS_DESTINATION` (default 2 rings ≈ 4.8 km).

## Three passes

**Pass 1 — candidate query (database).**
Pull pools whose pickup H3 falls inside the rider's pickup ring, then filter:

- `current_passengers < max_passengers`
- liveness — instant pools must be `WAITING_FOR_RIDERS` and younger than the
  40 s search window; advance pools must be inside their Active Pickup Range
  (`isAdvancePoolJoinableNow`)
- if no pool is in the pickup area, the ring is widened by 2 and retried

**Pass 2 — scoring (in memory, free).**
Each surviving pool is scored out of 100. Pools scoring below
`MINIMUM_MATCH_SCORE = 30` are dropped. Results sort by score descending, then
by lower detour.

| Component | Max | How it scores |
|---|---|---|
| Route overlap | 35 | `overlapPercentage / 100` — the dominant signal |
| Pickup distance | 25 | `1 − (pickupDistance / maxPickupDistance)` |
| Passenger fill | 20 | `currentPassengers / maxPassengers` — favours fuller pools |
| Destination proximity | 10 | `1 − (destinationDistance / maxDestinationDistance)` |
| Exact pickup hex match | 5 | bonus |
| Exact destination hex match | 5 | bonus |

Total is rounded and capped at 100.

**Pass 3 — Google Maps enrichment (billed).**
Only the top 10 matches are enriched with exact distance, ETA, geometry and
steps.

The enrichment route is the **rider's own pickup → destination leg**, which is
identical for every match in the search. It is fetched **once** and shared
across matches — never once per match. A single batched query then confirms the
pools still exist before enrichment is applied. If no API key is configured,
the H3 estimates from Pass 2 are returned unchanged.

## Invariants

These are enforced in code and must not be worked around:

- **Capacity comes from `CONSTANTS.VEHICLE_CAPACITY`** — CNG carries 2
  passengers, CAR carries 3. `max_passengers` is never accepted from the client.
- **`MIN_PASSENGERS = 2`** — a pool never dispatches as a solo ride unless
  `ADVANCE_SOLO_FALLBACK` is explicitly enabled for advance pools.
- **Gender restriction**: `FEMALE_ONLY` is granted only when the *stored*
  profile says `gender = 'FEMALE'`. Use `utils/genderRestriction.ts`; never
  trust a client-supplied flag.
- Ranges: `PICKUP_RANGE_KM = 2`, `DESTINATION_RANGE_KM = 5`
  (`src/config/constants.ts`).

## Search timing

`lookupTime.service.ts` runs a two-phase timer: **30 s** initial search, then a
**10 s** extended search (40 s total). Reaching 2 passengers transitions the
pool to `WAITING_FOR_DRIVER` immediately; expiring with fewer cancels it.

## Concurrency

Joining is not done in application code. `atomic_join_pool` (row locking)
enforces capacity, Active Pickup Range, trusted gender and duplicate-join checks
in one transaction. See [../database/README.md](../database/README.md).

## Advance pools

An advance booking is a `rides` row with `booking_type = 'ADVANCE'`, not a
separate entity, so everything above applies unchanged. Advance pools sit in
`SCHEDULED`, which every pre-existing query excludes by default — only this
service opts them in, behind `isAdvancePoolJoinableNow`. See
[advance-booking.md](./advance-booking.md).
