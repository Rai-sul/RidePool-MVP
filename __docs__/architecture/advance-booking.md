# Advance Booking / Scheduled Ride Pooling

RidePool has two ways to book:

| | Instant | Advance |
|---|---|---|
| When you book | Right when you need the ride | Ahead of time, for a future pickup |
| Pool joining | You browse and pick a pool | You are **auto-assigned** by the server |

An advance booking is not a separate entity: it is a row in `rides` with
`booking_type = 'ADVANCE'` and a `scheduled_pickup_at`. Every existing
matching, fare, route, notification and cancellation path therefore works on
it unchanged.

---

## Time windows

Every window is expressed in **units** and derived from one config block
(`config.advanceBooking`, read through `src/utils/advanceWindow.ts`). Nothing
in the feature hardcodes a duration.

| Env var | Default | Meaning |
|---|---|---|
| `ADVANCE_TIME_UNIT` | `minutes` | Set to `seconds` to compress every window for dev/QA |
| `ADVANCE_POOL_WINDOW` | `30` | Max spread between the earliest and latest pickup in one pool |
| `ADVANCE_CONFIRM_LEAD` | `10` | How far before the earliest pickup confirmation opens |
| `ADVANCE_CONFIRM_WINDOW` | `5` | How long riders get to confirm |
| `ADVANCE_MAX_LEAD_DAYS` | `7` | Furthest ahead a pickup may be scheduled |
| `ADVANCE_SOLO_FALLBACK` | `false` | Allow dispatching a pool with one confirmed rider |

`ADVANCE_TIME_UNIT=seconds` turns the 30-minute pool window into 30 seconds and
the 10-minute confirmation lead into 10 seconds, so the whole lifecycle can be
exercised in under a minute. Production must keep the default.

The confirmation window is shorter than the lead on purpose: the remainder is
the runway for the driver search and for instant riders to backfill the pool.

---

## Pool lifecycle

```
SCHEDULED                     gathering advance bookings; invisible to instant riders
   |
   |  earliest pickup - ADVANCE_CONFIRM_LEAD
   v
SCHEDULED (confirming)        every rider is asked to confirm
   |
   |  2nd rider confirms  ->  active_range_start_at set
   v
WAITING_FOR_DRIVER            driver search starts; instant riders can now backfill
   |
   v
DRIVER_ASSIGNED / READY_TO_START / STARTED / COMPLETED
```

`SCHEDULED` is fail-safe. Every pre-existing query filters on
`WAITING_FOR_RIDERS` / `WAITING_FOR_DRIVER`, so a scheduled pool is invisible
everywhere until a query opts it in explicitly. Only
`poolMatching.service.ts` does, and only behind the Active Pickup Range check.

At the confirmation deadline the pool is settled:

| Confirmed riders | Outcome |
|---|---|
| 2 or more | `DISPATCHED` - unconfirmed riders removed, driver search runs |
| exactly 1 | never a solo ride: `WAIT_FOR_MATCH` (moved to another pool), else `ASK_USER_TO_EXTEND`, else `CANCEL_POOL` |
| 0 | `CANCELLED` - no driver search |

A solo dispatch happens only with `ADVANCE_SOLO_FALLBACK=true`.

---

## Auto-assignment

For every new or updated advance booking, `advanceBooking.service.ts`:

1. Validates the pickup time and resolves the gender restriction against the
   stored profile.
2. Queries `SCHEDULED` pools that match vehicle type, gender, destination H3
   ring and the pool-wide time window, then scores each with the existing
   `poolMatchingService.isRideCompatibleWithPool`.
3. Ranks them deterministically: match score, then closeness in time, then
   occupancy, then pool id.
4. Calls `atomic_assign_advance_booking` on each in turn. The database has the
   final say on seats and the pickup window, so a pool that fills up mid-loop
   just falls through to the next candidate.
5. Creates a new pool if nothing fits.

