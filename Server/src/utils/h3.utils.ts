
import * as h3 from 'h3-js';
import { Location, Pool, Ride } from '../types';
import { config } from '../config/env';

/**
 * H3 Resolution levels
 * Res 7: ~5.2 km (destination matching)
 * Res 8: ~461 m (driver search)
 * Res 9: ~174 m (pickup matching)
 */
export const H3_RESOLUTION = {
  DESTINATION: 7,    // For pool/ride destination matching
  DRIVER_SEARCH: 8,  // For finding nearby drivers
  PICKUP: 9,         // For precise pickup location matching
} as const;

export interface H3SearchOptions {
  latitude: number;
  longitude: number;
  resolution: number;
  ringRadius: number;
}

export interface H3DistanceResult {
  distance: number;  // Grid distance in hexagons
  hexagon1: string;
  hexagon2: string;
  resolution: number;
}

export class H3Utils {
  /**
   * Convert a location (lat, lng) to H3 hexagon index at specified resolution
   * 
   * @param location - Location with latitude and longitude
   * @param resolution - H3 resolution (7-9 recommended)
   * @returns H3 hexagon index string
   */
  latLngToH3(location: Location, resolution: number = H3_RESOLUTION.DESTINATION): string {
    try {
      return h3.latLngToCell(location.latitude, location.longitude, resolution);
    } catch (error) {
      console.error(
        `[H3Utils] Error converting location to H3: lat=${location.latitude}, lng=${location.longitude}`,
        error
      );
      throw new Error('Invalid location coordinates for H3 conversion');
    }
  }

  /**
   * Convert H3 hexagon index to center location
   * 
   * @param h3Index - H3 hexagon index
   * @returns Location object with latitude and longitude
   */
  h3ToLatLng(h3Index: string): Location {
    try {
      const [lat, lng] = h3.cellToLatLng(h3Index);
      return {
        latitude: lat,
        longitude: lng,
      };
    } catch (error) {
      console.error(`[H3Utils] Error converting H3 to location: ${h3Index}`, error);
      throw new Error('Invalid H3 index');
    }
  }

  /**
   * Get H3 indices for a route (path of hexagons between two points)
   * 
   * @param startLocation - Starting location
   * @param endLocation - Ending location
   * @param resolution - H3 resolution
   * @returns Array of H3 hexagon indices along the route
   */
  getRouteH3Indices(
    startLocation: Location,
    endLocation: Location,
    resolution: number = H3_RESOLUTION.DESTINATION
  ): string[] {
    try {
      const startHex = this.latLngToH3(startLocation, resolution);
      const endHex = this.latLngToH3(endLocation, resolution);

      // Get line between two hexagons
      try {
        const line = h3.gridPathCells(startHex, endHex);
        return line;
      } catch {
        // Fallback: if path is unavailable, return start and end
        return [startHex, endHex];
      }
    } catch (error) {
      console.error('[H3Utils] Error generating route H3 indices', error);
      return [];
    }
  }

  /**
   * Get all hexagons within a k-distance ring (disk) from a center hexagon
   * 
   * @param h3Index - Center hexagon
   * @param ringRadius - Ring radius (k value)
   * @returns Array of H3 hexagon indices
   */
  getH3Ring(h3Index: string, ringRadius: number = 1): string[] {
    try {
      return h3.gridDisk(h3Index, ringRadius);
    } catch (error) {
      console.error(
        `[H3Utils] Error getting H3 ring: ${h3Index}, radius: ${ringRadius}`,
        error
      );
      return [h3Index]; // Return center if error
    }
  }

  /**
   * Get hexagons in a ring (not including center)
   * Useful for boundary searches
   * 
   * @param h3Index - Center hexagon
   * @param ringRadius - Ring radius
   * @returns Array of H3 hexagon indices (excluding center)
   */
  getH3RingBoundary(h3Index: string, ringRadius: number = 1): string[] {
    try {
      return h3.gridRing(h3Index, ringRadius);
    } catch (error) {
      console.error(`[H3Utils] Error getting H3 ring boundary: ${h3Index}`, error);
      return [];
    }
  }

