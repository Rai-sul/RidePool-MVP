import { useEffect, useState, useRef, Fragment } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import MapViewComponent, { Marker, Polyline, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { Button } from "../ui/button";
import { X, Plus, Minus, Navigation } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { locationService } from "../../services/location.service";
import type { Pool } from "../../types";

interface MapViewProps {
  driverLocation?: { lat: number; lng: number } | null;
  pools: Pool[];
  selectedPool: Pool | null;
  onPoolSelect: (pool: Pool | null) => void;
  navigationMode?: boolean;
  activePool?: Pool | null;
}

// Get nearest pickup coordinate from pool passengers
const getPoolPickupCoord = (pool: Pool): { lat: number; lng: number } | null => {
  const firstPassenger = pool.passengers?.[0];
  if (firstPassenger?.pickup?.lat && firstPassenger?.pickup?.lng) {
    return { lat: firstPassenger.pickup.lat, lng: firstPassenger.pickup.lng };
  }
  return pool.destination ? { lat: pool.destination.lat, lng: pool.destination.lng } : null;
};

export function MapView({ 
  driverLocation: propDriverLocation, 
  pools: poolsProp, 
  selectedPool, 
  onPoolSelect, 
  navigationMode, 
  activePool 
}: MapViewProps) {
  const pools = Array.isArray(poolsProp) ? poolsProp : [];
  const { colors } = useTheme();
  const mapRef = useRef<MapViewComponent>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(
    propDriverLocation || null
  );
  const [region, setRegion] = useState<Region>({
    latitude: propDriverLocation?.lat || 23.7805,
    longitude: propDriverLocation?.lng || 90.4258,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    const initLocation = async () => {
      if (!propDriverLocation) {
        const location = await locationService.getCurrentLocation();
        if (location) {
          setCurrentLocation({ lat: location.latitude, lng: location.longitude });
          setRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      }
    };
    initLocation();
  }, [propDriverLocation]);

  useEffect(() => {
    if (propDriverLocation) {
      setCurrentLocation(propDriverLocation);
    }
  }, [propDriverLocation]);

  const handleMarkerPress = (pool: Pool) => {
    if (selectedPool?.id === pool.id) {
      onPoolSelect(null);
    } else {
      onPoolSelect(pool);
    }
  };

  const handleZoomIn = () => {
    setRegion(prev => ({
      ...prev,
      latitudeDelta: prev.latitudeDelta * 0.7,
      longitudeDelta: prev.longitudeDelta * 0.7,
    }));
  };

  const handleZoomOut = () => {
    setRegion(prev => ({
      ...prev,
      latitudeDelta: prev.latitudeDelta * 1.4,
      longitudeDelta: prev.longitudeDelta * 1.4,
    }));
  };

  const centerOnLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  const poolToShow = navigationMode && activePool ? activePool : selectedPool;

  // Build route preview: driver → pickups → dropoffs
  const routeCoordinates: { latitude: number; longitude: number }[] = [];
  if (poolToShow && currentLocation) {
    routeCoordinates.push({ latitude: currentLocation.lat, longitude: currentLocation.lng });
    
    for (const passenger of (poolToShow.passengers || [])) {
      if (passenger.pickup?.lat && passenger.pickup?.lng) {
        routeCoordinates.push({ latitude: passenger.pickup.lat, longitude: passenger.pickup.lng });
      }
    }
    for (const passenger of (poolToShow.passengers || [])) {
      if (passenger.dropoff?.lat && passenger.dropoff?.lng) {
        routeCoordinates.push({ latitude: passenger.dropoff.lat, longitude: passenger.dropoff.lng });
      }
    }
  }

  return (
    <View style={styles.container}>
      <MapViewComponent
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        rotateEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
      >
        {currentLocation && (
          <Marker
            coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }}
            title="Your Location"
            pinColor="#3b82f6"
          />
        )}

        {/* Pool markers — show nearest pickup location for each pool */}
        {pools.map((pool) => {
          const coord = getPoolPickupCoord(pool);
          if (!coord) return null;
          return (
            <Marker
              key={pool.id}
              coordinate={{ latitude: coord.lat, longitude: coord.lng }}
              title={`৳${pool.total_earnings}`}
              description={`${pool.current_passengers} passengers`}
              pinColor={selectedPool?.id === pool.id ? "#f59e0b" : "#6366f1"}
              onPress={() => handleMarkerPress(pool)}
            />
          );
        })}

        {/* When a pool is selected, show each passenger's pickup and dropoff */}
        {poolToShow && (poolToShow.passengers || []).map((passenger, index) => (
          <Fragment key={passenger.user_id}>
            {passenger.pickup?.lat && passenger.pickup?.lng && (
              <Marker
                coordinate={{ latitude: passenger.pickup.lat, longitude: passenger.pickup.lng }}
                title={`Pickup: ${passenger.name}`}
                description={passenger.pickup.address || 'Pickup'}
                pinColor="#10b981"
              />
            )}
            {passenger.dropoff?.lat && passenger.dropoff?.lng && (
              <Marker
                coordinate={{ latitude: passenger.dropoff.lat, longitude: passenger.dropoff.lng }}
                title={`Dropoff: ${passenger.name}`}
                description={passenger.dropoff.address || 'Dropoff'}
                pinColor="#ef4444"
              />
            )}
          </Fragment>
        ))}

        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#3b82f6"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
      </MapViewComponent>

      {selectedPool && (
        <View style={styles.clearButton}>
          <Button
            variant="default"
            size="sm"
            style={{ backgroundColor: colors.card }}
            onPress={() => onPoolSelect(null)}
          >
            <View style={styles.buttonContent}>
              <X size={16} color={colors.icon} />
              <Text style={{ color: colors.text, marginLeft: 8 }}>View All Pools</Text>
            </View>
          </Button>
        </View>
      )}

      <View style={styles.zoomControls}>
        <Button
          variant="default"
          size="icon"
          style={[styles.zoomButton, { backgroundColor: colors.card }]}
          onPress={handleZoomIn}
        >
          <Plus size={20} color={colors.icon} />
        </Button>
        <Button
          variant="default"
          size="icon"
          style={[styles.zoomButton, { backgroundColor: colors.card }]}
          onPress={handleZoomOut}
        >
          <Minus size={20} color={colors.icon} />
        </Button>
        <Button
          variant="default"
          size="icon"
          style={[styles.zoomButton, { backgroundColor: colors.card }]}
          onPress={centerOnLocation}
        >
          <Navigation size={20} color={colors.icon} />
        </Button>
      </View>

      <View style={[styles.legend, { backgroundColor: colors.card }]}>
        {!selectedPool ? (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>You</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6366f1' }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>Pool</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>Pickup</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>Drop</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  clearButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    zIndex: 10,
    gap: 8,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  legend: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
