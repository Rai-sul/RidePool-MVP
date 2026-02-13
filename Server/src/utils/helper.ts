
import { Location, Ride, Pool } from '../types';

export const AVERAGE_CITY_SPEED_KMH = 6.4;

/**
 * Calculate great-circle distance between two geographic points
 * Uses Haversine formula
 * 
 * @param lat1 - First point latitude
 * @param lon1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lon2 - Second point longitude
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const EARTH_RADIUS_KM = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate distance from ride locations
 */
export const getRideDistance = (ride: Ride): number => {
  return calculateDistance(
    ride.pickup_lat,
    ride.pickup_lng,
    ride.dropoff_lat,
    ride.dropoff_lng
  );
};

/**
 * Calculate distance from pool destination to pickup point
 */
export const getPoolToPickupDistance = (
  pool: Pool,
  pickupLat: number,
  pickupLng: number
): number => {
  return calculateDistance(
    pool.destination_lat,
    pool.destination_lng,
    pickupLat,
    pickupLng
  );
};

/**
 * Calculate distance between pool and ride destinations
 */
export const getDestinationDistance = (pool: Pool, ride: Ride): number => {
  return calculateDistance(
    pool.destination_lat,
    pool.destination_lng,
    ride.dropoff_lat,
    ride.dropoff_lng
  );
};

/**
 * Estimate travel time based on distance and speed
 * 
 * @param distanceKm - Distance in kilometers
 * @param speedKmh - Average speed in km/h (default: AVERAGE_CITY_SPEED_KMH)
 * @returns Estimated time in minutes
 */
export const estimateTravelTime = (
  distanceKm: number,
  speedKmh: number = AVERAGE_CITY_SPEED_KMH
): number => {
  return Math.ceil((distanceKm / speedKmh) * 60);
};

/**
 * Estimate ETA from current location to destination
 * 
 * @param currentLat - Current latitude
 * @param currentLng - Current longitude
 * @param destLat - Destination latitude
 * @param destLng - Destination longitude
 * @param speedKmh - Average speed (default: AVERAGE_CITY_SPEED_KMH)
 * @returns Estimated time in minutes
 */
export const estimateETA = (
  currentLat: number,
  currentLng: number,
  destLat: number,
  destLng: number,
  speedKmh: number = AVERAGE_CITY_SPEED_KMH
): number => {
  const distanceKm = calculateDistance(currentLat, currentLng, destLat, destLng);
  return estimateTravelTime(distanceKm, speedKmh);
};

/**
 * Validate location coordinates
 * 
 * @param location - Location to validate
 * @returns true if valid
 */
export const isValidLocation = (location: Location): boolean => {
  return (
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
};

/**
 * Validate location with error message
 */
export const validateLocation = (location: Location): { valid: boolean; error?: string } => {
  if (!location) {
    return { valid: false, error: 'Location is required' };
  }

  if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return { valid: false, error: 'Location must have numeric latitude and longitude' };
  }

  if (location.latitude < -90 || location.latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (location.longitude < -180 || location.longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  return { valid: true };
};

/**
 * Round location coordinates to specific decimal places
 * Useful for reducing precision in logs or UI display
 * 
 * @param location - Location to round
 * @param decimals - Number of decimal places (default: 6)
 * @returns Rounded location
 */
export const roundLocation = (location: Location, decimals: number = 6): Location => {
  const factor = Math.pow(10, decimals);
  return {
    latitude: Math.round(location.latitude * factor) / factor,
    longitude: Math.round(location.longitude * factor) / factor,
  };
};

/**
 * Format distance for display
 * 
   @param distanceKm - Distance in kilometers
 * @returns Formatted distance string
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

/**
 * Format time duration for display
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted time string
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${Math.round(mins)}min`;
};

/**
 * Calculate bearing (direction) between two points
 * 
 * @param lat1 - First point latitude
 * @param lon1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lon2 - Second point longitude
 * @returns Bearing in degrees (0-360)
 */
export const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  let bearing = Math.atan2(y, x);
  bearing = (bearing * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  return bearing;
};

/**
 * Encode location as query string (for URLs)
 */
export const encodeLocation = (location: Location): string => {
  return `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
};

/**
 * Decode location from query string
 */
export const decodeLocation = (encoded: string): Location | null => {
  try {
    const [latStr, lngStr] = encoded.split(',');
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);

    if (isValidLocation({ latitude, longitude })) {
      return { latitude, longitude };
    }
  } catch (error) {
    console.error('[Helper] Error decoding location:', error);
  }

  return null;
};