  /**
   * Calculate grid distance between two H3 hexagons
   * 
   * @param hex1 - First H3 hexagon
   * @param hex2 - Second H3 hexagon
   * @returns Grid distance in hexagons
   */
  getH3Distance(hex1: string, hex2: string): number {
    try {
      return h3.gridDistance(hex1, hex2);
    } catch (error) {
      console.error(`[H3Utils] Error calculating H3 distance: ${hex1} -> ${hex2}`, error);
      return -1;
    }
  }

  /**
   * Find common hexagons between two sets of H3 indices
   * 
   * @param hexagons1 - First set of hexagons
   * @param hexagons2 - Second set of hexagons
   * @returns Array of common hexagon indices
   */
  getCommonHexagons(hexagons1: string[], hexagons2: string[]): string[] {
    const set2 = new Set(hexagons2);
    return hexagons1.filter(hex => set2.has(hex));
  }

  /**
   * Get search area hexagons from a central hexagon
   * Used for proximity searches (drivers, pools, etc.)
   * 
   * @param h3Index - Center hexagon
   * @param searchRadius - Ring radius for search area
   * @returns Array of H3 hexagon indices in search area
   */
  getSearchAreaHexagons(h3Index: string, searchRadius: number = 2): string[] {
    return this.getH3Ring(h3Index, searchRadius);
  }

  /**
   * Check if two H3 indices are exactly the same
   * 
   * @param hex1 - First hexagon
   * @param hex2 - Second hexagon
   * @returns true if same hexagon
   */
  isSameHexagon(hex1: string, hex2: string): boolean {
    return hex1 === hex2;
  }

  /**
   * Get all hexagons along a ride's route
   * Combines pickup area and destination area hexagons
   * 
   * @param ride - The ride with pickup and dropoff locations
   * @returns Array of H3 hexagon indices for the route
   */
  getRideRouteHexagons(ride: Ride): string[] {
    const pickupLocation: Location = {
      latitude: ride.pickup_lat,
      longitude: ride.pickup_lng,
    };
    const dropoffLocation: Location = {
      latitude: ride.dropoff_lat,
      longitude: ride.dropoff_lng,
    };

    // Get hexagons at both resolutions used in schema
    const pickupHex9 = this.latLngToH3(pickupLocation, H3_RESOLUTION.PICKUP);
    const dropoffHex7 = this.latLngToH3(dropoffLocation, H3_RESOLUTION.DESTINATION);

    // Get rings around both locations
    const pickupRing = this.getH3Ring(pickupHex9, 2); // ~350m radius
    const dropoffRing = this.getH3Ring(dropoffHex7, 1); // ~5.2km radius

    // Combine and deduplicate
    return Array.from(new Set([...pickupRing, ...dropoffRing]));
  }

  /**
   * Get all hexagons along a pool's destination area
   * 
   * @param pool - The pool with destination
   * @returns Array of H3 hexagon indices
   */
  getPoolDestinationHexagons(pool: Pool): string[] {
    const destination: Location = {
      latitude: pool.destination_lat,
      longitude: pool.destination_lng,
    };

    const destHex7 = this.latLngToH3(destination, H3_RESOLUTION.DESTINATION);
    return this.getH3Ring(destHex7, 2); // Wider search area
  }

