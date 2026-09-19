import { Location } from "../types";
import { config } from "../config/env";
import { cacheService } from "./cache.service";
import { h3Utils, H3_RESOLUTION } from "../utils/h3.utils";

// SUPER COST-EFFECTIVE: Extended cache TTLs to minimize API costs
// Traffic-aware route cache: 10 minutes (was 5 min) - traffic data still fresh enough
const ROUTE_CACHE_TTL = 600;
// Simple distance cache TTL: 2 hours (distance doesn't change)
const DISTANCE_CACHE_TTL = 7200;

// ============================================
// GOOGLE MAPS API TYPES
// ============================================

export interface GoogleMapsRoute {
  distance: number; // Distance in kilometers
  duration: number; // Duration in minutes (base, without traffic)
  durationInTraffic: number; // Duration in minutes (with current traffic)
  geometry: {
    encoded: string; // Encoded polyline for map display
    coordinates: Array<{ lat: number; lng: number }>; // Decoded coordinates
  };
  bounds: {
    northeast: Location;
    southwest: Location;
  };
  steps?: RouteStep[]; // Turn-by-turn directions (optional)
  legs?: GoogleMapsRouteLeg[]; // Whole stop-to-stop legs in request order
  summary?: string; // Route summary (e.g., "via Mirpur Road")
  trafficLevel: 'low' | 'moderate' | 'high'; // Traffic level based on duration difference
}

export interface GoogleMapsRouteLeg {
  distance: number; // kilometers
  duration: number; // traffic-aware minutes
  baseDuration: number; // minutes without traffic
  polyline: string;
}

export interface TrafficMatrixCell {
  originIndex: number;
  destinationIndex: number;
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number;
  condition: string;
}

export type TrafficRouteMatrix = Array<Array<TrafficMatrixCell | null>>;

export type RoutesApiFailureReason =
  | 'SERVICE_DISABLED'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'MALFORMED_RESPONSE';

export interface RoutesApiFailure {
  reason: RoutesApiFailureReason;
  status?: number;
  retryAt: number;
}

export interface RouteStep {
  distance: number; // Distance in km
  duration: number; // Duration in minutes
  instruction: string; // Human-readable instruction
  polyline: string; // Encoded polyline for this step
}

export interface AlternativeRoute {
  distance: number; // km
  duration: number; // minutes without traffic
  durationInTraffic: number; // minutes with traffic
  summary: string;
  trafficLevel: 'low' | 'moderate' | 'high';
  geometry: {
    encoded: string;
    coordinates: Array<{ lat: number; lng: number }>;
  };
}

export interface GoogleMapsDirectionsResponse {
  routes: Array<{
    legs: Array<{
      distance: { value: number; text: string }; // Distance in meters
      duration: { value: number; text: string }; // Duration in seconds (base)
      duration_in_traffic?: { value: number; text: string }; // Duration with traffic
      steps: Array<{
        distance: { value: number; text: string };
        duration: { value: number; text: string };
        html_instructions: string;
        polyline: { points: string };
      }>;
      start_location: { lat: number; lng: number };
      end_location: { lat: number; lng: number };
    }>;
    overview_polyline: { points: string };
    bounds: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    summary: string; // Route summary
  }>;
  status: string;
  error_message?: string;
}

export interface BestRouteResult {
  bestRoute: GoogleMapsRoute;
  alternativeRoutes: AlternativeRoute[];
  selectedReason: string; // Why this route was selected
}

interface RoutesApiMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  status?: { code?: number; message?: string };
  condition?: string;
  distanceMeters?: number;
  duration?: string;
  staticDuration?: string;
}

interface RoutesApiResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    staticDuration?: string;
    description?: string;
    polyline?: { encodedPolyline?: string };
    viewport?: {
      low?: { latitude?: number; longitude?: number };
      high?: { latitude?: number; longitude?: number };
    };
    legs?: Array<{
      distanceMeters?: number;
      duration?: string;
      staticDuration?: string;
      polyline?: { encodedPolyline?: string };
    }>;
  }>;
  error?: { code?: number; message?: string; status?: string };
}

// ============================================
// GOOGLE MAPS SERVICE
// ============================================

