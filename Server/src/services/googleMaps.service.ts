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
  summary?: string; // Route summary (e.g., "via Mirpur Road")
  trafficLevel: 'low' | 'moderate' | 'high'; // Traffic level based on duration difference
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

// ============================================
// GOOGLE MAPS SERVICE
// ============================================

export class GoogleMapsService {
  private readonly baseUrl =
    "https://maps.googleapis.com/maps/api/directions/json";
  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.googleMaps.apiKey;
    if (!this.apiKey) {
      console.warn(
        "[GoogleMapsService] Warning: GOOGLE_MAPS_API_KEY not configured. Google Maps features will be disabled."
      );
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
    // ========================================
    // COST OPTIMIZATION: Check cache first
    // Uses H3 Resolution 7 (~5.2km) for destination-level grouping
    // This groups nearby routes together to maximize cache hits
    // ========================================
    const originH3 = h3Utils.latLngToH3(origin, H3_RESOLUTION.DESTINATION);
    const destH3 = h3Utils.latLngToH3(destination, H3_RESOLUTION.DESTINATION);
    
    let cacheKey = `route:best:${originH3}:${destH3}`;
    if (waypoints && waypoints.length > 0) {
      // Include waypoints in cache key (sorted by H3 to maximize cache hits)
      const waypointsKey = waypoints
        .map(wp => h3Utils.latLngToH3(wp, H3_RESOLUTION.DESTINATION))
        .sort()
        .join('-');
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
  private calculateTrafficLevel(
    baseDuration: number,
    trafficDuration: number
  ): 'low' | 'moderate' | 'high' {
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
   * Opens the Google Maps app on the driver's phone - NO API COST
   * 
   * @param origin - Starting location (driver's current position)
   * @param destination - Final destination
   * @param waypoints - Optional pickup/dropoff points along the way
   * @returns URL string to open Google Maps app
   */
  generateNavigationDeepLink(
    origin: Location,
    destination: Location,
    waypoints?: Location[]
  ): string {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destStr = `${destination.latitude},${destination.longitude}`;
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&travelmode=driving`;

    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints
        .map(wp => `${wp.latitude},${wp.longitude}`)
        .join('|');
      url += `&waypoints=${encodeURIComponent(waypointsStr)}`;
    }

    return url;
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
