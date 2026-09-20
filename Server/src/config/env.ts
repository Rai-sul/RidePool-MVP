import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  mvpMode: process.env.MVP_MODE === 'true' || process.env.SKIP_REDIS === 'true',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  h3: {
    resolutionPickup: parseInt(process.env.H3_RESOLUTION_PICKUP || '9', 10),
    resolutionDestination: parseInt(process.env.H3_RESOLUTION_DESTINATION || '7', 10),
    resolutionDriver: parseInt(process.env.H3_RESOLUTION_DRIVER || '8', 10),
    searchRadius: parseInt(process.env.H3_SEARCH_RADIUS || '2', 10), // Default for destination (res 7: 2 rings × 2.4km ≈ 4.8km)
    searchRadiusPickup: parseInt(process.env.H3_SEARCH_RADIUS_PICKUP || '6', 10), // For pickup (res 9: 6 rings × 0.35km ≈ 2.1km)
    searchRadiusDestination: parseInt(process.env.H3_SEARCH_RADIUS_DESTINATION || '2', 10), // For destination (res 7: 2 rings × 2.4km ≈ 4.8km)
  },
  advanceBooking: {
    // Every advance-booking window is expressed in "units". Production uses
    // real minutes; set ADVANCE_TIME_UNIT=seconds to compress them for dev/QA
    // so a 30-minute window becomes 30 seconds.
    unitSeconds: process.env.ADVANCE_TIME_UNIT === 'seconds' ? 1 : 60,
    // Max spread between the earliest and latest pickup time inside one pool.
    poolWindowUnits: parseInt(process.env.ADVANCE_POOL_WINDOW || '30', 10),
    // How far before the earliest pickup the confirmation step opens.
    confirmLeadUnits: parseInt(process.env.ADVANCE_CONFIRM_LEAD || '10', 10),
    // How long riders get to confirm once it opens. The remainder of the lead
    // is the runway for driver search and instant backfill.
    confirmWindowUnits: parseInt(process.env.ADVANCE_CONFIRM_WINDOW || '5', 10),
    // Furthest ahead a rider may schedule a pickup.
    maxLeadDays: parseInt(process.env.ADVANCE_MAX_LEAD_DAYS || '7', 10),
    // Dispatch a pool that ends up with a single confirmed rider. Off by default.
    soloFallback: process.env.ADVANCE_SOLO_FALLBACK === 'true',
  },
  cache: {
    memoryMaxSize: parseInt(process.env.MEMORY_CACHE_MAX_SIZE || '1000', 10),
    memoryTTL: parseInt(process.env.MEMORY_CACHE_TTL || '300', 10),
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisKeyPrefix: process.env.REDIS_KEY_PREFIX || 'ridepool:',
    redisDefaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '300', 10),
  },
};