  /**
   * Calculate route overlap as a percentage (0-100)
   * Compares common hexagons in both routes
   * 
   * @param rideStartLocation - Ride pickup location
   * @param rideEndLocation - Ride dropoff location
   * @param poolDestinationLocation - Pool destination location
   * @returns Overlap percentage (0-100)
   */
  calculateRouteOverlapPercentage(
    rideStartLocation: Location,
    rideEndLocation: Location,
    poolDestinationLocation: Location
  ): number {
    try {
      // Get route hexagons at resolution 7 (destination level)
      const rideRoute = this.getRouteH3Indices(
        rideStartLocation,
        rideEndLocation,
        H3_RESOLUTION.DESTINATION
      );

      // Get pool destination hexagons
      const poolDest = this.latLngToH3(poolDestinationLocation, H3_RESOLUTION.DESTINATION);
      const poolDestRing = this.getH3Ring(poolDest, 2);

      if (rideRoute.length === 0) {
        return 0;
      }

      // Calculate overlap
      const commonHexagons = this.getCommonHexagons(rideRoute, poolDestRing);
      const overlapPercentage = (commonHexagons.length / rideRoute.length) * 100;

      return Math.min(100, Math.max(0, overlapPercentage));
    } catch (error) {
      console.error('[H3Utils] Error calculating route overlap', error);
      return 0;
    }
  }

  /**
   * Check if a ride destination is within acceptable range of pool destination
   * 
   * @param rideDestination - Ride dropoff location
   * @param poolDestination - Pool destination location
   * @param maxDistanceHexagons - Maximum hexagon distance (grid distance)
   * @returns true if within range
   */
  isDestinationWithinRange(
    rideDestination: Location,
    poolDestination: Location,
    maxDistanceHexagons: number = 5
  ): boolean {
    try {
      const rideDestHex = this.latLngToH3(rideDestination, H3_RESOLUTION.DESTINATION);
      const poolDestHex = this.latLngToH3(poolDestination, H3_RESOLUTION.DESTINATION);

      const distance = this.getH3Distance(rideDestHex, poolDestHex);
      return distance >= 0 && distance <= maxDistanceHexagons;
    } catch (error) {
      console.error('[H3Utils] Error checking destination range', error);
      return false;
    }
  }

  /**
   * Get search hexagons for matching (convenience method)
   * 
   * @param location - Search center location
   * @param radius - Ring radius
   * @returns Array of H3 hexagon indices
   */
  getSearchHexagons(location: Location, radius: number = 2): string[] {
    try {
      const centerHex = this.latLngToH3(location, H3_RESOLUTION.DESTINATION);
      return this.getSearchAreaHexagons(centerHex, radius);
    } catch (error) {
      console.error('[H3Utils] Error getting search hexagons', error);
      return [];
    }
  }

  /**
   * Get driver search hexagons at resolution 8 for optimal driver proximity
   * 
   * @param location - Search center location
   * @param radius - Ring radius
   * @returns Array of H3 hexagon indices at resolution 8
   */
  getDriverSearchHexagons(location: Location, radius: number = 2): string[] {
    try {
      const centerHex = this.latLngToH3(location, H3_RESOLUTION.DRIVER_SEARCH);
      return this.getSearchAreaHexagons(centerHex, radius);
    } catch (error) {
      console.error('[H3Utils] Error getting driver search hexagons', error);
      return [];
    }
  }

  /**
   * Get pickup match hexagons at resolution 9 for precise matching
   * 
   * @param location - Pickup location
   * @param radius - Ring radius
   * @returns Array of H3 hexagon indices at resolution 9
   */
  getPickupMatchHexagons(location: Location, radius: number = 1): string[] {
    try {
      const centerHex = this.latLngToH3(location, H3_RESOLUTION.PICKUP);
      return this.getSearchAreaHexagons(centerHex, radius);
    } catch (error) {
      console.error('[H3Utils] Error getting pickup match hexagons', error);
      return [];
    }
  }

  /**
   * Get extended neighbors for wider geographic search
   * Used when initial pool search doesn't find matches
   * 
   * @param h3Index - Center H3 hexagon index
   * @param ringDistance - How many rings to expand (default 2)
   * @returns Array of H3 hexagon indices in extended area
   */
  getExtendedNeighbors(h3Index: string, ringDistance: number = 2): string[] {
    try {
      // Get all hexagons within the extended ring distance
      return h3.gridDisk(h3Index, ringDistance);
    } catch (error) {
      console.error(`[H3Utils] Error getting extended neighbors: ${h3Index}`, error);
      return [h3Index];
    }
  }
}

export const h3Utils = new H3Utils();