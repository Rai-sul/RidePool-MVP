-- Purpose: trigger functions and the triggers that fire them.
--
-- Three jobs are handled here, all of them things the database should do for
-- itself rather than trusting every caller to remember:
--   * keep updated_at honest
--   * derive PostGIS geography from the lat/lng the client sent
--   * maintain denormalised values (referral code, user rating, cancelled_at)

-- updated_at ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $fn$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER t_users_ts BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER t_wallets_ts BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER t_saved_places_ts BEFORE UPDATE ON public.saved_places FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER t_vehicles_ts BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER t_pools_ts BEFORE UPDATE ON public.pools FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER t_rides_ts BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Geography derivation ------------------------------------------------------

-- One function serves five tables; TG_TABLE_NAME selects the branch. Clients
-- only ever send lat/lng — the geography columns that the GIST indexes cover
-- are filled here, so they can never drift out of step with the numbers.
CREATE OR REPLACE FUNCTION public.calc_geography()
RETURNS TRIGGER AS $fn$
BEGIN
  IF TG_TABLE_NAME = 'users' THEN
    IF NEW.driver_priority_lat IS NOT NULL AND NEW.driver_priority_lng IS NOT NULL THEN
      NEW.driver_priority_location = ST_SetSRID(ST_MakePoint(NEW.driver_priority_lng, NEW.driver_priority_lat), 4326)::geography;
    END IF;
  ELSIF TG_TABLE_NAME = 'saved_places' THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSIF TG_TABLE_NAME = 'vehicle_locations' THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSIF TG_TABLE_NAME = 'pools' THEN
    NEW.pickup_location = ST_SetSRID(ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat), 4326)::geography;
    NEW.destination_location = ST_SetSRID(ST_MakePoint(NEW.destination_lng, NEW.destination_lat), 4326)::geography;
  ELSIF TG_TABLE_NAME = 'rides' THEN
    NEW.pickup_location = ST_SetSRID(ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat), 4326)::geography;
    NEW.dropoff_location = ST_SetSRID(ST_MakePoint(NEW.dropoff_lng, NEW.dropoff_lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER t_users_geo BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION calc_geography();
CREATE TRIGGER t_saved_places_geo BEFORE INSERT OR UPDATE ON public.saved_places FOR EACH ROW EXECUTE FUNCTION calc_geography();
CREATE TRIGGER t_vehicle_loc_geo BEFORE INSERT OR UPDATE ON public.vehicle_locations FOR EACH ROW EXECUTE FUNCTION calc_geography();
CREATE TRIGGER t_pools_geo BEFORE INSERT OR UPDATE ON public.pools FOR EACH ROW EXECUTE FUNCTION calc_geography();
CREATE TRIGGER t_rides_geo BEFORE INSERT OR UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION calc_geography();

-- Derived values ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $fn$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Keeps users.average_rating / total_ratings in step with the ratings table.
CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS TRIGGER AS $fn$
DECLARE
  v_avg DECIMAL(3,2);
  v_count INTEGER;
BEGIN
  SELECT AVG(rating), COUNT(*) INTO v_avg, v_count
  FROM public.ratings
  WHERE rated_id = NEW.rated_id;

  UPDATE public.users
  SET average_rating = v_avg, total_ratings = v_count
  WHERE id = NEW.rated_id;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_rating
  AFTER INSERT OR UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

CREATE OR REPLACE FUNCTION public.set_ride_cancelled_at()
RETURNS TRIGGER AS $fn$
BEGIN
  IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
    NEW.cancelled_at = NOW();
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ride_cancelled_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION set_ride_cancelled_at();
