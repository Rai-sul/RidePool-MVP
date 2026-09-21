# Old migrations — kept for history, not for running

These are the ten migration files that built the database before the
2026-09-21 cleanup. They are kept so the history stays readable and so any
claim in the new files can be traced back to where it came from.

**Do not run these.** The Supabase CLI only reads `supabase/migrations/*.sql`,
so this folder is inert — `supabase db push` and `supabase db reset` ignore it.
Nothing needs to be done to keep it that way.

The live schema they produced is reproduced exactly by the files in
`supabase/migrations/`, apart from a short list of deliberate removals
recorded in the cleanup notes.

## Why they were replaced

The first file, `20260121_ridepool_merged_schema.sql`, opens with 44
`DROP TABLE ... CASCADE` statements. That is safe on an empty database and
catastrophic on a populated one. Because the production project has no
migration bookkeeping, the CLI would have considered that file unapplied and
replayed it. The new files contain no destructive statements.

Beyond that, the old set had accumulated the usual drift: five later files
existed only to undo parts of the first one, so reading the schema meant
replaying ten files in order and tracking what had been dropped along the way.

## The files

| File | What it did |
|---|---|
| `20260121_ridepool_merged_schema.sql` | Everything: 44 tables, functions, triggers, RLS, seed data — preceded by a drop-everything block |
| `20260125_enable_realtime.sql` | Added 8 tables to the realtime publication; replaced two RLS policies |
| `20260216_add_device_tokens_app_type.sql` | Added `device_tokens.app_type` |
| `20260216_add_vehicle_locations_unique_constraint.sql` | Added the unique index on `vehicle_locations.vehicle_id` |
| `20260219_fix_pools_pickup_location_trigger.sql` | Fixed `calc_geography()`, which never populated `pools.pickup_location`; backfilled existing rows |
| `20260709_remove_retired_features.sql` | Dropped demand heatmaps, driver shifts, safety/SOS, emergency contacts, trip sharing, `users.preferred_language` |
| `20260712_allow_pool_members_vehicle_location_read.sql` | Let pool members read the assigned driver's live location |
| `20260713_remove_fraud_reports.sql` | Dropped `fraud_reports` |
| `20260714_remove_unused_geo_route_cache.sql` | Dropped `geo_zones`, `route_cache`, `navigation_route_cache` and their functions |
| `20260920_advance_booking.sql` | Advance/scheduled bookings, vehicle capacity rule, three atomic functions |
