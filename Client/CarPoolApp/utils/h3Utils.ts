import { latLngToCell, cellToBoundary, gridDisk, cellToLatLng } from 'h3-js';

export const H3_RESOLUTION = 9; // ~0.1km² hexagons

export interface H3Index {
  hex: string;
  lat: number;
  lng: number;
}

/**
 * Convert latitude/longitude to H3 hexagon index
 */
export function getH3Index(lat: number, lng: number, resolution: number = H3_RESOLUTION): string {
  return latLngToCell(lat, lng, resolution);
}

/**
 * Get boundary coordinates of an H3 hexagon
 */
export function getH3Boundary(h3Index: string): Array<[number, number]> {
  return cellToBoundary(h3Index, true) as Array<[number, number]>;
}

/**
 * Get nearby hexagons within a certain radius (k-ring)
 */
export function getNearbyHexagons(h3Index: string, ringSize: number = 1): string[] {
  return gridDisk(h3Index, ringSize);
}

/**
 * Convert H3 index back to lat/lng
 */
export function h3ToLatLng(h3Index: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(h3Index);
  return { lat, lng };
}

/**
 * Calculate H3 hexagons for a route (array of coordinates)
 */
export function calculateRouteHexagons(
  coordinates: Array<{ lat: number; lng: number }>,
  resolution: number = H3_RESOLUTION
): string[] {
  const hexSet = new Set<string>();
  
  coordinates.forEach(coord => {
    const hex = getH3Index(coord.lat, coord.lng, resolution);
    hexSet.add(hex);
    
    // Add neighboring hexagons for better coverage
    const neighbors = getNearbyHexagons(hex, 1);
    neighbors.forEach(n => hexSet.add(n));
  });
  
  return Array.from(hexSet);
}

/**
 * Check if two H3 indices are within a certain distance
 */
export function areHexagonsNearby(hex1: string, hex2: string, maxDistance: number = 2): boolean {
  const nearby = getNearbyHexagons(hex1, maxDistance);
  return nearby.includes(hex2);
}
