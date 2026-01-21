import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// This is a shared component that will be used for map views
// It re-exports the appropriate map component based on platform

interface GoogleMapViewProps {
  center?: { latitude: number; longitude: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
  }>;
  style?: any;
  children?: React.ReactNode;
}

export default function GoogleMapView(props: GoogleMapViewProps) {
  // This file serves as a base for TypeScript
  // The actual implementations are in .web.tsx and .native.tsx
  return (
    <View style={[styles.container, props.style]}>
      <Text>Map Loading...</Text>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
