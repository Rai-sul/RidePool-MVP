import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Constants from 'expo-constants';
import { getH3Boundary } from '../utils/h3Utils';
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

interface MapViewProps {
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
  }>;
  route?: Array<{ latitude: number; longitude: number }>;
  hexagons?: string[];
  onRegionChange?: (region: any) => void;
}

export const MapComponent: React.FC<MapViewProps> = ({
  initialRegion = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  markers = [],
  route = [],
  hexagons = [],
  onRegionChange,
}) => {
  const mapRef = useRef<any>(null);
  const [hexBoundaries, setHexBoundaries] = useState<Array<Array<{ latitude: number; longitude: number }>>>([]);

  useEffect(() => {
    if (hexagons.length > 0) {
      const boundaries = hexagons.map((hex) => {
        const boundary = getH3Boundary(hex);
        return boundary.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
      });
      setHexBoundaries(boundaries);
    }
  }, [hexagons]);

  if (isExpoGo || !NativeMapView) {
    const pickupLocation = markers.length > 0 ? { latitude: markers[0].latitude, longitude: markers[0].longitude } : undefined;
    const dropoffLocation = markers.length > 1 ? { latitude: markers[markers.length - 1].latitude, longitude: markers[markers.length - 1].longitude } : undefined;

    return (
      <View style={styles.container}>
        <StaticMapView
          center={{ latitude: initialRegion.latitude, longitude: initialRegion.longitude }}
          zoom={14}
          markers={markers.map((m) => ({ ...m, icon: 'default' as const }))}
          pickupLocation={pickupLocation}
          dropoffLocation={dropoffLocation}
          showDirections={route.length > 0}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NativeMapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChange}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
      >
        {markers.map((marker) => (
          <NativeMarker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
            description={marker.description}
          />
        ))}

        {route.length > 0 && (
          <NativePolyline coordinates={route} strokeColor="#2563eb" strokeWidth={4} lineDashPattern={[1]} />
        )}

        {hexBoundaries.map((boundary, index) => (
          <NativePolyline
            key={`hex-${index}`}
            coordinates={boundary}
            strokeColor="#10b981"
            strokeWidth={2}
            fillColor="rgba(16, 185, 129, 0.2)"
          />
        ))}
      </NativeMapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default MapComponent;
