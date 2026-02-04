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
  cache: {
    memoryMaxSize: parseInt(process.env.MEMORY_CACHE_MAX_SIZE || '1000', 10),
    memoryTTL: parseInt(process.env.MEMORY_CACHE_TTL || '300', 10),
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisKeyPrefix: process.env.REDIS_KEY_PREFIX || 'ridepool:',
    redisDefaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '300', 10),
  },
};