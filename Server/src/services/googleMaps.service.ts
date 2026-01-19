import { Location } from "../types";
import { config } from "../config/env";

// ============================================
// GOOGLE MAPS API TYPES
// ============================================

export interface GoogleMapsRoute {
  distance: number; // Distance in kilometers
  duration: number; // Duration in minutes
  geometry: {
    encoded: string; // Encoded polyline for map display
    coordinates: Array<{ lat: number; lng: number }>; // Decoded coordinates
  };
  bounds: {
    northeast: Location;
    southwest: Location;
  };
  steps?: RouteStep[]; // Turn-by-turn directions (optional)
}

export interface RouteStep {
  distance: number; // Distance in meters
  duration: number; // Duration in seconds
  instruction: string; // Human-readable instruction
  polyline: string; // Encoded polyline for this step
}

export interface GoogleMapsDirectionsResponse {
  routes: Array<{
    legs: Array<{
      distance: { value: number; text: string }; // Distance in meters
      duration: { value: number; text: string }; // Duration in seconds
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
  }>;
  status: string;
  error_message?: string;
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

      // Use the first route (best route)
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

      // Decode polyline (simplified - you might want to use a library like @mapbox/polyline)
      const coordinates = this.decodePolyline(route.overview_polyline.points);

      // Extract steps if available
      const steps: RouteStep[] = leg.steps.map((step) => ({
        distance: step.distance.value / 1000, // Convert to km
        duration: step.duration.value / 60, // Convert to minutes
        instruction: this.stripHtmlTags(step.html_instructions),
        polyline: step.polyline.points,
      }));

      return {
        distance: totalDistance / 1000, // Convert meters to kilometers
        duration: Math.round(totalDuration / 60), // Convert seconds to minutes
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
      };
    } catch (error) {
      console.error("[GoogleMapsService] Error fetching route:", error);
      return null;
    }
  }

  /**
   * Get distance and duration between two points (simplified version)
   *
   * @param origin - Starting location
   * @param destination - Ending location
   * @returns Object with distance (km) and duration (minutes)
   */
  async getDistance(
    origin: Location,
    destination: Location
  ): Promise<{ distance: number; duration: number } | null> {
    const route = await this.getRoute(origin, destination);
    if (!route) {
      return null;
    }

    return {
      distance: route.distance,
      duration: route.duration,
    };
  }

  /**
   * Decode Google Maps polyline string to coordinates
   * Simplified implementation - for production, consider using @mapbox/polyline
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
   * Check if Google Maps API is configured and available
   *
   * @returns true if API key is configured
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

export const googleMapsService = new GoogleMapsService();
