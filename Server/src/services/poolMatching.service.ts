import {
  Location,
  Ride,
  Pool,
  PoolMember,
  H3MatchingResult,
  DriverSearchResult,
  VehicleLocation,
  VehicleType,
  GenderPreference,
  RideStatus,
  PoolStatus,
  AlternativeSuggestion,
  PoolSearchAnalytics,
  PoolSearchMetadata,
} from "../types";
import { calculateDistance, AVERAGE_CITY_SPEED_KMH } from "../utils/helper";
import { h3Utils } from "../utils/h3.utils";
import { CONSTANTS } from "../config/constants";
import { supabase } from "../config/supabase";
import { SEARCH_TIMING } from "./lookupTime.service";
import { config } from "../config/env";
import { googleMapsService } from "./googleMaps.service";
import { poolSearchResponseService } from "./poolSearchResponse.service";
import { routeOverlapService, UserRoute, Coordinate } from "./routeOverlap.service";

// ============================================
// ENHANCED MATCHING TYPES
// ============================================

export interface ScoredMatchingResult extends H3MatchingResult {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  routeOverlapPercentage: number;
  // Pool pickup location (where the pool's creator/driver is located)
  poolPickupLocation?: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  // Distance from user's pickup to pool's current location
  distanceToPoolKm?: number;
  // Estimated time (in minutes) for driver to detour from pool pickup to user's pickup
  pickupDetourMinutes?: number;
  // Estimated detour time in minutes (calculated from destination detour distance)
  estimatedDetourMinutes?: number;
  // Google Maps enriched data (optional, only for top matches)
  exactDistance?: number; // Exact distance in km from Google Maps
  exactETA?: number; // Exact ETA in minutes from Google Maps
  routeGeometry?: {
    encoded: string; // Encoded polyline for map display
    coordinates: Array<{ lat: number; lng: number }>; // Decoded coordinates
  };
  routeSteps?: Array<{
    distance: number; // km
    duration: number; // minutes
    instruction: string;
  }>;
}

export interface ScoreBreakdown {
  distanceScore: number;
  routeOverlapScore: number;
  hexagonScore: number;
  exactMatchBonus: number;
  destinationProximityScore: number;
  totalScore: number;
}

export interface ScoreWeights {
  distance: number;
  routeOverlap: number;
  commonHexagons: number;
  exactPickupBonus: number;
  exactDestinationBonus: number;
  destinationProximity: number;
}

export interface CompatibilityCheckResult {
  compatible: boolean;
  score?: number;
  reason?: string;
  details?: CompatibilityDetails;
}

export interface CompatibilityDetails {
  pickupDistance: number;
  destinationDistance: number;
  routeOverlapPercentage: number;
  commonHexagonsCount: number;
  pickupHexMatch: boolean;
  destinationHexMatch: boolean;
}

export interface EnhancedPoolSearchResponse {
  matches: ScoredMatchingResult[];
  alternatives: AlternativeSuggestion[];
  analytics: PoolSearchAnalytics;
  metadata: PoolSearchMetadata;
  hasMatches: boolean;
  totalPoolsFound: number;
}

// ============================================
// POOL MATCHING SERVICE
// ============================================

export class PoolMatchingService {
  // Configurable scoring weights (total should be 100)
  private readonly scoreWeights: ScoreWeights = {
    distance: 25, // Max 25 points for pickup proximity
    routeOverlap: 35, // Max 35 points for route overlap
    commonHexagons: 20, // Max 20 points for shared hexagons
    exactPickupBonus: 5, // Bonus 5 points for exact pickup match
    exactDestinationBonus: 5, // Bonus 5 points for exact destination match
    destinationProximity: 10, // Max 10 points for destination closeness
  };

  // Minimum score threshold for a pool to be considered
  private readonly MINIMUM_MATCH_SCORE = 30;

