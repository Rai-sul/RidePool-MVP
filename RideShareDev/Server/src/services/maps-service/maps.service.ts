import { Location, RouteInfo, GeocodingResult } from './maps.model';
import * as h3 from 'h3-js';

// Mock data for demonstration (will be replaced or augmented)
const mockLocations: { [key: string]: Location } = {
  'Dhaka': { lat: 23.7776, lng: 90.3994, address: 'Dhaka, Bangladesh' },
  'Chittagong': { lat: 22.3569, lng: 91.7864, address: 'Chittagong, Bangladesh' },
  'Gulshan 1': { lat: 23.7897, lng: 90.4000, address: 'Gulshan 1, Dhaka' },
  'Mirpur 10': { lat: 23.8069, lng: 90.3675, address: 'Mirpur 10, Dhaka' },
};

// In-memory cache for H3 indices
const h3Cache = new Map<string, string>();

export class MapsService {
  async geocode(address: string): Promise<GeocodingResult | undefined> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(address)}&format=json&countrycodes=bd`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const firstResult = data[0];
        return {
          address: firstResult.display_name,
          location: { lat: parseFloat(firstResult.lat), lng: parseFloat(firstResult.lon) },
        };
      }
    } catch (error) {
      console.error('Error geocoding with OpenStreetMap Nominatim:', error);
    }
    // Fallback to mock data if API fails or no result
    const lowerCaseAddress = address.toLowerCase();
    for (const key in mockLocations) {
      if (key.toLowerCase().includes(lowerCaseAddress) || mockLocations[key].address?.toLowerCase().includes(lowerCaseAddress)) {
        return { address: mockLocations[key].address || address, location: mockLocations[key] };
      }
    }
    return undefined;
  }

  async reverseGeocode(location: Location): Promise<GeocodingResult | undefined> {
    // In a real application, this would call a reverse geocoding API
    // For mock, just return a predefined address if coordinates match closely
    if (location.lat === 23.7776 && location.lng === 90.3994) {
      return { address: 'Dhaka, Bangladesh', location };
    }
    return undefined;
  }

  async getRoute(origin: Location, destination: Location): Promise<RouteInfo | undefined> {
    // In a real application, this would call a routing API
    // Simple Euclidean distance for mock
    const distance = Math.sqrt(
      Math.pow(origin.lat - destination.lat, 2) + Math.pow(origin.lng - destination.lng, 2)
    ) * 111; // Rough conversion to km (1 degree lat ~ 111 km)

    const duration = distance * 2; // Mock: 2 minutes per km

    return {
      origin,
      destination,
      distance: parseFloat(distance.toFixed(2)),
      duration: parseFloat(duration.toFixed(2)),
      path: [], // Placeholder for path
      polyline: 'mock_polyline_string', // Placeholder
    };
  }

  getH3Index(location: Location, resolution: number = 8): string {
    const cacheKey = `${location.lat},${location.lng},${resolution}`;
    if (h3Cache.has(cacheKey)) {
      return h3Cache.get(cacheKey)!;
    }
    const index = h3.geoToH3(location.lat, location.lng, resolution);
    h3Cache.set(cacheKey, index);
    return index;
  }

  getKRing(h3Index: string, k: number = 1): string[] {
    return h3.kRing(h3Index, k);
  }
}
