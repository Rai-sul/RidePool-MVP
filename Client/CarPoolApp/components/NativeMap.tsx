import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import StaticMapView from './StaticMapView';

const isExpoGo = Constants.appOwnership === 'expo';

let NativeMapView: any = null;
let NativeMarker: any = null;
let PROVIDER_DEFAULT: any = null;

if (!isExpoGo) {
  try {
    const RNMaps = require('react-native-maps');
    NativeMapView = RNMaps.default;
    NativeMarker = RNMaps.Marker;
    PROVIDER_DEFAULT = RNMaps.PROVIDER_DEFAULT;
  } catch (e) {
    console.log('react-native-maps not available');
  }
}

interface NativeMapProps {
  style?: any;
  showUserLocation?: boolean;
}

export default function NativeMap({ style, showUserLocation = true }: NativeMapProps) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Location permission denied');
          setLocation({ latitude: 23.8103, longitude: 90.4125 });
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
      }
    })();
  }, []);

  if (!location) {
    return (
      <View style={[styles.container, styles.loading, style]}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (isExpoGo || !NativeMapView) {
    return (
      <View style={[styles.container, style]}>
        <StaticMapView
          center={location}
          zoom={15}
          markers={[
            {
              id: 'current',
              latitude: location.latitude,
              longitude: location.longitude,
              title: 'You are here',
              icon: 'current',
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <NativeMapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={showUserLocation}
        showsMyLocationButton
        showsCompass
      >
        <NativeMarker coordinate={location} title="You are here" />
      </NativeMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