export class GoogleMapsService {
  private readonly baseUrl =
    "https://maps.googleapis.com/maps/api/directions/json";
  private readonly routesBaseUrl = "https://routes.googleapis.com";
  private readonly apiKey: string;
  private routesApiFailure: RoutesApiFailure | null = null;
  private trafficMatrixAttempted = false;
  private routesApiLastFailureAt: number | null = null;

  constructor() {
    this.apiKey = config.googleMaps.apiKey;
    if (!this.apiKey) {
      console.warn(
        "[GoogleMapsService] Warning: GOOGLE_MAPS_API_KEY not configured. Google Maps features will be disabled."
      );
    }
  }

  /**
   * Degraded route snapshots may be reused while a known provider failure is
   * cooling down. Once this returns true, SmartRoute retries the matrix and
   * replaces the degraded cache if Google has recovered or been enabled.
   */
  shouldRefreshDegradedRoute(calculatedAt?: string): boolean {
    if (this.routesApiFailure) {
      return Date.now() >= this.routesApiFailure.retryAt;
    }
    // Retry one degraded Redis snapshot after each backend start. This makes
    // enabling Routes API + restarting recover immediately without shortening
    // the route's normal TTL.
    if (!this.trafficMatrixAttempted) return true;
    if (!this.routesApiLastFailureAt || !calculatedAt) return false;
    const routeCalculatedAt = Date.parse(calculatedAt);
    return Number.isFinite(routeCalculatedAt) && routeCalculatedAt <= this.routesApiLastFailureAt;
  }

  getRoutesApiFailure(): RoutesApiFailure | null {
    return this.routesApiFailure ? { ...this.routesApiFailure } : null;
  }

  private canRequestTrafficMatrix(): boolean {
    return !this.routesApiFailure || Date.now() >= this.routesApiFailure.retryAt;
  }

