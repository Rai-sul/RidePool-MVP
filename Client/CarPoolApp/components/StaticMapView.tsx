import React from 'react';
import { View, StyleSheet, Text, Linking, TouchableOpacity, Image, ActivityIndicator } from 'react-native';

interface StaticMapViewProps {
  center?: { latitude: number; longitude: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    icon?: 'pickup' | 'dropoff' | 'driver' | 'current' | 'default';
  }>;
  pickupLocation?: { latitude: number; longitude: number };
  dropoffLocation?: { latitude: number; longitude: number };
  showDirections?: boolean;
  style?: any;
  children?: React.ReactNode;
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
}: StaticMapViewProps) {
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);

  const getStaticMapUrl = (): string => {
    const params = new URLSearchParams();
    params.append('center', `${center.latitude},${center.longitude}`);
    params.append('zoom', String(zoom));
    params.append('size', '640x640');
    params.append('scale', '2');
    params.append('maptype', 'roadmap');

    if (pickupLocation) {
      params.append('markers', `color:green|label:P|${pickupLocation.latitude},${pickupLocation.longitude}`);
    }
    if (dropoffLocation) {
      params.append('markers', `color:red|label:D|${dropoffLocation.latitude},${dropoffLocation.longitude}`);
    }

    markers.forEach((marker) => {
      const color = marker.icon === 'driver' ? 'blue' : 'orange';
      params.append('markers', `color:${color}|${marker.latitude},${marker.longitude}`);
    });

    if (showDirections && pickupLocation && dropoffLocation) {
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