  /**
   * Find matching pools for a ride using H3 hexagon indexing with intelligent scoring
   *
   * @param ride - The ride request with pickup and destination
   * @param userId - ID of the user requesting the ride
   * @returns Array of pools with match scores, sorted by viability
   */
  async findMatchingPools(
    ride: Ride,
    userId: string
  ): Promise<ScoredMatchingResult[]> {
    try {
      // Step 1: Extract locations from ride
      const pickup: Location = {
        latitude: ride.pickup_lat,
        longitude: ride.pickup_lng,
      };
      const destination: Location = {
        latitude: ride.dropoff_lat,
        longitude: ride.dropoff_lng,
      };

      // Step 2: Generate H3 indices for rider's locations
      const pickupH3 = h3Utils.latLngToH3(pickup, 9); // Resolution 9 for precise pickup
      const destinationH3 = h3Utils.latLngToH3(destination, 7); // Resolution 7 for destination

      // Step 3: Get search area hexagons around pickup (H3 ring search)
      // Pickup: Resolution 9 with ring 6 ≈ 2.1 km radius
      const pickupSearchHexagons = h3Utils.getH3Ring(
        pickupH3,
        config.h3.searchRadiusPickup
      );

      // Step 4: Get search area hexagons around destination
      // Destination: Resolution 7 with ring 2 ≈ 4.8 km radius
      const destinationSearchHexagons = h3Utils.getH3Ring(
        destinationH3,
        config.h3.searchRadiusDestination
      );

      // Step 5: Query database for potential pools
      // Note: We filter current_passengers < max_passengers in code since Supabase doesn't support column-to-column comparison
      // Note: We use .or() for driver_id because .neq() excludes NULL values
      // Note: We filter by destination H3 but allow for extended search via client-side check if extended_search_h3 is present
      const { data: rawPools, error } = (await supabase
        .from("pools")
        .select("*")
        .eq("vehicle_type", ride.vehicle_type)
        .in("status", [
          "WAITING_FOR_RIDERS",
          "WAITING_FOR_DRIVER",
        ] as PoolStatus[])
        // Initially query mostly by destination H3 - we'll handle expanded logic below
        .or(`destination_h3_index.in.(${destinationSearchHexagons.join(',')}),score_breakdown->extended_search_h3.cs.[${JSON.stringify(destinationH3)}]`)
        .neq("creator_user_id", userId)
        .or(`driver_id.is.null,driver_id.neq.${userId}`)
        .gt("current_passengers", 0)) as any;

      if (error) {
        console.error("[PoolMatching] Database query error:", error);
        throw error;
      }

      // Filter pools where current_passengers < max_passengers (can't do column comparison in Supabase)
      let pools = rawPools?.filter((pool: any) => pool.current_passengers < pool.max_passengers) || [];

      // Filter out pools whose search time has expired (still in WAITING_FOR_RIDERS but older than lookup time)
      // This ensures users don't see stale pools where the creator hasn't acted yet
      const TOTAL_SEARCH_MS = SEARCH_TIMING.TOTAL_SECONDS * 1000; // 40 seconds
      const now = Date.now();
      pools = pools.filter((pool: any) => {
        // Only filter WAITING_FOR_RIDERS pools - WAITING_FOR_DRIVER pools are valid
        if (pool.status !== 'WAITING_FOR_RIDERS') {
          return true;
        }
        // Check if pool search time has expired
        const poolCreatedAt = new Date(pool.created_at).getTime();
        const poolAge = now - poolCreatedAt;
        // Only show pools that are still within their lookup time window
        return poolAge < TOTAL_SEARCH_MS;
      });

      // Filter pools by pickup H3 - pools should have similar pickup location
      // The pickup H3 is stored in score_breakdown.creator_pickup.h3_index
      // Also check if pool has extended_pickup_h3 (from extended search phase)
      let pickupFilteredPools = pools.filter((pool: any) => {
        const poolPickupH3 = pool.score_breakdown?.creator_pickup?.h3_index;
        const extendedPickupH3 = pool.score_breakdown?.extended_pickup_h3 || [];
        
        if (!poolPickupH3) {
          return false;
        }
        
        // Match if: rider's pickup is in pool's pickup area OR pool's extended pickup area includes rider's pickup
        return pickupSearchHexagons.includes(poolPickupH3) || extendedPickupH3.includes(pickupH3);
      });

      // If no pools found, expand search to adjacent hexagons (larger ring)
      if (pickupFilteredPools.length === 0 && pools.length > 0) {
        console.log("[PoolMatching] No pools in pickup area, expanding to adjacent hexagons...");
        const expandedPickupHexagons = h3Utils.getH3Ring(pickupH3, config.h3.searchRadiusPickup + 2);
        
        pickupFilteredPools = pools.filter((pool: any) => {
          const poolPickupH3 = pool.score_breakdown?.creator_pickup?.h3_index;
          const extendedPickupH3 = pool.score_breakdown?.extended_pickup_h3 || [];
          
          if (!poolPickupH3) {
            return false;
          }
          return expandedPickupHexagons.includes(poolPickupH3) || extendedPickupH3.includes(pickupH3);
        });
      }

      pools = pickupFilteredPools;

      // Step 6: Return empty if no pools found
      if (!pools || pools.length === 0) {
        console.log("[PoolMatching] No pools found matching pickup and destination");
        return [];
      }

      console.log(
        `[PoolMatching] Found ${pools.length} potential pools, evaluating...`
      );

      // Step 7: Score and filter each pool
      const matches: ScoredMatchingResult[] = [];

      for (const pool of pools) {
        // Create location objects from pool data
        const poolDestination: Location = {
          latitude: pool.destination_lat,
          longitude: pool.destination_lng,
        };

        // Check gender restriction compatibility
        // 1. FEMALE_ONLY pool can only be joined by FEMALE_ONLY users
        // 2. FEMALE_ONLY users should only see FEMALE_ONLY pools (they want female-only environment)
        if (
          pool.gender_restriction === "FEMALE_ONLY" &&
          ride.gender_restriction !== "FEMALE_ONLY"
        ) {
          continue;
        }
        if (
          ride.gender_restriction === "FEMALE_ONLY" &&
          pool.gender_restriction !== "FEMALE_ONLY"
        ) {
          continue;
        }

        // Calculate destination distance
        const destinationDistance = calculateDistance(
          destination.latitude,
          destination.longitude,
          poolDestination.latitude,
          poolDestination.longitude
        );

        // Calculate route overlap using H3 hexagons
        const ridePickupH3 = h3Utils.latLngToH3(pickup, 9);
        const rideDestinationH3 = h3Utils.latLngToH3(destination, 7);

        // Get hexagon rings for route overlap calculation
        const pickupRing = h3Utils.getH3Ring(ridePickupH3, 2);
        const destinationRing = h3Utils.getH3Ring(rideDestinationH3, 2);

        // Check if destination hexagon matches within acceptable range
        // Also check if pool has extended search enabled and covers our destination
        const poolDestinationH3 = pool.destination_h3_index;
        const extendedSearchH3 = pool.score_breakdown?.extended_search_h3 || [];
        
        const isDestinationCompatible =
          destinationRing.includes(poolDestinationH3) || 
          extendedSearchH3.includes(rideDestinationH3);

        // Skip if incompatible destination
        if (!isDestinationCompatible) {
          continue;
        }

        // Calculate route overlap percentage
        const routeOverlap = this.calculateRouteOverlapPercentage(
          pickup,
          destination,
          poolDestination
        );

        // Skip if no route overlap
        if (routeOverlap <= 0) {
          continue;
        }

        // Check hexagon matches (pools don't have pickup_h3_index, so only check destination)
        const pickupHexMatch = false; // Pools are destination-based, no pickup H3 stored
        const destinationHexMatch = destinationH3 === poolDestinationH3;

        // Calculate comprehensive match score
        // Use destination distance for scoring since pools don't have pickup info
        const scoreResult = this.calculatePoolScore({
          pickupDistance: 0, // Not applicable for destination-based pools
          destinationDistance,
          routeOverlapPercentage: routeOverlap,
          pickupHexMatch,
          destinationHexMatch,
          currentPassengers: pool.current_passengers,
          maxPassengers: pool.max_passengers,
          maxPickupDistance: CONSTANTS.PICKUP_RANGE_KM,
          maxDestinationDistance: CONSTANTS.DESTINATION_RANGE_KM || 5,
        });

        // Only include pools that meet minimum score threshold
        if (scoreResult.totalScore >= this.MINIMUM_MATCH_SCORE) {
          // Calculate estimated detour time based on average city speed
          const estimatedDetourMinutes = Math.round(
            (Math.abs(destinationDistance) / AVERAGE_CITY_SPEED_KMH) * 60
          );

          matches.push({
            poolId: pool.id,
            h3Distance: h3Utils.getH3Distance(destinationH3, poolDestinationH3),
            destinationHexMatch,
            commonHexagons: destinationRing.filter(
              (h) => h === poolDestinationH3
            ),
            viabilityScore: pool.viability_score || scoreResult.totalScore,
            estimatedDetour: Math.abs(destinationDistance),
            estimatedDetourMinutes,
            score: scoreResult.totalScore,
            scoreBreakdown: scoreResult,
            routeOverlapPercentage: Math.round(routeOverlap * 100),
          });
        }
      }

      console.log(
        `[PoolMatching] ${matches.length} pools passed scoring threshold`
      );

      // Step 8: Sort by score (highest first), then by distance
      const sortedMatches = matches.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score; // Higher score first
        }
        return a.estimatedDetour - b.estimatedDetour; // If equal score, lower detour first
      });

      // ============================================
      // PASS 3: Google Maps API (Precise Distance)
      // ============================================
      // Purpose: Get exact distance/ETA for top matches only
      // Speed: ~1 second for 10 calls
      // Cost: $0.05 per search (10 calls × $0.005)
      //
      // Only enrich top matches with Google Maps data if service is available
      if (googleMapsService.isAvailable() && sortedMatches.length > 0) {
        const topMatches = sortedMatches.slice(0, 10); // Top 10 only to minimize API calls

        // Enrich top matches with Google Maps route data
        await Promise.all(
          topMatches.map(async (match) => {
            try {
              // Get pool details for destination coordinates
              const pool = await this.getPoolById(match.poolId);
              if (!pool) {
                return; // Skip if pool not found
              }

              // Get route from user pickup to user destination
              // This shows the actual route the user will take
              const route = await googleMapsService.getRoute(
                pickup,
                destination
              );

              if (route) {
                // Enrich match with precise Google Maps data
                match.exactDistance = route.distance; // km
                match.exactETA = route.duration; // minutes
                match.routeGeometry = route.geometry; // For map display
                if (route.steps) {
                  match.routeSteps = route.steps.map((step) => ({
                    distance: step.distance,
                    duration: step.duration,
                    instruction: step.instruction,
                  }));
                }
              }
            } catch (error) {
              console.error(
                `[PoolMatching] Error getting Google Maps route for pool ${match.poolId}:`,
                error
              );
              // Fallback: Keep H3-based estimates if Google Maps fails
              // Match will still have estimatedDetour from Pass 2
            }
          })
        );
      }

      return sortedMatches;
    } catch (error) {
      console.error("[PoolMatching] Error finding matching pools:", error);
      return [];
    }
  }

  /**
   * Enhanced pool search with alternatives when no matches found
   * 
   * @param ride - The ride request with pickup and destination
   * @param userId - ID of the user requesting the ride
   * @returns Enhanced response with matches and alternatives
   */
  async findMatchingPoolsEnhanced(
    ride: Ride,
    userId: string
  ): Promise<EnhancedPoolSearchResponse> {
    try {
      const incompatibleReasons: Record<string, number> = {
        'pickup_too_far': 0,
        'gender_restriction': 0,
        'destination_incompatible': 0,
        'no_route_overlap': 0,
        'pool_full': 0,
        'vehicle_type_mismatch': 0,
        'score_too_low': 0,
      };

      // Step 1: Extract locations from ride
      const pickup: Location = {
        latitude: ride.pickup_lat,
        longitude: ride.pickup_lng,
      };
      const destination: Location = {
        latitude: ride.dropoff_lat,
        longitude: ride.dropoff_lng,
      };

      // Step 2: Generate H3 indices for rider's locations
      const pickupH3 = h3Utils.latLngToH3(pickup, 9);
      const destinationH3 = h3Utils.latLngToH3(destination, 7);

      // Step 3: Get search area hexagons
      // Pickup: Resolution 9 with ring 6 ≈ 2.1 km radius
      const pickupSearchHexagons = h3Utils.getH3Ring(pickupH3, config.h3.searchRadiusPickup);
      // Destination: Resolution 7 with ring 2 ≈ 4.8 km radius
      const destinationSearchHexagons = h3Utils.getH3Ring(destinationH3, config.h3.searchRadiusDestination);

      console.log("[PoolMatching] Search params:", {
        userId,
        vehicleType: ride.vehicle_type,
        genderRestriction: ride.gender_restriction,
        pickupH3,
        destinationH3,
        destinationSearchHexagonsCount: destinationSearchHexagons.length,
        destinationSearchHexagons: destinationSearchHexagons.slice(0, 5), // First 5 for brevity
      });

      // Step 4: Query database for potential pools
      // Note: We filter current_passengers < max_passengers in code since Supabase doesn't support column-to-column comparison
      // Note: We use .or() for driver_id because .neq() excludes NULL values
      // Note: We use OR logic for destination - either in standard search hexagons OR in the pool's extended search list
      const { data: rawPools, error } = (await supabase
        .from("pools")
        .select("*")
        .eq("vehicle_type", ride.vehicle_type)
        .in("status", ["WAITING_FOR_RIDERS", "WAITING_FOR_DRIVER"] as PoolStatus[])
        // Allow matching if pool's destination is in our search ring OR if our destination is in pool's extended search
        .or(`destination_h3_index.in.(${destinationSearchHexagons.join(',')}),score_breakdown->extended_search_h3.cs.[${JSON.stringify(destinationH3)}]`)
        .neq("creator_user_id", userId)
        .or(`driver_id.is.null,driver_id.neq.${userId}`)
        .gt("current_passengers", 0)) as any;

      if (error) {
        console.error("[PoolMatching] Database query error:", error);
        throw error;
      }

      console.log("[PoolMatching] Raw pools from DB:", {
        count: rawPools?.length || 0,
        pools: rawPools?.map((p: any) => ({
          id: p.id,
          destination_h3_index: p.destination_h3_index,
          current_passengers: p.current_passengers,
          max_passengers: p.max_passengers,
          gender_restriction: p.gender_restriction,
          status: p.status,
          creator_user_id: p.creator_user_id,
        })),
      });

      // Filter pools where current_passengers < max_passengers (can't do column comparison in Supabase)
      let pools = rawPools?.filter((pool: any) => pool.current_passengers < pool.max_passengers) || [];

      // Filter out pools whose search time has expired (still in WAITING_FOR_RIDERS but older than lookup time)
      // This ensures users don't see stale pools where the creator hasn't acted yet
      const TOTAL_SEARCH_MS = SEARCH_TIMING.TOTAL_SECONDS * 1000; // 40 seconds
      const now = Date.now();
      pools = pools.filter((pool: any) => {
        // Only filter WAITING_FOR_RIDERS pools - WAITING_FOR_DRIVER pools are valid
        if (pool.status !== 'WAITING_FOR_RIDERS') {
          return true;
        }
        // Check if pool search time has expired
        const poolCreatedAt = new Date(pool.created_at).getTime();
        const poolAge = now - poolCreatedAt;
        // Only show pools that are still within their lookup time window
        return poolAge < TOTAL_SEARCH_MS;
      });

      // Filter pools by pickup H3 - pools should have similar pickup location
      // The pickup H3 is stored in score_breakdown.creator_pickup.h3_index
      // Also check if pool has extended_pickup_h3 (from extended search phase)
      let pickupFilteredPools = pools.filter((pool: any) => {
        const poolPickupH3 = pool.score_breakdown?.creator_pickup?.h3_index;
        const extendedPickupH3 = pool.score_breakdown?.extended_pickup_h3 || [];
        
        if (!poolPickupH3) {
          return false;
        }
        
        // Match if: rider's pickup is in pool's pickup area OR pool's extended pickup area includes rider's pickup
        return pickupSearchHexagons.includes(poolPickupH3) || extendedPickupH3.includes(pickupH3);
      });

      // If no pools found, expand search to adjacent hexagons (larger ring)
      if (pickupFilteredPools.length === 0 && pools.length > 0) {
        console.log("[PoolMatching] No pools in pickup area, expanding to adjacent hexagons...");
        const expandedPickupHexagons = h3Utils.getH3Ring(pickupH3, config.h3.searchRadiusPickup + 2); // Expand by 2 more rings
        
        pickupFilteredPools = pools.filter((pool: any) => {
          const poolPickupH3 = pool.score_breakdown?.creator_pickup?.h3_index;
          const extendedPickupH3 = pool.score_breakdown?.extended_pickup_h3 || [];
          
          if (!poolPickupH3) {
            return false;
          }
          return expandedPickupHexagons.includes(poolPickupH3) || extendedPickupH3.includes(pickupH3);
        });
        console.log("[PoolMatching] After expanded pickup search:", { count: pickupFilteredPools.length });
      }

      pools = pickupFilteredPools;
      const totalPoolsChecked = pools?.length || 0;

      console.log("[PoolMatching] After capacity and pickup filter:", { count: pools.length });

      // Step 5: Handle no pools found scenario
      if (!pools || pools.length === 0) {
        console.log("[PoolMatching] No pools found - generating alternatives");

        // Find nearby incompatible pools for suggestions
        const nearbyPools = await poolSearchResponseService.findNearbyIncompatiblePools(ride, 5);

        // Build analytics
        const analytics = poolSearchResponseService.generateAnalytics(
          0,
          { 'no_pools_in_area': 1 },
          config.h3.searchRadiusDestination
        );

        // Build metadata
        const metadata = await poolSearchResponseService.buildSearchMetadata(ride, nearbyPools);

        // Generate alternative suggestions
        const alternatives = await poolSearchResponseService.generateAlternatives(
          ride,
          analytics,
          metadata
        );

        return {
          matches: [],
          alternatives,
          analytics,
          metadata,
          hasMatches: false,
          totalPoolsFound: 0,
        };
      }

      console.log(`[PoolMatching] Found ${pools.length} potential pools, evaluating...`);

      // Step 6: Score and filter each pool (with incompatibility tracking)
      const matches: ScoredMatchingResult[] = [];

      for (const pool of pools) {
        const poolDestination: Location = {
          latitude: pool.destination_lat,
          longitude: pool.destination_lng,
        };

        // Check gender restriction compatibility
        // 1. FEMALE_ONLY pool can only be joined by FEMALE_ONLY users
        // 2. FEMALE_ONLY users should only see FEMALE_ONLY pools (they want female-only environment)
        if (pool.gender_restriction === "FEMALE_ONLY" && ride.gender_restriction !== "FEMALE_ONLY") {
          incompatibleReasons['gender_restriction']++;
          continue;
        }
        if (ride.gender_restriction === "FEMALE_ONLY" && pool.gender_restriction !== "FEMALE_ONLY") {
          incompatibleReasons['gender_restriction']++;
          continue;
        }

        // Check pool capacity
        if (pool.current_passengers >= pool.max_passengers) {
          incompatibleReasons['pool_full']++;
          continue;
        }

        // Calculate destination distance
        const destinationDistance = calculateDistance(
          destination.latitude,
          destination.longitude,
          poolDestination.latitude,
          poolDestination.longitude
        );

        // Check destination compatibility
        // Also check if pool has extended search enabled and covers our destination
        const ridePickupH3 = h3Utils.latLngToH3(pickup, 9);
        const rideDestinationH3 = h3Utils.latLngToH3(destination, 7);
        const destinationRing = h3Utils.getH3Ring(rideDestinationH3, 2);
        const poolDestinationH3 = pool.destination_h3_index;
        const extendedSearchH3 = pool.score_breakdown?.extended_search_h3 || [];

        if (!destinationRing.includes(poolDestinationH3) && !extendedSearchH3.includes(rideDestinationH3)) {
          incompatibleReasons['destination_incompatible']++;
          continue;
        }

        // Calculate route overlap
        const routeOverlap = this.calculateRouteOverlapPercentage(pickup, destination, poolDestination);

        if (routeOverlap <= 0) {
          incompatibleReasons['no_route_overlap']++;
          continue;
        }

        // Calculate score (pools don't have pickup_h3_index, so only check destination)
        const pickupHexMatch = false; // Pools are destination-based, no pickup H3 stored
        const destinationHexMatch = destinationH3 === poolDestinationH3;

        const scoreResult = this.calculatePoolScore({
          pickupDistance: 0, // Not applicable for destination-based pools
          destinationDistance,
          routeOverlapPercentage: routeOverlap,
          pickupHexMatch,
          destinationHexMatch,
          currentPassengers: pool.current_passengers,
          maxPassengers: pool.max_passengers,
          maxPickupDistance: CONSTANTS.PICKUP_RANGE_KM,
          maxDestinationDistance: CONSTANTS.DESTINATION_RANGE_KM || 5,
        });

        if (scoreResult.totalScore < this.MINIMUM_MATCH_SCORE) {
          incompatibleReasons['score_too_low']++;
          continue;
        }

        // Get pool pickup location from score_breakdown (creator's pickup)
        const poolPickupInfo = pool.score_breakdown?.creator_pickup;
        let poolPickupLocation: { lat: number; lng: number; address?: string; name?: string } | undefined;
        let distanceToPoolKm: number | undefined;
        let pickupDetourMinutes: number | undefined;

        if (poolPickupInfo?.lat && poolPickupInfo?.lng) {
          poolPickupLocation = {
            lat: poolPickupInfo.lat,
            lng: poolPickupInfo.lng,
            address: poolPickupInfo.address,
            name: poolPickupInfo.name,
          };
          // Calculate distance from user's pickup to pool's current location
          distanceToPoolKm = calculateDistance(
            pickup.latitude,
            pickup.longitude,
            poolPickupInfo.lat,
            poolPickupInfo.lng
          );
          // Calculate estimated time for driver to detour from pool pickup to user's pickup
          pickupDetourMinutes = Math.round((distanceToPoolKm / AVERAGE_CITY_SPEED_KMH) * 60);
        }

        // Calculate estimated destination detour time
        const estimatedDetourMinutes = Math.round(
          (Math.abs(destinationDistance) / AVERAGE_CITY_SPEED_KMH) * 60
        );

        matches.push({
          poolId: pool.id,
          h3Distance: h3Utils.getH3Distance(destinationH3, poolDestinationH3),
          destinationHexMatch,
          commonHexagons: destinationRing.filter((h) => h === poolDestinationH3),
          viabilityScore: pool.viability_score || scoreResult.totalScore,
          estimatedDetour: Math.abs(destinationDistance),
          estimatedDetourMinutes,
          pickupDetourMinutes,
          score: scoreResult.totalScore,
          scoreBreakdown: scoreResult,
          routeOverlapPercentage: Math.round(routeOverlap * 100),
          poolPickupLocation,
          distanceToPoolKm,
        });
      }

      // Step 7: Sort matches
      const sortedMatches = matches.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.estimatedDetour - b.estimatedDetour;
      });

      // Step 8: Build response
      const nearbyPools = sortedMatches.length === 0 
        ? await poolSearchResponseService.findNearbyIncompatiblePools(ride, 5)
        : [];

      const analytics = poolSearchResponseService.generateAnalytics(
        totalPoolsChecked,
        incompatibleReasons,
        config.h3.searchRadiusDestination
      );

      const metadata = await poolSearchResponseService.buildSearchMetadata(ride, nearbyPools);

      const alternatives = sortedMatches.length === 0
        ? await poolSearchResponseService.generateAlternatives(ride, analytics, metadata)
        : [];

      console.log(
        `[PoolMatching] Enhanced search complete: ${sortedMatches.length} matches, ${alternatives.length} alternatives`
      );

      return {
        matches: sortedMatches,
        alternatives,
        analytics,
        metadata,
        hasMatches: sortedMatches.length > 0,
        totalPoolsFound: sortedMatches.length,
      };
    } catch (error) {
      console.error("[PoolMatching] Error in enhanced pool search:", error);
      
      // Return safe fallback response
      return {
        matches: [],
        alternatives: [{
          action: 'CREATE_POOL',
          title: 'Create Your Own Pool',
          description: 'Start a new pool and wait for others to join',
          icon: 'plus-circle',
          priority: 1,
        }],
        analytics: {
          totalPoolsChecked: 0,
          destinationHexagonsSearched: 0,
          pickupHexagonsSearched: 0,
          incompatibleReasons: { error: 1 },
          searchRadius: config.h3.searchRadiusDestination,
        },
        metadata: {
          hasNearbyPools: false,
          peakHours: [
            { start: '07:00', end: '09:00' },
            { start: '17:00', end: '19:00' },
          ],
          estimatedWaitTime: 30,
        },
        hasMatches: false,
        totalPoolsFound: 0,
      };
    }
  }

  /**
   * Find available drivers within a pickup area using H3 hexagon search
   *
   * @param pickup - Pickup location
   * @param searchRadius - H3 ring radius for search
   * @returns Array of drivers with location and availability info
   */
  async findNearbyDrivers(
    pickup: Location,
    searchRadius: number = config.h3.searchRadiusPickup
  ): Promise<DriverSearchResult[]> {
    try {
      const pickupH3_res9 = h3Utils.latLngToH3(pickup, 9);
      const pickupH3_res8 = h3Utils.latLngToH3(pickup, 8);

      const searchHexagons_res9 = h3Utils.getH3Ring(
        pickupH3_res9,
        config.h3.searchRadiusPickup
      );
      const searchHexagons_res8 = h3Utils.getH3Ring(
        pickupH3_res8,
        config.h3.searchRadiusPickup
      );

      const { data: vehicleLocations, error } = (await supabase
        .from("vehicle_locations")
        .select("*, vehicles(*), users(*)")
        .or(
          `h3_index_res9.in.(${searchHexagons_res9.join(
            ","
          )}),h3_index_res8.in.(${searchHexagons_res8.join(",")})`
        )
        .eq("is_active", true)
        .eq("is_available", true)
        .order("recorded_at", { ascending: false })) as any;

      if (error) {
        console.error("[PoolMatching] Error fetching nearby drivers:", error);
        throw error;
      }

      if (!vehicleLocations || vehicleLocations.length === 0) {
        return [];
      }

      // Convert to driver search results
      return vehicleLocations.map((vl: VehicleLocation) => ({
        driverId: vl.driver_id,
        vehicleId: vl.vehicle_id,
        lat: vl.lat,
        lng: vl.lng,
        h3_index_res9: vl.h3_index_res9 || "",
        distanceToPickup: calculateDistance(
          pickup.latitude,
          pickup.longitude,
          vl.lat,
          vl.lng
        ),
        estimatedArrivalMinutes: this.estimateArrivalTime(
          vl.lat,
          vl.lng,
          pickup.latitude,
          pickup.longitude,
          vl.speed_kmh || 30
        ),
        isAvailable: vl.is_available,
      }));
    } catch (error) {
      console.error("[PoolMatching] Error finding nearby drivers:", error);
      return [];
    }
  }

  /**
   * Check if a ride can join a specific pool with detailed compatibility analysis
   *
   * @param ride - The ride request to check
   * @param pool - The pool to check compatibility with
   * @param minScore - Minimum compatibility score required
   * @returns Compatibility result with detailed breakdown
   */
  isRideCompatibleWithPool(
    ride: Ride,
    pool: Pool,
    minScore: number = 30
  ): CompatibilityCheckResult {
    const ridePickup: Location = {
      latitude: ride.pickup_lat,
      longitude: ride.pickup_lng,
    };
    const rideDestination: Location = {
      latitude: ride.dropoff_lat,
      longitude: ride.dropoff_lng,
    };
    const poolDestination: Location = {
      latitude: pool.destination_lat,
      longitude: pool.destination_lng,
    };

    // Check 1: Destination distance (pools are destination-based)
    const destinationDistance = calculateDistance(
      rideDestination.latitude,
      rideDestination.longitude,
      poolDestination.latitude,
      poolDestination.longitude
    );

    if (destinationDistance > (CONSTANTS.DESTINATION_RANGE_KM || 5)) {
      return {
        compatible: false,
        reason: `Destination too far: ${destinationDistance.toFixed(2)}km (max: ${
          CONSTANTS.DESTINATION_RANGE_KM || 5
        }km)`,
        details: {
          pickupDistance: 0,
          destinationDistance,
          routeOverlapPercentage: 0,
          commonHexagonsCount: 0,
          pickupHexMatch: false,
          destinationHexMatch: false,
        },
      };
    }

    // Check 2: Gender restriction compatibility
    // 1. FEMALE_ONLY pool can only be joined by FEMALE_ONLY users
    // 2. FEMALE_ONLY users should only see FEMALE_ONLY pools
    if (
      pool.gender_restriction === "FEMALE_ONLY" &&
      ride.gender_restriction !== "FEMALE_ONLY"
    ) {
      return {
        compatible: false,
        reason: "Pool has female-only restriction",
      };
    }
    if (
      ride.gender_restriction === "FEMALE_ONLY" &&
      pool.gender_restriction !== "FEMALE_ONLY"
    ) {
      return {
        compatible: false,
        reason: "User requires female-only pool",
      };
    }

    // Check 3: Vehicle type match
    if (ride.vehicle_type !== pool.vehicle_type) {
      return {
        compatible: false,
        reason: `Vehicle type mismatch: ${ride.vehicle_type} vs ${pool.vehicle_type}`,
      };
    }

    // Check 4: Pool capacity
    if (pool.current_passengers >= pool.max_passengers) {
      return {
        compatible: false,
        reason: `Pool at capacity: ${pool.current_passengers}/${pool.max_passengers}`,
      };
    }

    // Check 5: Route overlap
    const routeOverlap = this.calculateRouteOverlapPercentage(
      ridePickup,
      rideDestination,
      poolDestination
    );

    if (routeOverlap <= 0) {
      return {
        compatible: false,
        reason: "No route overlap detected",
        details: {
          pickupDistance: 0,
          destinationDistance,
          routeOverlapPercentage: 0,
          commonHexagonsCount: 0,
          pickupHexMatch: false,
          destinationHexMatch: false,
        },
      };
    }

    // Check 6: H3 hexagon matching (pools don't have pickup H3, only destination)
    const ridePickupH3 = h3Utils.latLngToH3(ridePickup, 9);
    const rideDestinationH3 = h3Utils.latLngToH3(rideDestination, 7);

    const pickupHexMatch = false; // Pools are destination-based, no pickup H3 stored

    const destinationHexMatch = rideDestinationH3 === pool.destination_h3_index;

    const destinationRing = h3Utils.getH3Ring(rideDestinationH3, 2);
    const commonHexagons = destinationRing.filter(
      (h) => h === pool.destination_h3_index
    );

    // Calculate final score
    const scoreResult = this.calculatePoolScore({
      pickupDistance: 0, // Pools are destination-based, no pickup comparison
      destinationDistance,
      routeOverlapPercentage: routeOverlap,
      pickupHexMatch,
      destinationHexMatch,
      currentPassengers: pool.current_passengers,
      maxPassengers: pool.max_passengers,
      maxPickupDistance: CONSTANTS.PICKUP_RANGE_KM,
      maxDestinationDistance: CONSTANTS.DESTINATION_RANGE_KM || 5,
    });

    if (scoreResult.totalScore < minScore) {
      return {
        compatible: false,
        score: scoreResult.totalScore,
        reason: `Score too low: ${scoreResult.totalScore} (min: ${minScore})`,
        details: {
          pickupDistance: 0,
          destinationDistance,
          routeOverlapPercentage: Math.round(routeOverlap * 100),
          commonHexagonsCount: commonHexagons.length,
          pickupHexMatch,
          destinationHexMatch,
        },
      };
    }

    return {
      compatible: true,
      score: scoreResult.totalScore,
      details: {
        pickupDistance: 0,
        destinationDistance,
        routeOverlapPercentage: Math.round(routeOverlap * 100),
        commonHexagonsCount: commonHexagons.length,
        pickupHexMatch,
        destinationHexMatch,
      },
    };
  }

  /**
   * Calculate comprehensive pool match score (0-100)
   */
  private calculatePoolScore(params: {
    pickupDistance: number;
    destinationDistance: number;
    routeOverlapPercentage: number;
    pickupHexMatch: boolean;
    destinationHexMatch: boolean;
    currentPassengers: number;
    maxPassengers: number;
    maxPickupDistance: number;
    maxDestinationDistance: number;
  }): ScoreBreakdown {
    // 1. DISTANCE SCORE (0-25 points)
    // Closer pickup = higher score
    const distanceRatio = Math.min(
      1,
      params.pickupDistance / params.maxPickupDistance
    );
    const distanceScore = this.scoreWeights.distance * (1 - distanceRatio);

    // 2. ROUTE OVERLAP SCORE (0-35 points)
    // Higher overlap = higher score (0-100 percentage range)
    const routeOverlapScore =
      this.scoreWeights.routeOverlap * (params.routeOverlapPercentage / 100);

    // 3. PASSENGER FILL SCORE (0-20 points)
    // More passengers = higher score (incentivizes fuller pools)
    const fillRatio = params.currentPassengers / params.maxPassengers;
    const hexagonScore = this.scoreWeights.commonHexagons * fillRatio;

    // 4. EXACT MATCH BONUSES (0-10 points total)
    let exactMatchBonus = 0;
    if (params.pickupHexMatch) {
      exactMatchBonus += this.scoreWeights.exactPickupBonus;
    }
    if (params.destinationHexMatch) {
      exactMatchBonus += this.scoreWeights.exactDestinationBonus;
    }

    // 5. DESTINATION PROXIMITY SCORE (0-10 points)
    // Closer destination = higher score
    const destRatio = Math.min(
      1,
      params.destinationDistance / params.maxDestinationDistance
    );
    const destinationProximityScore =
      this.scoreWeights.destinationProximity * (1 - destRatio);

    // Calculate total score
    const totalScore = Math.round(
      distanceScore +
        routeOverlapScore +
        hexagonScore +
        exactMatchBonus +
        destinationProximityScore
    );

    return {
      distanceScore: Math.round(distanceScore * 10) / 10,
      routeOverlapScore: Math.round(routeOverlapScore * 10) / 10,
      hexagonScore: Math.round(hexagonScore * 10) / 10,
      exactMatchBonus: Math.round(exactMatchBonus * 10) / 10,
      destinationProximityScore:
        Math.round(destinationProximityScore * 10) / 10,
      totalScore: Math.min(100, totalScore), // Cap at 100
    };
  }

  /**
   * Calculate route overlap percentage (0-1) using location geometry
   * 
   * Enhanced version: Uses actual route geometry when available,
   * falls back to simple destination-based calculation otherwise.
   * 
   * @param ridePickup - Rider's pickup location
   * @param rideDestination - Rider's destination
   * @param poolDestination - Pool's destination
   * @param poolPickup - Pool creator's pickup (optional, for full route analysis)
   * @param rideRouteCoords - Rider's route coordinates (optional)
   * @param poolRouteCoords - Pool's route coordinates (optional)
   */
  private calculateRouteOverlapPercentage(
    ridePickup: Location,
    rideDestination: Location,
    poolDestination: Location,
    poolPickup?: Location,
    rideRouteCoords?: Coordinate[],
    poolRouteCoords?: Coordinate[]
  ): number {
    // If we have route coordinates, use the advanced overlap algorithm
    if (rideRouteCoords?.length && poolRouteCoords?.length && poolPickup) {
      const userA: UserRoute = {
        userId: 'rider',
        pickup: ridePickup,
        destination: rideDestination,
        routeCoords: rideRouteCoords,
      };
      const userB: UserRoute = {
        userId: 'pool',
        pickup: poolPickup,
        destination: poolDestination,
        routeCoords: poolRouteCoords,
      };

      const result = routeOverlapService.calculateTwoUserOverlap(userA, userB);
      return result.overlapPercentage / 100; // Convert to 0-1 range
    }

    // Fallback: Simple overlap calculation based on destination proximity
    // This is used when route coordinates are not available
    const maxDistance = CONSTANTS.DESTINATION_RANGE_KM || 5;
    const destDistance = calculateDistance(
      rideDestination.latitude,
      rideDestination.longitude,
      poolDestination.latitude,
      poolDestination.longitude
    );

    // Return overlap percentage: 1.0 (100%) if same destination, decreases with distance
    return Math.max(0, 1 - destDistance / maxDistance);
  }

  /**
   * Estimate arrival time in minutes
   */
  private estimateArrivalTime(
    driverLat: number,
    driverLng: number,
    pickupLat: number,
    pickupLng: number,
    speedKmh: number = AVERAGE_CITY_SPEED_KMH
  ): number {
    const distanceKm = calculateDistance(
      driverLat,
      driverLng,
      pickupLat,
      pickupLng
    );
    const speedPerMinute = speedKmh / 60;
    return Math.ceil(distanceKm / speedPerMinute);
  }

  /**
   * Get pool by ID (helper method for Google Maps enrichment)
   *
   * @param poolId - Pool ID
   * @returns Pool object or null if not found
   */
  private async getPoolById(poolId: string): Promise<Pool | null> {
    try {
      const { data, error } = await supabase
        .from("pools")
        .select("*")
        .eq("id", poolId)
        .single();

      if (error || !data) {
        console.error(`[PoolMatching] Error fetching pool ${poolId}:`, error);
        return null;
      }

      return data as Pool;
    } catch (error) {
      console.error(`[PoolMatching] Error in getPoolById:`, error);
      return null;
    }
  }

  /**
   * Get explanation of match score for debugging/display
   */
  getScoreExplanation(result: ScoredMatchingResult): string {
    const breakdown = result.scoreBreakdown;
    return `
╔════════════════════════════════════════╗
║ POOL MATCH ANALYSIS                    ║
╠════════════════════════════════════════╣
║ Total Score:      ${breakdown.totalScore.toString().padStart(2, " ")}/100
╠════════════════════════════════════════╣
║ Pickup Distance:  ${breakdown.distanceScore.toFixed(1).padStart(4, " ")} pts
║ Route Overlap:    ${breakdown.routeOverlapScore
      .toFixed(1)
      .padStart(4, " ")} pts (${result.routeOverlapPercentage}%)
║ Pool Fill:        ${breakdown.hexagonScore.toFixed(1).padStart(4, " ")} pts
║ Exact Matches:    ${breakdown.exactMatchBonus.toFixed(1).padStart(4, " ")} pts
║ Destination:      ${breakdown.destinationProximityScore
      .toFixed(1)
      .padStart(4, " ")} pts
╠════════════════════════════════════════╣
║ H3 Distance:      ${result.h3Distance} hexagons
║ Est. Detour:      ${result.estimatedDetour.toFixed(1)} km
╚════════════════════════════════════════╝
    `.trim();
  }
}

export const poolMatchingService = new PoolMatchingService();
