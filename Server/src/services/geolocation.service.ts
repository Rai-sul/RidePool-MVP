import { Location } from '../types';
import { h3Utils } from '../utils/h3.utils';

export class GeolocationService {
  async validateLocation(location: Location): Promise<boolean> {
    // Basic validation
    if (location.latitude < -90 || location.latitude > 90) {
      return false;
    }
    if (location.longitude < -180 || location.longitude > 180) {
      return false;
    }
    return true;
  }

  /**
   * Calculate route with H3 hexagon tracking
   */
  async calculateRoute(pickup: Location, dropoff: Location) {
    try {
      // Get H3 indices for both locations (resolution 9 for pickup, 7 for destination)
      const pickupH3 = h3Utils.latLngToH3(pickup, 9);
      const dropoffH3 = h3Utils.latLngToH3(dropoff, 7);
      
      // Get route hexagons along the path
      const routeHexagons = h3Utils.getRouteH3Indices(pickup, dropoff, 7);

      return {
        pickup,
        dropoff,
        pickupH3,
        dropoffH3,
        routeH3Indices: routeHexagons,
        hexagonsCount: routeHexagons.length,
      };
    } catch (error) {
      console.error('Error calculating route:', error);
      return null;
    }
  }

  /**
   * Get H3 index for a location
   */
  getLocationH3Index(location: Location, resolution: number = 7): string {
    return h3Utils.latLngToH3(location, resolution);
  }
}

export const geolocationService = new GeolocationService();