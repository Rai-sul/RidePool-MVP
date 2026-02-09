import { Location, VehicleType } from '../types';
import { googleMapsService, GoogleMapsRoute, BestRouteResult, AlternativeRoute as GMAlternativeRoute } from './googleMaps.service';
import { fareService, FareBreakdown } from './fare.service';
import { calculateDistance } from '../utils/helper';

// ============================================
// RIDE ESTIMATION TYPES
// ============================================

export interface RideEstimate {
  // Distance and time
  distanceKm: number;
  durationMinutes: number; // Base duration without traffic
  durationInTraffic: number; // Duration with current traffic conditions
  
  // Fare estimates for different passenger counts
  fareEstimates: {
    solo: number;
    with2Passengers: number;
    with3Passengers: number;
    with4Passengers: number;
  };
  
  // Current estimate based on expected pool size
  estimatedFare: number;
  estimatedSavings: number;
  
  // Route information
  route?: {
    encoded: string;
    coordinates: Array<{ lat: number; lng: number }>;
    summary?: string; // e.g., "via Mirpur Road"
  };
  
  // Traffic-aware data
  trafficLevel: 'low' | 'moderate' | 'high';
  alternativeRoutes: AlternativeRoute[];
  selectedRouteReason: string; // Why this route was selected (e.g., "Fastest route with light traffic")
}

export interface AlternativeRoute {
  distanceKm: number;
  durationMinutes: number;
  durationInTraffic: number;
  description: string;
  timeDifference: number; // Difference from best route in minutes (+ve means slower)
  trafficLevel: 'low' | 'moderate' | 'high';
}

export interface PoolRouteOptimization {
  optimizedRoute: OptimizedPoolRoute;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  farePerPerson: number;
  stops: PoolStop[];
}

export interface OptimizedPoolRoute {
  encoded: string;
  coordinates: Array<{ lat: number; lng: number }>;
  legs: RouteLeg[];
}

export interface RouteLeg {
  from: Location;
  to: Location;
  distanceKm: number;
  durationMinutes: number;
  instruction: string;
}

export interface PoolStop {
  location: Location;
  address?: string;
  type: 'pickup' | 'dropoff';
  userId: string;
  order: number;
  estimatedArrival: number; // minutes from start
}

export interface PoolMemberLocation {
  userId: string;
  pickup: Location;
  dropoff: Location;
  pickupAddress?: string;
  dropoffAddress?: string;
}

// ============================================
// RIDE ESTIMATION SERVICE
// ============================================

