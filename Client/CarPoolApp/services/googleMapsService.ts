const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface GoogleMapsSearchResult {
  id: string;
  name: string;
  place_name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address?: string;
}

export interface GoogleMapsRouteResponse {
  routes: Array<{
    duration: number;
    distance: number;
    geometry: {
      coordinates: Array<[number, number]>;
    };
  }>;
}

/**
 * Search for locations using Google Maps Places API
 */
export async function searchLocation(query: string): Promise<GoogleMapsSearchResult[]> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to search location');
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error('Failed to search location');
    }
    
    return (data.results || []).slice(0, 5).map((result: any) => ({
      id: result.place_id,
      name: result.name,
      place_name: result.formatted_address,
      coordinates: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      },
      address: result.formatted_address,
    }));
  } catch (error) {
    console.error('Google Maps search error:', error);
    throw error;
  }
}

/**
 * Get route directions between two points using Google Maps Directions API
 */
export async function getRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  waypoints?: Array<{ latitude: number; longitude: number }>
): Promise<GoogleMapsRouteResponse> {
  try {
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    
    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints
        .map(wp => `${wp.latitude},${wp.longitude}`)
        .join('|');
      url += `&waypoints=${encodeURIComponent(waypointsStr)}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to get route');
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error('Failed to get route');
    }
    
    // Transform Google Maps response to match expected format
    return {
      routes: data.routes.map((route: any) => {
        const leg = route.legs[0];
        const coordinates = decodePolyline(route.overview_polyline.points);
        return {
          duration: leg.duration.value, // in seconds
          distance: leg.distance.value, // in meters
          geometry: {
            coordinates: coordinates.map((coord: { lat: number; lng: number }) => [coord.lng, coord.lat]),
          },
        };
      }),
    };
  } catch (error) {
    console.error('Google Maps route error:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to address using Google Maps Geocoding API
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to reverse geocode');
    }
    
    const data = await response.json();
    return data.results[0]?.formatted_address || 'Unknown location';
  } catch (error) {
    console.error('Google Maps reverse geocode error:', error);
    throw error;
  }
}

/**
 * Decode Google Maps polyline string to coordinates
 */
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
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
 * Generate a Google Maps app deep link for FREE real-time navigation
 * Opens the user's Google Maps app with the route pre-loaded
 * This is 100% FREE - no API cost!
 * 
 * @param origin - Starting location (driver's current position)
 * @param destination - Final destination
 * @param waypoints - Optional pickup/dropoff points along the way
 * @returns URL string that opens Google Maps app
 */
export function generateNavigationDeepLink(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  waypoints?: Array<{ latitude: number; longitude: number }>
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
 * Open Google Maps app for navigation (React Native / Expo)
 * Call this when the driver taps "Start Navigation"
 * 
 * @param origin - Driver's current location
 * @param destination - Final destination
 * @param waypoints - Pickup points along the way (in optimized order)
 */
export async function openGoogleMapsNavigation(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  waypoints?: Array<{ latitude: number; longitude: number }>
): Promise<void> {
  const url = generateNavigationDeepLink(origin, destination, waypoints);
  
  // Use Linking for React Native / Expo
  const { Linking } = require('react-native');
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // Fallback: try opening as web URL
    await Linking.openURL(url);
  }
}

export { GOOGLE_MAPS_API_KEY };
