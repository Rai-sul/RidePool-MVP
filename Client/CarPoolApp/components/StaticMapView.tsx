import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Linking, TouchableOpacity, Image, ActivityIndicator } from 'react-native';

interface StaticMapViewProps {
  center?: { latitude: number; longitude: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    icon?: 'pickup' | 'dropoff' | 'driver' | 'current' | 'default' | 'pool';
  }>;
  pickupLocation?: { latitude: number; longitude: number };
  dropoffLocation?: { latitude: number; longitude: number };
  showDirections?: boolean;
  style?: any;
  children?: React.ReactNode;
  // Props for combined route display
  routePolyline?: string;
  routeCoordinates?: Array<{ lat: number; lng: number }>;
}

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function StaticMapView({
  center = { latitude: 23.8103, longitude: 90.4125 },
  zoom = 14,
  markers = [],
  pickupLocation,
  dropoffLocation,
  showDirections = true,
  style,
  children,
  routePolyline,
  routeCoordinates,
}: StaticMapViewProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [routePath, setRoutePath] = useState<string | null>(null);

  // Use provided polyline OR fetch route from Google Directions API
  useEffect(() => {
    // If a pre-calculated polyline is provided, use it directly
    if (routePolyline) {
      setRoutePath(routePolyline);
      return;
    }

    // If route coordinates are provided but no polyline, skip fetching
    if (routeCoordinates && routeCoordinates.length > 0) {
      // We can't use coordinates directly with Static Maps API path encoding
      // So we'll just show markers without a path
      setRoutePath(null);
      return;
    }

    if (!showDirections || !pickupLocation || !dropoffLocation || !GOOGLE_MAPS_API_KEY) {
      setRoutePath(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${pickupLocation.latitude},${pickupLocation.longitude}&destination=${dropoffLocation.latitude},${dropoffLocation.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.routes && data.routes.length > 0 && data.routes[0].overview_polyline) {
          setRoutePath(data.routes[0].overview_polyline.points);
        } else {
          setRoutePath(null);
        }
      } catch (error) {
        console.error('Route fetch error:', error);
        setRoutePath(null);
      }
    };

    fetchRoute();
  }, [pickupLocation, dropoffLocation, showDirections, routePolyline, routeCoordinates]);

  const getStaticMapUrl = (): string => {
    const params = new URLSearchParams();
    
    // Calculate bounds from all markers and route
    const allPoints: Array<{ lat: number; lng: number }> = [];
    
    if (pickupLocation) {
      allPoints.push({ lat: pickupLocation.latitude, lng: pickupLocation.longitude });
    }
    if (dropoffLocation) {
      allPoints.push({ lat: dropoffLocation.latitude, lng: dropoffLocation.longitude });
    }
    markers.forEach(m => allPoints.push({ lat: m.latitude, lng: m.longitude }));
    if (routeCoordinates) {
      allPoints.push(...routeCoordinates);
    }

    if (allPoints.length > 1) {
      // Calculate center from all points
      const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
      const avgLng = allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length;
      params.append('center', `${avgLat},${avgLng}`);
      
      // Calculate zoom based on extent
      const latMin = Math.min(...allPoints.map(p => p.lat));
      const latMax = Math.max(...allPoints.map(p => p.lat));
      const lngMin = Math.min(...allPoints.map(p => p.lng));
      const lngMax = Math.max(...allPoints.map(p => p.lng));
      const maxDiff = Math.max(latMax - latMin, lngMax - lngMin);
      
      let calculatedZoom = 14;
      if (maxDiff > 0.15) calculatedZoom = 10;
      else if (maxDiff > 0.1) calculatedZoom = 11;
      else if (maxDiff > 0.05) calculatedZoom = 12;
      else if (maxDiff > 0.02) calculatedZoom = 13;
      
      params.append('zoom', String(calculatedZoom));
    } else if (pickupLocation && dropoffLocation) {
      const centerLat = (pickupLocation.latitude + dropoffLocation.latitude) / 2;
      const centerLng = (pickupLocation.longitude + dropoffLocation.longitude) / 2;
      params.append('center', `${centerLat},${centerLng}`);
      params.append('zoom', String(zoom));
    } else {
      params.append('center', `${center.latitude},${center.longitude}`);
      params.append('zoom', String(zoom));
    }
    
    params.append('size', '640x640');
    params.append('scale', '2');
    params.append('maptype', 'roadmap');

    // Add pickup/dropoff markers if not using combined route
    if (pickupLocation && !routePolyline && !routeCoordinates) {
      params.append('markers', `color:green|label:P|${pickupLocation.latitude},${pickupLocation.longitude}`);
    }
    if (dropoffLocation && !routePolyline && !routeCoordinates) {
      params.append('markers', `color:red|label:D|${dropoffLocation.latitude},${dropoffLocation.longitude}`);
    }

    // Add all custom markers with numbered labels
    markers.forEach((marker, idx) => {
      const color = marker.icon === 'driver' ? 'blue' : marker.icon === 'pickup' ? 'green' : marker.icon === 'dropoff' ? 'red' : 'orange';
      const label = String(idx + 1);
      params.append('markers', `color:${color}|label:${label}|${marker.latitude},${marker.longitude}`);
    });

    // Use encoded polyline path if available for accurate road route
    if (routePath) {
      params.append('path', `color:0x4285F4FF|weight:5|enc:${routePath}`);
    } else if (showDirections && pickupLocation && dropoffLocation && !routeCoordinates) {
      // Fallback to straight line only if no combined route
      params.append('path', `color:0x4285F4FF|weight:5|${pickupLocation.latitude},${pickupLocation.longitude}|${dropoffLocation.latitude},${dropoffLocation.longitude}`);
    }

    if (GOOGLE_MAPS_API_KEY) {
      params.append('key', GOOGLE_MAPS_API_KEY);
    }

    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  };

  const openInGoogleMaps = (): void => {
    const destination = dropoffLocation || center;
    let url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
    if (pickupLocation) {
      url += `&origin=${pickupLocation.latitude},${pickupLocation.longitude}`;
    }
    Linking.openURL(url);
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <Text style={styles.errorTitle}>Map Configuration Required</Text>
        <Text style={styles.errorText}>Google Maps API key is not configured</Text>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {imageLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      {imageError ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <Text style={styles.errorTitle}>Unable to load map</Text>
          <Text style={styles.errorText}>Check your internet connection</Text>
        </View>
      ) : (
        <Image
          source={{ uri: getStaticMapUrl() }}
          style={styles.mapImage}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false);
            setImageError(true);
          }}
        />
      )}

      <View style={styles.overlay}>
        {pickupLocation && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Pickup</Text>
            <Text style={styles.infoCoords}>
              {pickupLocation.latitude.toFixed(4)}, {pickupLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {dropoffLocation && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Destination</Text>
            <Text style={styles.infoCoords}>
              {dropoffLocation.latitude.toFixed(4)}, {dropoffLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.openButton} onPress={openInGoogleMaps}>
          <Text style={styles.openButtonText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f3f4f6',
  },
  mapImage: {
    flex: 1,
    width: '100%',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  infoCoords: {
    fontSize: 11,
    color: '#6b7280',
  },
  openButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  openButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