export class RideEstimationService {
  /**
   * Get ride estimate for pickup to destination
   * Shows ETA and fare before user confirms ride
   * Uses traffic-aware routing to find the best route
   */
  async getRideEstimate(
    pickup: Location,
    destination: Location,
    vehicleType: VehicleType,
    estimatedPassengers: number = 2
  ): Promise<RideEstimate> {
    let distanceKm: number;
    let durationMinutes: number;
    let durationInTraffic: number;
    let route: RideEstimate['route'] | undefined;
    let alternativeRoutes: AlternativeRoute[] = [];
    let trafficLevel: 'low' | 'moderate' | 'high' = 'moderate';
    let selectedRouteReason = 'Best available route';

    // Try to get best route with traffic from Google Maps
    if (googleMapsService.isAvailable()) {
      const bestRouteResult = await googleMapsService.getBestRouteWithTraffic(pickup, destination);

      if (bestRouteResult) {
        const { bestRoute, alternativeRoutes: altRoutes, selectedReason } = bestRouteResult;
        
        distanceKm = bestRoute.distance;
        durationMinutes = bestRoute.duration;
        durationInTraffic = bestRoute.durationInTraffic;
        trafficLevel = bestRoute.trafficLevel;
        selectedRouteReason = selectedReason;
        
        route = {
          encoded: bestRoute.geometry.encoded,
          coordinates: bestRoute.geometry.coordinates,
          summary: bestRoute.summary,
        };

        // Build alternative routes info
        alternativeRoutes = altRoutes.map((alt) => ({
          distanceKm: Math.round(alt.distance * 10) / 10,
          durationMinutes: alt.duration,
          durationInTraffic: alt.durationInTraffic,
          description: alt.summary,
          timeDifference: alt.durationInTraffic - durationInTraffic,
          trafficLevel: alt.trafficLevel,
        }));
      } else {
        // Fallback to simple route
        const googleRoute = await googleMapsService.getRoute(pickup, destination);
        
        if (googleRoute) {
          distanceKm = googleRoute.distance;
          durationMinutes = googleRoute.duration;
          durationInTraffic = googleRoute.durationInTraffic;
          trafficLevel = googleRoute.trafficLevel;
          route = {
            encoded: googleRoute.geometry.encoded,
            coordinates: googleRoute.geometry.coordinates,
            summary: googleRoute.summary,
          };
          selectedRouteReason = `Via ${googleRoute.summary || 'main road'}`;
        } else {
          // Fallback to haversine distance
          distanceKm = calculateDistance(
            pickup.latitude,
            pickup.longitude,
            destination.latitude,
            destination.longitude
          );
          durationMinutes = Math.ceil((distanceKm / 25) * 60); // 25 km/h average for Dhaka
          durationInTraffic = durationMinutes;
          selectedRouteReason = 'Estimated route (offline)';
        }
      }
    } else {
      // No Google Maps, use haversine distance
      distanceKm = calculateDistance(
        pickup.latitude,
        pickup.longitude,
        destination.latitude,
        destination.longitude
      );
      durationMinutes = Math.ceil((distanceKm / 25) * 60);
      durationInTraffic = durationMinutes;
      selectedRouteReason = 'Estimated route (Maps API unavailable)';
    }

    // Calculate fare for different passenger counts (use traffic-aware duration)
    const soloFare = fareService.calculateFullFare(distanceKm, durationInTraffic, vehicleType, 1);
    const fare2 = fareService.calculateFullFare(distanceKm, durationInTraffic, vehicleType, 2);
    const fare3 = fareService.calculateFullFare(distanceKm, durationInTraffic, vehicleType, 3);
    const fare4 = fareService.calculateFullFare(distanceKm, durationInTraffic, vehicleType, 4);

    // Get estimate based on expected passengers
    const estimatedFareBreakdown = fareService.calculateFullFare(
      distanceKm,
      durationInTraffic,
      vehicleType,
      estimatedPassengers
    );

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes,
      durationInTraffic,
      fareEstimates: {
        solo: soloFare.displayedFare,
        with2Passengers: fare2.farePerPerson,
        with3Passengers: fare3.farePerPerson,
        with4Passengers: fare4.farePerPerson,
      },
      estimatedFare: estimatedFareBreakdown.farePerPerson,
      estimatedSavings: estimatedFareBreakdown.savings,
      route,
      trafficLevel,
      alternativeRoutes,
      selectedRouteReason,
    };
  }

  /**
   * Calculate optimized route for pool with multiple members
   * Minimizes total travel time and distance while picking up all members
   */
  async calculateOptimizedPoolRoute(
    members: PoolMemberLocation[],
    vehicleType: VehicleType,
    useGoogleMaps: boolean = true,
    includeFallbackLine: boolean = true,
    forcePerLeg: boolean = false
  ): Promise<PoolRouteOptimization> {
    if (members.length === 0) {
      throw new Error('No members provided for route optimization');
    }

    // Single member - simple pickup to dropoff
    if (members.length === 1) {
      return this.calculateSingleMemberRoute(members[0], vehicleType, useGoogleMaps, includeFallbackLine);
    }

    // Multiple members - need to optimize stop order
    const stops = this.orderStopsOptimally(members);
    
    // Calculate route through all stops
    let totalDistanceKm = 0;
    let totalDurationMinutes = 0;
    const legs: RouteLeg[] = [];
    let allCoordinates: Array<{ lat: number; lng: number }> = [];
    let encodedRoute = '';
    let currentMinutes = 0;
    const shouldFetchFullRoute =
      useGoogleMaps && !includeFallbackLine && googleMapsService.isAvailable() && !forcePerLeg;

    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i].location;
      const to = stops[i + 1].location;

      let legDistance: number;
      let legDuration: number;

      if (useGoogleMaps && googleMapsService.isAvailable() && !shouldFetchFullRoute) {
        const routeResult = await googleMapsService.getRoute(from, to);
        if (routeResult) {
          legDistance = routeResult.distance;
          legDuration = routeResult.duration;
          if (routeResult.geometry?.coordinates) {
            allCoordinates = [...allCoordinates, ...routeResult.geometry.coordinates];
          }
        } else {
          legDistance = calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude);
          legDuration = Math.ceil((legDistance / 25) * 60);
          if (includeFallbackLine) {
            if (allCoordinates.length === 0) {
              allCoordinates.push({ lat: from.latitude, lng: from.longitude });
            }
            allCoordinates.push({ lat: to.latitude, lng: to.longitude });
          }
        }
      } else {
        legDistance = calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude);
        legDuration = Math.ceil((legDistance / 25) * 60);
        if (includeFallbackLine) {
          if (allCoordinates.length === 0) {
            allCoordinates.push({ lat: from.latitude, lng: from.longitude });
          }
          allCoordinates.push({ lat: to.latitude, lng: to.longitude });
        }
      }

      totalDistanceKm += legDistance;
      totalDurationMinutes += legDuration;
      currentMinutes += legDuration;

      // Update arrival time for next stop
      if (i + 1 < stops.length) {
        stops[i + 1].estimatedArrival = currentMinutes;
      }

      legs.push({
        from,
        to,
        distanceKm: legDistance,
        durationMinutes: legDuration,
        instruction: `${stops[i].type === 'pickup' ? 'Pick up' : 'Drop off'} passenger at ${stops[i].address || 'location'}`,
      });
    }

    // If we intentionally avoided per-leg routes, fetch a single combined route polyline
    if (shouldFetchFullRoute && stops.length >= 2) {
      const origin = stops[0].location;
      const destination = stops[stops.length - 1].location;
      const waypoints = stops.slice(1, -1).map((stop) => stop.location);

      const combinedRoute = await googleMapsService.getRoute(origin, destination, { waypoints });
      if (combinedRoute?.geometry?.coordinates) {
        allCoordinates = combinedRoute.geometry.coordinates;
        encodedRoute = combinedRoute.geometry.encoded;
      }
    }

    // Calculate fare per person
    const fareBreakdown = fareService.calculateFullFare(
      totalDistanceKm,
      totalDurationMinutes,
      vehicleType,
      members.length
    );

    return {
      optimizedRoute: {
        encoded: encodedRoute,
        coordinates: allCoordinates,
        legs,
      },
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationMinutes,
      farePerPerson: fareBreakdown.farePerPerson,
      stops,
    };
  }

  /**
   * Order stops optimally to minimize travel time
   * Uses nearest neighbor heuristic with pickup-before-dropoff constraint
   */
  private orderStopsOptimally(members: PoolMemberLocation[]): PoolStop[] {
    const stops: PoolStop[] = [];
    const pickups: PoolStop[] = [];
    const dropoffs: Map<string, PoolStop> = new Map();

    // Create pickup and dropoff stops
    members.forEach((member, idx) => {
      pickups.push({
        location: member.pickup,
        address: member.pickupAddress,
        type: 'pickup',
        userId: member.userId,
        order: 0,
        estimatedArrival: 0,
      });
      dropoffs.set(member.userId, {
        location: member.dropoff,
        address: member.dropoffAddress,
        type: 'dropoff',
        userId: member.userId,
        order: 0,
        estimatedArrival: 0,
      });
    });

    // Start with first pickup
    let currentLocation = pickups[0].location;
    stops.push(pickups[0]);
    pickups.splice(0, 1);
    const pickedUp = new Set<string>([stops[0].userId]);

    // Greedy nearest neighbor with constraints
    while (pickups.length > 0 || dropoffs.size > 0) {
      let bestStop: PoolStop | null = null;
      let bestDistance = Infinity;

      // Consider remaining pickups
      for (const pickup of pickups) {
        const dist = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          pickup.location.latitude,
          pickup.location.longitude
        );
        if (dist < bestDistance) {
          bestDistance = dist;
          bestStop = pickup;
        }
      }

      // Consider dropoffs for picked-up passengers
      for (const [userId, dropoff] of dropoffs) {
        if (pickedUp.has(userId)) {
          const dist = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            dropoff.location.latitude,
            dropoff.location.longitude
          );
          if (dist < bestDistance) {
            bestDistance = dist;
            bestStop = dropoff;
          }
        }
      }

      if (!bestStop) break;

      bestStop.order = stops.length;
      stops.push(bestStop);
      currentLocation = bestStop.location;

      if (bestStop.type === 'pickup') {
        pickedUp.add(bestStop.userId);
        const idx = pickups.findIndex(p => p.userId === bestStop!.userId);
        if (idx !== -1) pickups.splice(idx, 1);
      } else {
        dropoffs.delete(bestStop.userId);
      }
    }

    return stops;
  }

  /**
   * Calculate route for single member
   */
  private async calculateSingleMemberRoute(
    member: PoolMemberLocation,
    vehicleType: VehicleType,
    useGoogleMaps: boolean,
    includeFallbackLine: boolean
  ): Promise<PoolRouteOptimization> {
    let distanceKm: number;
    let durationMinutes: number;
    let coordinates: Array<{ lat: number; lng: number }> = [];
    let encoded = '';

    if (useGoogleMaps && googleMapsService.isAvailable()) {
      const route = await googleMapsService.getRoute(member.pickup, member.dropoff);
      if (route) {
        distanceKm = route.distance;
        durationMinutes = route.duration;
        coordinates = route.geometry?.coordinates || [];
        encoded = route.geometry?.encoded || '';
      } else {
        distanceKm = calculateDistance(
          member.pickup.latitude,
          member.pickup.longitude,
          member.dropoff.latitude,
          member.dropoff.longitude
        );
        durationMinutes = Math.ceil((distanceKm / 25) * 60);
        if (includeFallbackLine) {
          coordinates = [
            { lat: member.pickup.latitude, lng: member.pickup.longitude },
            { lat: member.dropoff.latitude, lng: member.dropoff.longitude },
          ];
        }
      }
    } else {
      distanceKm = calculateDistance(
        member.pickup.latitude,
        member.pickup.longitude,
        member.dropoff.latitude,
        member.dropoff.longitude
      );
      durationMinutes = Math.ceil((distanceKm / 25) * 60);
      if (includeFallbackLine) {
        coordinates = [
          { lat: member.pickup.latitude, lng: member.pickup.longitude },
          { lat: member.dropoff.latitude, lng: member.dropoff.longitude },
        ];
      }
    }

    const fareBreakdown = fareService.calculateFullFare(distanceKm, durationMinutes, vehicleType, 1);

    return {
      optimizedRoute: {
        encoded,
        coordinates,
        legs: [{
          from: member.pickup,
          to: member.dropoff,
          distanceKm,
          durationMinutes,
          instruction: 'Drive to destination',
        }],
      },
      totalDistanceKm: distanceKm,
      totalDurationMinutes: durationMinutes,
      farePerPerson: fareBreakdown.farePerPerson,
      stops: [
        {
          location: member.pickup,
          address: member.pickupAddress,
          type: 'pickup',
          userId: member.userId,
          order: 0,
          estimatedArrival: 0,
        },
        {
          location: member.dropoff,
          address: member.dropoffAddress,
          type: 'dropoff',
          userId: member.userId,
          order: 1,
          estimatedArrival: durationMinutes,
        },
      ],
    };
  }

  /**
   * Recalculate fare when pool membership changes
   */
  async recalculatePoolFare(
    members: PoolMemberLocation[],
    vehicleType: VehicleType
  ): Promise<{
    farePerPerson: number;
    totalFare: number;
    breakdown: FareBreakdown;
    memberFares: Array<{
      userId: string;
      fare: number;
      distanceKm: number;
      savings: number;
    }>;
  }> {
    if (members.length === 0) {
      return {
        farePerPerson: 0,
        totalFare: 0,
        breakdown: {
          baseFare: 0,
          distanceFare: 0,
          timeFare: 0,
          poolDiscount: 0,
          fullPoolBonus: 0,
          displayedFare: 0,
          actualCharge: 0,
          platformSurcharge: 0,
          savings: 0,
          farePerPerson: 0,
        },
        memberFares: [],
      };
    }

    // Calculate optimized route to get total distance
    const routeOptimization = await this.calculateOptimizedPoolRoute(members, vehicleType);

    // Calculate full fare breakdown
    const breakdown = fareService.calculateFullFare(
      routeOptimization.totalDistanceKm,
      routeOptimization.totalDurationMinutes,
      vehicleType,
      members.length
    );

    // Calculate individual member fares based on their trip distance
    const memberFares = await Promise.all(
      members.map(async (member) => {
        const memberDistance = calculateDistance(
          member.pickup.latitude,
          member.pickup.longitude,
          member.dropoff.latitude,
          member.dropoff.longitude
        );
        const memberDuration = Math.ceil((memberDistance / 25) * 60);

        // Solo fare for comparison
        const soloFare = fareService.calculateFullFare(memberDistance, memberDuration, vehicleType, 1);

        // Member's share (proportional to their distance)
        const distanceRatio = memberDistance / routeOptimization.totalDistanceKm;
        const memberFare = Math.round(breakdown.farePerPerson * distanceRatio * members.length);

        return {
          userId: member.userId,
          fare: Math.max(memberFare, breakdown.farePerPerson), // At least the average
          distanceKm: Math.round(memberDistance * 10) / 10,
          savings: Math.max(0, soloFare.displayedFare - breakdown.farePerPerson),
        };
      })
    );

    return {
      farePerPerson: breakdown.farePerPerson,
      totalFare: breakdown.displayedFare * members.length,
      breakdown,
      memberFares,
    };
  }
}

export const rideEstimationService = new RideEstimationService();