  /**
   * Fetch a traffic-aware cost matrix for an exact set of stops.
   * Matrix responses are indexed explicitly because Google does not guarantee
   * that streamed elements arrive in origin/destination order.
   */
  async computeTrafficRouteMatrix(
    locations: Location[],
    departureTime: Date = new Date()
  ): Promise<TrafficRouteMatrix | null> {
    if (!this.apiKey || locations.length === 0) return null;
    if (!this.canRequestTrafficMatrix()) return null;

    // TRAFFIC_AWARE_OPTIMAL matrices are limited to 100 elements. The current
    // pool limit is driver + 8 passenger stops = 9 x 9 = 81 elements.
    if (locations.length * locations.length > 100) {
      console.error('[GoogleMapsService] Traffic matrix exceeds the 100 element limit');
      return null;
    }
    this.trafficMatrixAttempted = true;

    const waypoints = locations.map((location) => ({
      waypoint: {
        location: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
      },
    }));
    // Google defaults an omitted departureTime to the request time. Do not
    // send a just-created timestamp after it has already become "past", which
    // is invalid for DRIVE requests. Explicit future times remain supported.
    const futureDepartureTime = departureTime.getTime() > Date.now()
      ? departureTime.toISOString()
      : undefined;

    try {
      const response = await fetch(
        `${this.routesBaseUrl}/distanceMatrix/v2:computeRouteMatrix`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': [
              'originIndex',
              'destinationIndex',
              'status',
              'condition',
              'distanceMeters',
              'duration',
              'staticDuration',
            ].join(','),
          },
          body: JSON.stringify({
            origins: waypoints,
            destinations: waypoints,
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
            ...(futureDepartureTime ? { departureTime: futureDepartureTime } : {}),
            languageCode: 'en',
            units: 'METRIC',
          }),
        }
      );

      if (!response.ok) {
        const responseText = await response.text();
        this.recordRoutesApiFailure(response.status, responseText);
        console.error(`[GoogleMapsService] Route matrix error: ${response.status} ${responseText}`);
        return null;
      }

      const elements = (await response.json()) as RoutesApiMatrixElement[];
      if (!Array.isArray(elements)) {
        this.routesApiLastFailureAt = Date.now();
        this.routesApiFailure = {
          reason: 'MALFORMED_RESPONSE',
          retryAt: Date.now() + 60_000,
        };
        return null;
      }

      this.routesApiFailure = null;

      const matrix: TrafficRouteMatrix = Array.from(
        { length: locations.length },
        () => Array<TrafficMatrixCell | null>(locations.length).fill(null)
      );

      for (const element of elements) {
        const originIndex = element.originIndex;
        const destinationIndex = element.destinationIndex;
        if (
          originIndex === undefined ||
          destinationIndex === undefined ||
          originIndex < 0 ||
          destinationIndex < 0 ||
          originIndex >= locations.length ||
          destinationIndex >= locations.length
        ) {
          continue;
        }

        if ((element.status?.code ?? 0) !== 0 || element.condition === 'ROUTE_NOT_FOUND') {
          continue;
        }

        matrix[originIndex][destinationIndex] = {
          originIndex,
          destinationIndex,
          distanceMeters: element.distanceMeters ?? 0,
          durationSeconds: this.parseGoogleDuration(element.duration),
          staticDurationSeconds: this.parseGoogleDuration(element.staticDuration ?? element.duration),
          condition: element.condition ?? 'ROUTE_EXISTS',
        };
      }

      // The diagonal is useful to callers even when Google omits it.
      for (let index = 0; index < locations.length; index++) {
        matrix[index][index] ??= {
          originIndex: index,
          destinationIndex: index,
          distanceMeters: 0,
          durationSeconds: 0,
          staticDurationSeconds: 0,
          condition: 'ROUTE_EXISTS',
        };
      }

      return matrix;
    } catch (error) {
      this.routesApiLastFailureAt = Date.now();
      this.routesApiFailure = {
        reason: 'NETWORK_ERROR',
        retryAt: Date.now() + 30_000,
      };
      console.error('[GoogleMapsService] Error fetching traffic route matrix:', error);
      return null;
    }
  }

  private recordRoutesApiFailure(status: number, responseText: string): void {
    const normalized = responseText.toUpperCase();
    let reason: RoutesApiFailureReason;
    let cooldownMs: number;

    if (normalized.includes('SERVICE_DISABLED')) {
      reason = 'SERVICE_DISABLED';
      cooldownMs = 30 * 60_000;
    } else if (status === 403) {
      reason = 'PERMISSION_DENIED';
      cooldownMs = 30 * 60_000;
    } else if (status === 429) {
      reason = 'RATE_LIMITED';
      cooldownMs = 60_000;
    } else if (status >= 500) {
      reason = 'NETWORK_ERROR';
      cooldownMs = 30_000;
    } else {
      reason = 'INVALID_REQUEST';
      cooldownMs = 5 * 60_000;
    }

    const failedAt = Date.now();
    this.routesApiLastFailureAt = failedAt;
    this.routesApiFailure = {
      reason,
      status,
      retryAt: failedAt + cooldownMs,
    };
  }

  /**
   * Fetch final geometry and whole legs for a server-selected stop order.
   * optimizeWaypointOrder is intentionally omitted so pickup/drop-off
   * precedence cannot be changed by the provider.
   */
  async computeFixedOrderTrafficRoute(
    orderedLocations: Location[],
    departureTime: Date = new Date()
  ): Promise<GoogleMapsRoute | null> {
    if (!this.apiKey || orderedLocations.length < 2) return null;

    const asWaypoint = (location: Location) => ({
      location: {
        latLng: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      },
    });
    const futureDepartureTime = departureTime.getTime() > Date.now()
      ? departureTime.toISOString()
      : undefined;

    try {
      const response = await fetch(`${this.routesBaseUrl}/directions/v2:computeRoutes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': [
            'routes.distanceMeters',
            'routes.duration',
            'routes.staticDuration',
            'routes.description',
            'routes.polyline.encodedPolyline',
            'routes.viewport',
            'routes.legs.distanceMeters',
            'routes.legs.duration',
            'routes.legs.staticDuration',
            'routes.legs.polyline.encodedPolyline',
          ].join(','),
        },
        body: JSON.stringify({
          origin: asWaypoint(orderedLocations[0]),
          destination: asWaypoint(orderedLocations[orderedLocations.length - 1]),
          intermediates: orderedLocations.slice(1, -1).map(asWaypoint),
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
          computeAlternativeRoutes: false,
          ...(futureDepartureTime ? { departureTime: futureDepartureTime } : {}),
          languageCode: 'en',
          units: 'METRIC',
          // OVERVIEW follows the selected roads while remaining compact enough
          // for native, web, and Expo Go Static Maps rendering.
          polylineQuality: 'OVERVIEW',
          polylineEncoding: 'ENCODED_POLYLINE',
        }),
      });

      if (!response.ok) {
        console.error(`[GoogleMapsService] Compute route error: ${response.status} ${await response.text()}`);
        return null;
      }

      const data = (await response.json()) as RoutesApiResponse;
      const route = data.routes?.[0];
      const encoded = route?.polyline?.encodedPolyline;
      if (!route || !encoded) return null;

      const durationSeconds = this.parseGoogleDuration(route.duration);
      const staticDurationSeconds = this.parseGoogleDuration(route.staticDuration ?? route.duration);
      const coordinates = this.decodePolyline(encoded);
      const fallbackBounds = this.calculateBounds(coordinates);

      return {
        distance: (route.distanceMeters ?? 0) / 1000,
        duration: Math.round(staticDurationSeconds / 60),
        durationInTraffic: Math.round(durationSeconds / 60),
        geometry: { encoded, coordinates },
        bounds: {
          northeast: {
            latitude: route.viewport?.high?.latitude ?? fallbackBounds.northeast.latitude,
            longitude: route.viewport?.high?.longitude ?? fallbackBounds.northeast.longitude,
          },
          southwest: {
            latitude: route.viewport?.low?.latitude ?? fallbackBounds.southwest.latitude,
            longitude: route.viewport?.low?.longitude ?? fallbackBounds.southwest.longitude,
          },
        },
        legs: (route.legs ?? []).map((leg) => ({
          distance: (leg.distanceMeters ?? 0) / 1000,
          duration: this.parseGoogleDuration(leg.duration) / 60,
          baseDuration: this.parseGoogleDuration(leg.staticDuration ?? leg.duration) / 60,
          polyline: leg.polyline?.encodedPolyline ?? '',
        })),
        summary: route.description || 'Traffic-optimized pool route',
        trafficLevel: this.calculateTrafficLevel(staticDurationSeconds, durationSeconds),
      };
    } catch (error) {
      console.error('[GoogleMapsService] Error fetching fixed-order traffic route:', error);
      return null;
    }
  }

  /**
   * Get route between two points using Google Maps Directions API
   * Now includes traffic-aware duration
   *
   * @param origin - Starting location
   * @param destination - Ending location
   * @param options - Optional route options
   * @returns Route information with distance, duration, and geometry
   */
  async getRoute(
    origin: Location,
    destination: Location,
    options: {
      mode?: "driving" | "walking" | "transit";
      alternatives?: boolean;
      avoid?: string[];
      waypoints?: Location[];
      trafficModel?: "best_guess" | "pessimistic" | "optimistic";
    } = {}
  ): Promise<GoogleMapsRoute | null> {
    if (!this.apiKey) {
      console.warn(
        "[GoogleMapsService] Google Maps API key not configured. Returning null."
      );
      return null;
    }

    try {
      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        key: this.apiKey,
        mode: options.mode || "driving",
        alternatives: (options.alternatives || false).toString(),
        language: "en",
        units: "metric",
        // Request traffic-aware duration by setting departure_time to now
        departure_time: "now",
        traffic_model: options.trafficModel || "best_guess",
      });

      // Add waypoints if provided
      if (options.waypoints && options.waypoints.length > 0) {
        const waypointsStr = options.waypoints
          .map((wp) => `${wp.latitude},${wp.longitude}`)
          .join("|");
        params.append("waypoints", waypointsStr);
      }

      // Add avoid parameters if provided
      if (options.avoid && options.avoid.length > 0) {
        params.append("avoid", options.avoid.join("|"));
      }

      const url = `${this.baseUrl}?${params.toString()}`;

      const response = await fetch(url);
      const data = (await response.json()) as GoogleMapsDirectionsResponse;

      if (data.status !== "OK") {
        console.error(
          `[GoogleMapsService] API error: ${data.status} - ${
            data.error_message || "Unknown error"
          }`
        );
        return null;
      }

      if (!data.routes || data.routes.length === 0) {
        console.warn("[GoogleMapsService] No routes found");
        return null;
      }

      // Use the first route (best route by Google's algorithm)
      const route = data.routes[0];
      const leg = route.legs[0]; // For single-leg routes

      // Calculate total distance and duration
      const totalDistance = route.legs.reduce(
        (sum, leg) => sum + leg.distance.value,
        0
      );
      const totalDuration = route.legs.reduce(
        (sum, leg) => sum + leg.duration.value,
        0
      );
      const totalDurationInTraffic = route.legs.reduce(
        (sum, leg) => sum + (leg.duration_in_traffic?.value || leg.duration.value),
        0
      );

      // Decode polyline using custom implementation
      const coordinates = this.decodePolyline(route.overview_polyline.points);

      // Extract steps if available
      const steps: RouteStep[] = leg.steps.map((step) => ({
        distance: step.distance.value / 1000, // Convert to km
        duration: step.duration.value / 60, // Convert to minutes
        instruction: this.stripHtmlTags(step.html_instructions),
        polyline: step.polyline.points,
      }));

      // Calculate traffic level
      const trafficLevel = this.calculateTrafficLevel(totalDuration, totalDurationInTraffic);

      return {
        distance: totalDistance / 1000, // Convert meters to kilometers
        duration: Math.round(totalDuration / 60), // Convert seconds to minutes
        durationInTraffic: Math.round(totalDurationInTraffic / 60), // With traffic
        geometry: {
          encoded: route.overview_polyline.points,
          coordinates,
        },
        bounds: {
          northeast: {
            latitude: route.bounds.northeast.lat,
            longitude: route.bounds.northeast.lng,
          },
          southwest: {
            latitude: route.bounds.southwest.lat,
            longitude: route.bounds.southwest.lng,
          },
        },
        steps,
        legs: route.legs.map((routeLeg) => ({
          distance: routeLeg.distance.value / 1000,
          duration: (routeLeg.duration_in_traffic?.value ?? routeLeg.duration.value) / 60,
          baseDuration: routeLeg.duration.value / 60,
          polyline: '',
        })),
        summary: route.summary,
        trafficLevel,
      };
    } catch (error) {
      console.error("[GoogleMapsService] Error fetching route:", error);
      return null;
    }
  }

  /**
   * Get the best route considering traffic from multiple alternatives
   * Selects the route with minimum travel time in current traffic conditions
   *
   * @param origin - Starting location
   * @param destination - Ending location
   * @param waypoints - Optional intermediate stops
   * @returns Best route and alternatives with traffic info
   */
  async getBestRouteWithTraffic(
    origin: Location,
    destination: Location,
    waypoints?: Location[]
  ): Promise<BestRouteResult | null> {
    // Geometry and waypoint order are exact inputs. Never reuse a polyline
    // merely because another trip happened to share coarse H3 cells.
    const locationKey = (location: Location) =>
      `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
    let cacheKey = `route:best:v2:${locationKey(origin)}:${locationKey(destination)}`;
    if (waypoints && waypoints.length > 0) {
      const waypointsKey = waypoints.map(locationKey).join('|');
      cacheKey += `:${waypointsKey}`;
    }

    // Try to get from cache first (saves API cost)
    const cachedRoute = await cacheService.get<BestRouteResult>(cacheKey);
    if (cachedRoute) {
      console.log(`[GoogleMapsService] Cache HIT for route ${cacheKey} - saved 1.2 BDT`);
      return cachedRoute;
    }

    if (!this.apiKey) {
      console.warn(
        "[GoogleMapsService] Google Maps API key not configured. Returning null."
      );
      return null;
    }

    try {
      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        key: this.apiKey,
        mode: "driving",
        alternatives: "true", // Get multiple route options
        language: "en",
        units: "metric",
        departure_time: "now", // Required for traffic data
        traffic_model: "best_guess",
      });

      // Add waypoints if provided
      if (waypoints && waypoints.length > 0) {
        const waypointsStr = waypoints
          .map((wp) => `${wp.latitude},${wp.longitude}`)
          .join("|");
        params.append("waypoints", `optimize:true|${waypointsStr}`); // Optimize waypoint order
      }

      const url = `${this.baseUrl}?${params.toString()}`;

      const response = await fetch(url);
      const data = (await response.json()) as GoogleMapsDirectionsResponse;

      if (data.status !== "OK") {
        console.error(
          `[GoogleMapsService] API error: ${data.status} - ${
            data.error_message || "Unknown error"
          }`
        );
        return null;
      }

      if (!data.routes || data.routes.length === 0) {
        console.warn("[GoogleMapsService] No routes found");
        return null;
      }

      // Parse all routes and find the best one
      const parsedRoutes = data.routes.map((route) => {
        const totalDistance = route.legs.reduce(
          (sum, leg) => sum + leg.distance.value,
          0
        );
        const totalDuration = route.legs.reduce(
          (sum, leg) => sum + leg.duration.value,
          0
        );
        const totalDurationInTraffic = route.legs.reduce(
          (sum, leg) => sum + (leg.duration_in_traffic?.value || leg.duration.value),
          0
        );

        const trafficLevel = this.calculateTrafficLevel(totalDuration, totalDurationInTraffic);

        return {
          distance: totalDistance / 1000,
          duration: Math.round(totalDuration / 60),
          durationInTraffic: Math.round(totalDurationInTraffic / 60),
          summary: route.summary,
          trafficLevel,
          geometry: {
            encoded: route.overview_polyline.points,
            coordinates: this.decodePolyline(route.overview_polyline.points),
          },
          bounds: route.bounds,
          legs: route.legs,
        };
      });

      // Sort by duration in traffic (ascending) to find best route
      parsedRoutes.sort((a, b) => a.durationInTraffic - b.durationInTraffic);

      const bestRouteData = parsedRoutes[0];
      const originalRoute = data.routes[data.routes.findIndex(r => r.summary === bestRouteData.summary)];
      const leg = originalRoute.legs[0];

      // Build best route
      const bestRoute: GoogleMapsRoute = {
        distance: bestRouteData.distance,
        duration: bestRouteData.duration,
        durationInTraffic: bestRouteData.durationInTraffic,
        geometry: bestRouteData.geometry,
        bounds: {
          northeast: {
            latitude: bestRouteData.bounds.northeast.lat,
            longitude: bestRouteData.bounds.northeast.lng,
          },
          southwest: {
            latitude: bestRouteData.bounds.southwest.lat,
            longitude: bestRouteData.bounds.southwest.lng,
          },
        },
        steps: leg.steps.map((step) => ({
          distance: step.distance.value / 1000,
          duration: step.duration.value / 60,
          instruction: this.stripHtmlTags(step.html_instructions),
          polyline: step.polyline.points,
        })),
        summary: bestRouteData.summary,
        trafficLevel: bestRouteData.trafficLevel,
      };

      // Build alternative routes (excluding the best one)
      const alternativeRoutes: AlternativeRoute[] = parsedRoutes.slice(1).map((route) => ({
        distance: route.distance,
        duration: route.duration,
        durationInTraffic: route.durationInTraffic,
        summary: route.summary,
        trafficLevel: route.trafficLevel,
        geometry: route.geometry,
      }));

      // Determine why this route was selected
      let selectedReason = `Fastest route via ${bestRoute.summary}`;
      if (alternativeRoutes.length > 0) {
        const timeSaved = alternativeRoutes[0].durationInTraffic - bestRoute.durationInTraffic;
        if (timeSaved > 0) {
          selectedReason += ` (${timeSaved} min faster than alternatives)`;
        }
      }
      if (bestRoute.trafficLevel === 'low') {
        selectedReason += ' - Light traffic';
      } else if (bestRoute.trafficLevel === 'high') {
        selectedReason += ' - Heavy traffic, but still fastest';
      }

      const result: BestRouteResult = {
        bestRoute,
        alternativeRoutes,
        selectedReason,
      };

      // ========================================
      // COST OPTIMIZATION: Cache the result
      // 5-minute TTL balances freshness vs cost savings
      // ========================================
      await cacheService.set(cacheKey, result, ROUTE_CACHE_TTL);
      console.log(`[GoogleMapsService] Cached route ${cacheKey} for ${ROUTE_CACHE_TTL}s`);

      return result;
    } catch (error) {
      console.error("[GoogleMapsService] Error fetching best route:", error);
      return null;
    }
  }

  /**
   * Calculate traffic level based on duration difference
   */
  private parseGoogleDuration(value?: string): number {
    if (!value) return 0;
    const seconds = Number.parseFloat(value.replace(/s$/, ''));
    return Number.isFinite(seconds) ? seconds : 0;
  }

  private calculateBounds(coordinates: Array<{ lat: number; lng: number }>): {
    northeast: Location;
    southwest: Location;
  } {
    if (coordinates.length === 0) {
      return {
        northeast: { latitude: 0, longitude: 0 },
        southwest: { latitude: 0, longitude: 0 },
      };
    }

    let minLat = coordinates[0].lat;
    let maxLat = coordinates[0].lat;
    let minLng = coordinates[0].lng;
    let maxLng = coordinates[0].lng;
    for (const coordinate of coordinates.slice(1)) {
      minLat = Math.min(minLat, coordinate.lat);
      maxLat = Math.max(maxLat, coordinate.lat);
      minLng = Math.min(minLng, coordinate.lng);
      maxLng = Math.max(maxLng, coordinate.lng);
    }

    return {
      northeast: { latitude: maxLat, longitude: maxLng },
      southwest: { latitude: minLat, longitude: minLng },
    };
  }

  private calculateTrafficLevel(
    baseDuration: number,
    trafficDuration: number
  ): 'low' | 'moderate' | 'high' {
    if (baseDuration <= 0) return 'low';
    const ratio = trafficDuration / baseDuration;
    if (ratio <= 1.1) return 'low';
    if (ratio <= 1.3) return 'moderate';
    return 'high';
  }

  /**
   * Get distance and duration between two points (simplified version)
   * COST OPTIMIZED: Uses 1-hour cache since distance doesn't change
   *
   * @param origin - Starting location
   * @param destination - Ending location
   * @returns Object with distance (km) and duration (minutes)
   */
  async getDistance(
    origin: Location,
    destination: Location
  ): Promise<{ distance: number; duration: number; durationInTraffic: number } | null> {
    // Use H3 for cache key - groups nearby points for more cache hits
    const originH3 = h3Utils.latLngToH3(origin, H3_RESOLUTION.DESTINATION);
    const destH3 = h3Utils.latLngToH3(destination, H3_RESOLUTION.DESTINATION);
    const cacheKey = `route:distance:${originH3}:${destH3}`;

    // Check cache first
    const cached = await cacheService.get<{ distance: number; duration: number; durationInTraffic: number }>(cacheKey);
    if (cached) {
      return cached;
    }

    const route = await this.getRoute(origin, destination);
    if (!route) {
      return null;
    }

    const result = {
      distance: route.distance,
      duration: route.duration,
      durationInTraffic: route.durationInTraffic,
    };

    // Cache for 1 hour (distance doesn't change)
    await cacheService.set(cacheKey, result, DISTANCE_CACHE_TTL);

    return result;
  }

  /**
   * Decode Google Maps polyline string to coordinates
   *
   * @param encoded - Encoded polyline string
   * @returns Array of coordinate objects
   */
  private decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
    const coordinates: Array<{ lat: number; lng: number }> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let shift = 0;
      let result = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      coordinates.push({
        lat: lat * 1e-5,
        lng: lng * 1e-5,
      });
    }

    return coordinates;
  }

  /**
   * Strip HTML tags from instructions
   *
   * @param html - HTML string
   * @returns Plain text
   */
  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, "").trim();
  }

  /**
   * Generate a Google Maps deep link URL for FREE navigation
   * Opens the Google Maps app with full route showing ALL pickup and dropoff points
   * 
   * IMPORTANT: To show ALL stops on the map (including first pickup and last dropoff),
   * we include all stops in the route. The user can see the complete optimal route.
   * 
   * @param origin - Starting location (first pickup point)
   * @param destination - Final destination (last dropoff)
   * @param waypoints - Intermediate stops in OPTIMAL ORDER (already sorted by smartRouteService)
   * @returns URL string to open Google Maps with the complete route
   */
  generateNavigationDeepLink(
    origin: Location,
    destination: Location,
    waypoints?: Location[]
  ): string {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destStr = `${destination.latitude},${destination.longitude}`;
    
    // Log the waypoints order for debugging
    console.log(`[GoogleMaps] Generating deep link:`);
    console.log(`  Origin (first pickup): ${originStr}`);
    
    if (waypoints && waypoints.length > 0) {
      waypoints.forEach((wp, idx) => {
        console.log(`  Waypoint ${idx + 1}: ${wp.latitude},${wp.longitude}`);
      });
      console.log(`  Destination (last dropoff): ${destStr}`);
      
      // Build waypoints string - these are the INTERMEDIATE stops
      // Google Maps will show: Origin (A) → Waypoint 1 → Waypoint 2 → Destination (B)
      const waypointsStr = waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|');
      
      // Use the standard directions URL format
      // This shows the complete route with all markers visible
      const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&waypoints=${encodeURIComponent(waypointsStr)}&travelmode=driving`;
      
      console.log(`  Generated URL: ${webUrl}`);
      return webUrl;
    } else {
      console.log(`  Destination (last dropoff): ${destStr}`);
      // No intermediate waypoints - just origin to destination
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&travelmode=driving`;
    }
  }

  /**
   * Generate a Google Maps deep link that shows the COMPLETE route with ALL stops visible
   * This is better for passengers who want to SEE the entire route, not navigate it
   * 
   * Format: Uses multiple destinations so ALL points show as markers on the map
   */
  generateViewRouteDeepLink(
    allStops: Location[]
  ): string {
    if (allStops.length < 2) {
      return '';
    }

    // For viewing the complete route, we use the origin as first stop
    // and include ALL other stops either as waypoints or destination
    const origin = allStops[0];
    const destination = allStops[allStops.length - 1];
    const waypoints = allStops.slice(1, -1);

    const originStr = `${origin.latitude},${origin.longitude}`;
    const destStr = `${destination.latitude},${destination.longitude}`;

    console.log(`[GoogleMaps] Generating view route link with ${allStops.length} stops`);

    if (waypoints.length > 0) {
      const waypointsStr = waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|');
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&waypoints=${encodeURIComponent(waypointsStr)}&travelmode=driving`;
    } else {
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&travelmode=driving`;
    }
  }

  /**
   * Generate platform-specific navigation URLs
   * Returns different formats optimized for Android, iOS, and web
   *
   * IMPORTANT: When waypoints are present, ALL platforms use the universal
   * https://www.google.com/maps/dir/ URL format because:
   * - Android's google.navigation: scheme does NOT support waypoints
   * - iOS's comgooglemaps:// scheme is unreliable for multi-stop routes
   * The universal URL opens Google Maps app on both platforms when installed
   * and properly preserves the optimized waypoint order.
   */
  generatePlatformNavigationLinks(
    origin: Location,
    destination: Location,
    waypoints?: Location[]
  ): { universal: string; android: string; ios: string } {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destStr = `${destination.latitude},${destination.longitude}`;

    // Universal web URL (works everywhere, opens Google Maps app if installed)
    let universal: string;
    
    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|');
      universal = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&waypoints=${encodeURIComponent(waypointsStr)}&travelmode=driving`;
    } else {
      universal = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&travelmode=driving`;
    }

    let android: string;
    let ios: string;

    if (waypoints && waypoints.length > 0) {
      // Multi-stop route: use universal URL for all platforms
      // Native schemes (google.navigation:, comgooglemaps://) silently drop waypoints
      android = universal;
      ios = universal;
    } else {
      // Single destination: use native schemes for direct turn-by-turn navigation
      android = `google.navigation:q=${destStr}&mode=d`;
      ios = `comgooglemaps://?saddr=${originStr}&daddr=${destStr}&directionsmode=driving`;
    }

    return { universal, android, ios };
  }

  /**
   * Check if Google Maps API is configured and available
   *
   * @returns true if API key is configured
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

export const googleMapsService = new GoogleMapsService();
