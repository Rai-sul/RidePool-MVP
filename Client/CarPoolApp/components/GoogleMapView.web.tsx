import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { View, StyleSheet } from 'react-native-web';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  icon?: 'pickup' | 'dropoff' | 'driver' | 'current' | 'default';
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
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const markerIcons: Record<string, string> = {
  pickup: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  dropoff: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
  driver: 'https://maps.google.com/mapfiles/kml/shapes/cabs.png',
  current: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  default: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
};

export default function GoogleMapView({
  center = { latitude: 23.8103, longitude: 90.4125 },
  zoom = 14,
  markers = [],
  pickupLocation,
  dropoffLocation,
  showDirections = true,
  style,
  children,
}: GoogleMapViewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Fetch directions when pickup and dropoff are provided and map is loaded
  useEffect(() => {
    if (!isLoaded || !showDirections || !pickupLocation || !dropoffLocation) {
      return;
    }

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
        destination: { lat: dropoffLocation.latitude, lng: dropoffLocation.longitude },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  }, [pickupLocation, dropoffLocation, showDirections, isLoaded]);

  const mapCenter = {
    lat: center.latitude,
    lng: center.longitude,
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View style={[styles.placeholder, style]}>
        <span style={{ color: '#6b7280', fontSize: 14 }}>
          Google Maps API key not configured
        </span>
        {children}
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.placeholder, style]}>
        <span style={{ color: '#ef4444', fontSize: 14 }}>
          Error loading Google Maps
        </span>
        {children}
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={[styles.placeholder, style]}>
        <span style={{ color: '#6b7280', fontSize: 14 }}>
          Loading map...
        </span>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Directions route on roads */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#4285F4',
                strokeOpacity: 1,
                strokeWeight: 5,
              },
            }}
          />
        )}

        {/* Pickup marker */}
        {pickupLocation && (
          <Marker
            position={{ lat: pickupLocation.latitude, lng: pickupLocation.longitude }}
            title="Pickup Location"
            icon={markerIcons.pickup}
          />
        )}

        {/* Dropoff marker */}
        {dropoffLocation && (
          <Marker
            position={{ lat: dropoffLocation.latitude, lng: dropoffLocation.longitude }}
            title="Destination"
            icon={markerIcons.dropoff}
          />
        )}

        {/* Additional markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.latitude, lng: marker.longitude }}
            title={marker.title}
            icon={markerIcons[marker.icon || 'default']}
          />
        ))}
      </GoogleMap>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
});
