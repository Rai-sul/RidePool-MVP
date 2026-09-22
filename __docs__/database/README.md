# Database

Supabase / PostgreSQL. Migrations live in `Server/supabase/migrations/` and are
applied with `npm run migrate` from `Server/`.

---

## Migration layout

Migrations are **ordered by concern**, not by feature. Keep that shape when
adding one — put a new table in the matching `tables_*` file's successor rather
than creating a feature-shaped migration that mixes tables, indexes and grants.

| File | Contents |
|---|---|
| `…000100_extensions.sql` | Postgres extensions |
| `…000200_tables_identity.sql` | `users`, `vehicles`, device/session identity |
| `…000300_tables_rides.sql` | `rides`, `pools`, `pool_members`, locations |
| `…000400_tables_money.sql` | `wallets`, `payments`, promo, promise money |
| `…000500_tables_messaging.sql` | `conversations`, `messages`, notifications |
| `…000600_tables_ops.sql` | audit, offline sync, analytics, cooldowns |
| `…000700_foreign_keys.sql` | All FK constraints |
| `…000800_indexes.sql` | All indexes, including H3 lookups |
| `…000900_functions.sql` | Every stored function (below) |
| `…001000_triggers.sql` | Triggers |
| `…001100_row_level_security.sql` | RLS policies |
| `…001200_grants.sql` | Role grants |
| `…001300_realtime.sql` | Realtime publication |
| `…001400_seed_app_metadata.sql` | Seed data |

## Tables

**Identity** — `users`, `vehicles`, `device_tokens`, `driver_sessions`

**Rides & pools** — `rides`, `pools`, `pool_members`, `vehicle_locations`,
`saved_places`, `priyo_sathi`

**Money** — `wallets`, `wallet_transactions`, `payments`,
`promise_money_transactions`, `promo_codes`, `user_promo_usage`,
`driver_earnings`, `driver_daily_stats`

**Messaging** — `conversations`, `conversation_participants`, `messages`,
`notifications`, `notification_preferences`

**Operations** — `audit_logs`, `offline_actions`, `sync_logs`,
`user_cancellations`, `cooldown_periods`, `ratings`, `app_metadata`

Location columns are H3-indexed: `pickup_h3_index` (res 9),
`destination_h3_index` (res 7), driver cells at res 8.

## Atomic functions

Concurrency-sensitive work happens **inside Postgres**, not in application
transactions. Call these via `supabase.rpc(...)` — never reimplement the check
in TypeScript, because two Node instances cannot serialise against each other.

| Function | Guarantees |
|---|---|
| `atomic_join_pool` | Row locking. Capacity, Active Pickup Range, trusted gender and duplicate-join checks in one transaction. |
| `atomic_leave_pool` | Consistent member removal and passenger recount. |
| `atomic_accept_pool` | `SKIP LOCKED` — prevents two drivers being assigned the same pool. |
| `atomic_assign_advance_booking` | Advance auto-assignment plus the pool-wide pickup window. |
| `atomic_confirm_advance_member` | Opens the Active Pickup Range at the 2nd confirmation. |
| `atomic_wallet_credit` | Credits a balance and writes the transaction record. |
| `atomic_wallet_debit` | Prevents a negative balance; writes the transaction record. |
| `atomic_process_payment` / `complete_payment` / `fail_payment` | Payment state machine. |
| `deposit_promise_money` / `deduct_promise_money` | Promise-money ledger. |
| `increment_promo_usage` | Race-free promo redemption counting. |
| `update_vehicle_location` | Driver location upsert. |
| `get_my_pool_ids` | RLS helper — the caller's pool IDs. |
| `vehicle_capacity` | Capacity lookup, mirroring `CONSTANTS.VEHICLE_CAPACITY`. |

> `vehicle_capacity` in SQL and `CONSTANTS.VEHICLE_CAPACITY` in TypeScript must
> agree (CNG 2, CAR 3). Change both together.

## Security

Row Level Security is enabled; policies live in
`…001100_row_level_security.sql`. The server uses the service-role key and
therefore bypasses RLS — authorization for server routes is enforced by the
`authenticate` / `authorization` middleware instead. RLS protects clients that
talk to Supabase directly.

## Before you `db push`

The live project may not be baselined against this migration set. Confirm which
migrations Supabase believes are applied **before** pushing, or you risk
replaying migrations against a populated database.
