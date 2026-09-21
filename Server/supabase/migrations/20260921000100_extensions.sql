-- Purpose: PostgreSQL extensions the schema depends on.
-- Must run before anything else: pools, rides, users, saved_places and
-- vehicle_locations all declare GEOGRAPHY columns, which PostGIS provides.
--
-- Supabase pre-installs pgcrypto into the "extensions" schema, so the
-- statement below is a no-op there. It is kept so a plain PostgreSQL
-- database (local reset, CI) also gets gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
