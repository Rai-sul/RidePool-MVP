import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { getH3Boundary } from '../utils/h3Utils';

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
  const mapRef = useRef<MapView>(null);
  const [hexBoundaries, setHexBoundaries] = useState<Array<Array<{ latitude: number; longitude: number }>>>([]);

  useEffect(() => {
    if (hexagons.length > 0) {
      const boundaries = hexagons.map(hex => {
        const boundary = getH3Boundary(hex);
        return boundary.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
      });
      setHexBoundaries(boundaries);
    }
  }, [hexagons]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChange}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
      >
        {/* Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
            description={marker.description}
          />
        ))}

        {/* Route polyline */}
        {route.length > 0 && (
          <Polyline
            coordinates={route}
            strokeColor="#2563eb"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}

        {/* H3 Hexagon boundaries */}
        {hexBoundaries.map((boundary, index) => (
          <Polyline
            key={`hex-${index}`}
            coordinates={boundary}
            strokeColor="#10b981"
            strokeWidth={2}
            fillColor="rgba(16, 185, 129, 0.2)"
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

export default MapComponent;
