import { Location, RouteInfo, GeocodingResult } from './maps.model';
import * as h3 from 'h3-js';

// Mock data for demonstration
const mockLocations: { [key: string]: Location } = {
  'Dhaka': { lat: 23.7776, lng: 90.3994, address: 'Dhaka, Bangladesh' },
  'Chittagong': { lat: 22.3569, lng: 91.7864, address: 'Chittagong, Bangladesh' },
  'Gulshan 1': { lat: 23.7897, lng: 90.4000, address: 'Gulshan 1, Dhaka' },
  'Mirpur 10': { lat: 23.8069, lng: 90.3675, address: 'Mirpur 10, Dhaka' },
};

export const geocodeAddress = async (address: string): Promise<GeocodingResult | undefined> => {
  // In a real application, this would call a geocoding API
  const lowerCaseAddress = address.toLowerCase();
  for (const key in mockLocations) {
    if (key.toLowerCase().includes(lowerCaseAddress) || mockLocations[key].address?.toLowerCase().includes(lowerCaseAddress)) {
      return { address: mockLocations[key].address || address, location: mockLocations[key] };
    }
  }
  return undefined;
};

export const reverseGeocode = async (location: Location): Promise<GeocodingResult | undefined> => {
  // In a real application, this would call a reverse geocoding API
  // For mock, just return a predefined address if coordinates match closely
  if (location.lat === 23.7776 && location.lng === 90.3994) {
    return { address: 'Dhaka, Bangladesh', location };
  }
  return undefined;
};

export const calculateRoute = async (origin: Location, destination: Location): Promise<RouteInfo | undefined> => {
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
    polyline: 'mock_polyline_string', // Placeholder
  };
};

export const getH3Index = (location: Location, resolution: number = 8): string => {
  return h3.geoToH3(location.lat, location.lng, resolution);
};

export const getKRing = (h3Index: string, k: number = 1): string[] => {
  return h3.kRing(h3Index, k);
};