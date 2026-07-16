import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import StaticMapView from './StaticMapView';

const isExpoGo = Constants.appOwnership === 'expo';

let NativeMapView: any = null;
let NativeMarker: any = null;
let NativePolyline: any = null;
let PROVIDER_GOOGLE: any = null;

if (!isExpoGo) {
  try {
    const RNMaps = require('react-native-maps');
    NativeMapView = RNMaps.default;
    NativeMarker = RNMaps.Marker;
    NativePolyline = RNMaps.Polyline;
    PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE;
  } catch (e) {
    console.log('react-native-maps not available');
  }
}

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  icon?: 'pickup' | 'dropoff' | 'driver' | 'current' | 'default' | 'pool';
}

interface GoogleMapViewProps {
  center?: { latitude: number; longitude: number };
  zoom?: number;
  markers?: MarkerData[];
  pickupLocation?: { latitude: number; longitude: number };
  dropoffLocation?: { latitude: number; longitude: number };
  showDirections?: boolean;
  style?: any;
  children?: React.ReactNode;
  showUserLocation?: boolean;
  // New props for combined route display
  routePolyline?: string; // Pre-calculated encoded polyline
  routeCoordinates?: Array<{ lat: number; lng: number }>; // Pre-calculated coordinates
}

const markerColors: Record<string, string> = {
  pickup: '#22C55E',
  dropoff: '#EF4444',
  driver: '#3B82F6',
  current: '#3B82F6',
  default: '#F59E0B',
  pool: '#8B5CF6', // Purple for pool location
};

export default function GoogleMapView({
  center,
  zoom = 14,
  markers = [],
  pickupLocation,
  dropoffLocation,
  showDirections = true,
  style,
  children,
  showUserLocation = true,
  routePolyline,
  routeCoordinates,
}: GoogleMapViewProps) {
  const mapRef = useRef<any>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    center || null
  );
  const [loading, setLoading] = useState(!center);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);

  useEffect(() => {
    if (center) {
      setLocation(center);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocation({ latitude: 23.8103, longitude: 90.4125 });
          setLoading(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (error) {
        console.log('Location error:', error);
        setLocation({ latitude: 23.8103, longitude: 90.4125 });
      } finally {
        setLoading(false);
      }
    })();
  }, [center]);

  // Use provided route coordinates/polyline OR fetch from Google Maps
  useEffect(() => {
    if (isExpoGo || !NativeMapView) return;

    // If pre-calculated polyline is provided AND not empty, decode and use it
    if (routePolyline && routePolyline.length > 0) {
      const points = decodePolyline(routePolyline);
      if (points.length > 0) {
        setRouteCoords(points);
        return;
      }
    }

    // If pre-calculated coordinates are provided, use them directly
    // This handles both the "fallback route" (straight lines) and real coordinates
    if (routeCoordinates && routeCoordinates.length > 0) {
      const points = routeCoordinates.map(coord => ({
        latitude: coord.lat,
        longitude: coord.lng,
      }));
      setRouteCoords(points);
      return;
    }

    // Fallback: fetch route from Google Maps if showDirections is enabled
    if (!showDirections || !pickupLocation || !dropoffLocation) {
      setRouteCoords([]);
      return;
    }

    const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) {
      setRouteCoords([pickupLocation, dropoffLocation]);
      return;
    }

    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${pickupLocation.latitude},${pickupLocation.longitude}&destination=${dropoffLocation.latitude},${dropoffLocation.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const points = decodePolyline(data.routes[0].overview_polyline.points);
          setRouteCoords(points);
        } else {
          setRouteCoords([pickupLocation, dropoffLocation]);
        }
      } catch (error) {
        console.error('Route fetch error:', error);
        setRouteCoords([pickupLocation, dropoffLocation]);
      }
    };

    fetchRoute();
  }, [pickupLocation, dropoffLocation, showDirections, routePolyline, routeCoordinates]);

  // Fit map to show all markers and route
  useEffect(() => {
    if (isExpoGo || !NativeMapView) return;
    if (!mapRef.current) return;

    // Collect all coordinates to fit
    const allCoords: Array<{ latitude: number; longitude: number }> = [];

    // Add route coordinates
    if (routeCoords.length > 0) {
      allCoords.push(...routeCoords);
    }

    // Add pickup and dropoff
    if (pickupLocation) allCoords.push(pickupLocation);
    if (dropoffLocation) allCoords.push(dropoffLocation);

    // Add marker locations
    markers.forEach(marker => {
      allCoords.push({ latitude: marker.latitude, longitude: marker.longitude });
    });

    // Fit to all coordinates if we have any
    if (allCoords.length > 1) {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    } else if (allCoords.length === 1) {
      // Single point, just center on it
      mapRef.current.animateToRegion({
        latitude: allCoords[0].latitude,
        longitude: allCoords[0].longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  }, [pickupLocation, dropoffLocation, routeCoords, markers]);

  if (isExpoGo || !NativeMapView) {
    return (
      <StaticMapView
        center={location || center || { latitude: 23.8103, longitude: 90.4125 }}
        zoom={zoom}
        markers={markers}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        showDirections={showDirections}
        style={style}
        routePolyline={routePolyline}
        routeCoordinates={routeCoordinates}
      >
        {children}
      </StaticMapView>
    );
  }

  if (loading || !location) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.loadingText}>Loading map...</Text>
        {children}
      </View>
    );
  }

  const latitudeDelta = 0.01 * (15 - zoom);
  const longitudeDelta = 0.01 * (15 - zoom);

  return (
    <View style={[styles.container, style]}>
      <NativeMapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: Math.max(0.005, latitudeDelta),
          longitudeDelta: Math.max(0.005, longitudeDelta),
        }}
        showsUserLocation={showUserLocation}
        showsMyLocationButton
        showsCompass
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        zoomControlEnabled={true}
      >
        {routeCoords.length > 1 && (
          <NativePolyline coordinates={routeCoords} strokeColor="#4285F4" strokeWidth={5} />
        )}

        {pickupLocation && (
          <NativeMarker
            coordinate={pickupLocation}
            title="Pickup"
            pinColor={markerColors.pickup}
          />
        )}

        {dropoffLocation && (
          <NativeMarker
            coordinate={dropoffLocation}
            title="Destination"
            pinColor={markerColors.dropoff}
          />
        )}

        {markers.map((marker) => (
          <NativeMarker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
            pinColor={markerColors[marker.icon || 'default']}
          />
        ))}
      </NativeMapView>
      {children}
    </View>
  );
}

function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
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

    points.push({
      latitude: lat * 1e-5,
      longitude: lng * 1e-5,
    });
  }

  return points;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