**The pickup window is pool-wide, not pairwise.** A pool spanning 8:00 and
8:30 is fine; adding 8:45 to it is not, even though 8:45 is within 30 minutes
of 8:30. The SQL recomputes `MIN`/`MAX` across every member on each insert.

The pool's `scheduled_pickup_at` is the **earliest** member pickup: that is
when the vehicle starts its route, and when the Active Pickup Range closes.

---

## Active Pickup Range (instant backfill)

Letting instant riders join a confirmed advance pool is a backfill mechanism,
not a second discovery surface. Eligible advance pools appear in the same
`GET /api/pools/search` list as instant pools, with the same ranking.

```
active_range_start = the moment the pool first reaches 2 CONFIRMED riders
active_range_end   = the pool's scheduled pickup time
```

A pool is shown only while `start <= now < end`, checked with server time in
`poolMatchingService.isAdvancePoolJoinableNow`. Riders merely *joined* do not
open the range - they must have confirmed.

On join, `atomic_join_pool` re-checks the range, seat capacity, membership and
gender under the row lock with the database's own `NOW()`, so a stale
discovery result can never be replayed into a join and an unlisted pool id
gets no shortcut. Rejections come back as `POOL_NO_LONGER_ACTIVE`,
`POOL_FULL`, `ROUTE_NOT_COMPATIBLE`, `GENDER_NOT_COMPATIBLE`,
`POOL_NO_LONGER_JOINABLE` or `ALREADY_IN_POOL`; the client refreshes the list
after any of them.

Tapping Join on an already-confirmed pool *is* that rider's confirmation - an
instant joiner does not go through the confirmation step.

---

## Scheduler

`advanceScheduler.service.ts` sweeps the database on an interval rather than
holding `setTimeout` handles, because advance pools outlive any single
process. Each tick:

1. Opens confirmation for pools that reached `confirmation_opens_at`.
2. Settles pools past `confirmation_deadline_at`.
3. Cancels pools whose pickup time passed with no driver.

The sweep is idempotent, guarded against overlapping runs, and stopped through
`gracefulShutdownService`. It ticks every second in seconds mode and every 15
seconds otherwise.

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/advance-bookings` | Create a booking; server auto-assigns a pool |
| `GET` | `/api/advance-bookings` | Rider's upcoming bookings and pool state |
| `PATCH` | `/api/advance-bookings/:rideId` | Change details; seat is freed and matching re-runs |
| `DELETE` | `/api/advance-bookings/:rideId` | Cancel and free the seat |
| `POST` | `/api/advance-bookings/:poolId/confirm` | Confirm during the confirmation window |

There is deliberately **no** discovery endpoint here: advance riders never
browse pools, and `POST /api/pools/:poolId/join` rejects a ride whose
`booking_type` is `ADVANCE`.

---

## Related app-wide changes

**Vehicle capacity is now fixed per vehicle type: CNG carries 2 passengers,
CAR carries 3.** This applies to every pool, instant or advance.
`CONSTANTS.VEHICLE_CAPACITY` is the single source; `max_passengers` is no
longer accepted from the client, and `pools.max_passengers` is constrained to
2-3 in the database.

**Gender restriction is verified server-side.** `FEMALE_ONLY` is granted only
when the stored profile says `gender = 'FEMALE'`, otherwise it is coerced to
`ANY`. Applied in pool search, ride creation, pool creation, advance bookings,
and again inside `atomic_join_pool`.

---

## Client

- `components/ScheduleRidePicker.tsx` - picks a pickup time in the server's own
  unit, so it works in both minutes and seconds mode.
- `components/ScheduledRides.tsx` - upcoming bookings with the confirm and
  cancel actions. Rendered in the Trips screen's Upcoming tab and at
  `/scheduled-rides`, which the confirmation push notification deep-links to.
- `components/RideConfirmation.tsx` - a "Ride Now / Schedule" toggle. In
  Schedule mode the pool list is not fetched at all.
- `components/AvailablePoolCard.tsx` - a "Leaves HH:MM" badge on advance pools
  surfaced inside their Active Pickup Range.
