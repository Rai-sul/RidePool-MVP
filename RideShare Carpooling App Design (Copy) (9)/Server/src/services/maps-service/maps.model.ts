export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface RouteInfo {
  origin: Location;
  destination: Location;
  distance: number; // in kilometers
  duration: number; // in minutes
  path: Location[];
  polyline: string; // encoded polyline for the route
}

export interface GeocodingResult {
  address: string;
  location: Location;
}