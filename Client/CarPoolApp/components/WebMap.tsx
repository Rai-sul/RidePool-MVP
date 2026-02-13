import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface WebMapProps {
  center?: { latitude: number; longitude: number };
  zoom?: number;
  pickupLocation?: { latitude: number; longitude: number };
  dropoffLocation?: { latitude: number; longitude: number };
  showDirections?: boolean;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    icon?: 'pickup' | 'dropoff' | 'driver' | 'current';
  }>;
  style?: React.CSSProperties;
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
};

export default function WebMap({
  center = { latitude: 23.8103, longitude: 90.4125 },
  zoom = 14,
  pickupLocation,
  dropoffLocation,
  showDirections = false,
  markers = [],
  style,
}: WebMapProps) {
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

  // Fetch directions when pickup and dropoff are provided
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
      <div style={{ 
        ...containerStyle, 
        ...style,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#e5e7eb',
        color: '#6b7280',
        fontSize: '14px',
      }}>
        Google Maps API key not configured
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ 
        ...containerStyle, 
        ...style,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#e5e7eb',
        color: '#ef4444',
        fontSize: '14px',
      }}>
        Error loading Google Maps
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ 
        ...containerStyle, 
        ...style,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#e5e7eb',
        color: '#6b7280',
        fontSize: '14px',
      }}>
        Loading map...
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, ...style }}>
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
        {/* Directions route */}
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

        {/* Current location marker */}
        <Marker
          position={mapCenter}
          title="Your Location"
          icon={markerIcons.current}
        />

        {/* Pickup marker */}
        {pickupLocation && (
          <Marker
            position={{ lat: pickupLocation.latitude, lng: pickupLocation.longitude }}
            title="Pickup"
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
            icon={markerIcons[marker.icon || 'current']}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
