import { SearchBox } from '@mapbox/search-js-react';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

export interface MapboxSearchResult {
  id: string;
  name: string;
  place_name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address?: string;
}

export interface MapboxRouteResponse {
  routes: Array<{
    duration: number;
    distance: number;
    geometry: {
      coordinates: Array<[number, number]>;
    };
  }>;
}

/**
 * Search for locations using Mapbox Geocoding API
 */
export async function searchLocation(query: string): Promise<MapboxSearchResult[]> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
    );
    
    if (!response.ok) {
      throw new Error('Failed to search location');
    }
    
    const data = await response.json();
    
    return data.features.map((feature: any) => ({
      id: feature.id,
      name: feature.text,
      place_name: feature.place_name,
      coordinates: {
        latitude: feature.center[1],
        longitude: feature.center[0],
      },
      address: feature.properties?.address,
    }));
  } catch (error) {
    console.error('Mapbox search error:', error);
    throw error;
  }
}

/**
 * Get route directions between two points using Mapbox Directions API
 */
export async function getRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  waypoints?: Array<{ latitude: number; longitude: number }>
): Promise<MapboxRouteResponse> {
  try {
    let coordinates = `${origin.longitude},${origin.latitude}`;
    
    if (waypoints && waypoints.length > 0) {
      waypoints.forEach(wp => {
        coordinates += `;${wp.longitude},${wp.latitude}`;
      });
    }
    
    coordinates += `;${destination.longitude},${destination.latitude}`;
    
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to get route');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Mapbox route error:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to reverse geocode');
    }
    
    const data = await response.json();
    return data.features[0]?.place_name || 'Unknown location';
  } catch (error) {
    console.error('Mapbox reverse geocode error:', error);
    throw error;
  }
}

export { MAPBOX_TOKEN };
