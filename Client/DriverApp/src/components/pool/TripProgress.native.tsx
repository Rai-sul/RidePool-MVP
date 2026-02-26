import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapViewComponent, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Phone, CheckCircle, X, Navigation, MessageCircle, Star, Clock, AlertCircle, RefreshCw, Users } from 'lucide-react-native';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useTheme } from '../../contexts/ThemeContext';
import { usePoolRealtime } from '../../hooks/usePoolRealtime';
import { driverService } from '../../services/driver.service';
import { locationService } from '../../services/location.service';
import { PassengerBillingDialog } from './PassengerBillingDialog.native';
import type { Pool } from '../../types';

interface TripProgressProps {
  poolId: string;
  initialLocation?: { lat: number; lng: number } | null;
  onComplete: () => void;
  onCancel: () => void;
}

export function TripProgress({ poolId, initialLocation, onComplete, onCancel }: TripProgressProps) {
  const { colors } = useTheme();
  const mapRef = useRef<MapViewComponent>(null);

  // Real-time pool data
  const {
    pool,
    passengers,
    poolStatus,
    loading: loadingPool,
    error: poolError,
    lastUpdated,
    isConnected,
    refresh: refreshPool,
  } = usePoolRealtime(poolId);

  // Driver location state (from device GPS)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [region, setRegion] = useState<Region>({
    latitude: initialLocation?.lat || 23.7805,
    longitude: initialLocation?.lng || 90.4258,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // Passenger completion tracking
  const [completedPassengers, setCompletedPassengers] = useState<Set<string>>(new Set());
  const [billingPassenger, setBillingPassenger] = useState<Pool['passengers'][0] | null>(null);
  const [billingEarnings, setBillingEarnings] = useState(0);
  const [billingDistance, setBillingDistance] = useState(0);

  // Navigation link state
  const [loadingNavLink, setLoadingNavLink] = useState(false);

  // Watch driver's location via GPS
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const startWatching = async () => {
      try {
        subscription = await locationService.watchLocation(
          (location) => {
            const newLoc = { lat: location.latitude, lng: location.longitude };
            setDriverLocation(newLoc);
            // Also send location updates to server
            driverService.updateLocation(location).catch(() => {});
          },
          { distanceInterval: 20, timeInterval: 5000 }
        );
      } catch (error) {
        console.log('[TripProgress] Error watching location:', error);
      }
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Update map region when driver location changes
  useEffect(() => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 500);
    }
  }, [driverLocation]);

  // Handle navigate button — opens Google Maps with turn-by-turn navigation
  const handleStartNavigation = useCallback(async () => {
    if (!poolId) return;

    setLoadingNavLink(true);
    try {
      const response = await driverService.getNavigationLink(poolId);
      if (response.success && response.data) {
        const navData = response.data as any;
        let url = '';

        // Use platform-specific navigation URL for turn-by-turn
        if (navData.platformLinks) {
          if (Platform.OS === 'android' && navData.platformLinks.android) {
            url = navData.platformLinks.android;
          } else if (Platform.OS === 'ios' && navData.platformLinks.ios) {
            url = navData.platformLinks.ios;
          }
        }
        if (!url) {
          url = navData.navigationUrl || '';
        }

        if (url) {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
          } else {
            // Fallback to universal URL
            const fallback = navData.platformLinks?.universal || navData.navigationUrl;
            if (fallback) {
              await Linking.openURL(fallback);
            } else {
              Alert.alert('Navigation', 'Could not open Google Maps. Please navigate manually.');
            }
          }
        } else {
          Alert.alert('Navigation', 'Navigation link not available.');
        }
      } else {
        Alert.alert('Error', 'Could not generate navigation link.');
      }
    } catch (error) {
      console.error('[TripProgress] Error opening navigation:', error);
      Alert.alert('Error', 'Failed to open Google Maps.');
    } finally {
      setLoadingNavLink(false);
    }
  }, [poolId]);

  const togglePassengerComplete = (passengerId: string) => {
    const newCompleted = new Set(completedPassengers);

    if (newCompleted.has(passengerId)) {
      newCompleted.delete(passengerId);
    } else {
      newCompleted.add(passengerId);

      if (passengers.length > 0) {
        const earningsPerPassenger = Math.round((pool?.total_earnings || 0) / passengers.length);
        const distancePerPassenger = Number(((pool?.nearest_pickup_km || 0) / passengers.length).toFixed(1));
        const passenger = passengers.find((p) => p.user_id === passengerId);

        if (passenger) {
          setBillingPassenger(passenger);
          setBillingEarnings(earningsPerPassenger);
          setBillingDistance(distancePerPassenger);
        }
      }

      // Notify backend
      driverService.markDropoff(passengerId).catch(() => {});
    }

    setCompletedPassengers(newCompleted);
  };

  const handleCompletePool = async () => {
    try {
      await driverService.completeRide();
      onComplete();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete ride.');
    }
  };

  const handleCancelRide = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => onCancel(),
        },
      ]
    );
  };

  const allCompleted = passengers.length > 0 && completedPassengers.size === passengers.length;

  const getStatusText = () => {
    switch (poolStatus) {
      case 'READY_TO_START': return 'On the way to pickup';
      case 'STARTED': return 'Trip in progress';
      case 'COMPLETED': return 'Trip completed';
      case 'CANCELLED': return 'Ride cancelled';
      default: return 'Active ride';
    }
  };

  const centerOnLocation = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 500);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Map Section — Only driver's current location pin */}
        <View style={{ height: 300, position: 'relative' }}>
          <MapViewComponent
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            region={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            zoomEnabled={true}
            rotateEnabled={true}
            pitchEnabled={false}
          >
            {driverLocation && (
              <Marker
                coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                title="Your Location"
                pinColor="#3b82f6"
              />
            )}
          </MapViewComponent>

          {/* Status Badge */}
          <View
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: '#2563eb',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>{getStatusText()}</Text>
          </View>

          {/* Center on location button */}
          <TouchableOpacity
            onPress={centerOnLocation}
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'white',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Navigation size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Ride Header Card */}
        <View className="mx-4 mt-4">
          <Card className="p-5 bg-blue-600">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-2xl text-white mb-1">Active Pool Ride</Text>
                <Text className="text-sm text-white opacity-90">
                  {completedPassengers.size}/{passengers.length} passengers completed
                </Text>
              </View>
              <Badge className="bg-white px-3 py-1">
                <Text className="text-blue-700">In Progress</Text>
              </Badge>
            </View>
            <View className="flex-row gap-4 mt-2">
              <View className="flex-1">
                <Text className="text-sm text-white opacity-90">Total Earnings</Text>
                <Text className="text-3xl text-white">৳{pool?.total_earnings || 0}</Text>
              </View>
              {pool?.nearest_pickup_km !== null && pool?.nearest_pickup_km !== undefined && (
                <View className="flex-1">
                  <Text className="text-sm text-white opacity-90">Distance</Text>
                  <Text className="text-3xl text-white">{pool.nearest_pickup_km}km</Text>
                </View>
              )}
            </View>
          </Card>
        </View>

        {/* Floating Navigate Button */}
        {['READY_TO_START', 'STARTED', 'WAITING_FOR_DRIVER'].includes(poolStatus) && (
          <View className="mx-4 mt-4">
            <TouchableOpacity
              onPress={handleStartNavigation}
              disabled={loadingNavLink}
              className="w-full py-4 rounded-xl flex-row items-center justify-center gap-3 bg-blue-600"
              style={{
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
                opacity: loadingNavLink ? 0.7 : 1,
              }}
            >
              {loadingNavLink ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Navigation size={24} color="white" />
                  <View>
                    <Text className="text-white font-bold text-lg">Navigate to Pickup</Text>
                    <Text className="text-white text-xs opacity-80">Open Google Maps turn-by-turn • FREE</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
            <Text className="text-center text-gray-500 text-xs mt-2">
              Opens Google Maps with optimal pickup route
            </Text>
          </View>
        )}

        {/* Pool Status Card */}
        <View className="mx-4 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold">Pool Status</Text>
              <View className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <Text className={`text-xs ${isConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                {isConnected ? 'Live' : 'Connecting...'}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {loadingPool && <ActivityIndicator size="small" color="#2563eb" />}
              <TouchableOpacity onPress={refreshPool} className="p-2">
                <RefreshCw size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {poolError ? (
            <View className="flex-row items-center gap-2">
              <AlertCircle size={20} color="#ef4444" />
              <Text className="text-red-500 text-sm">{poolError}</Text>
            </View>
          ) : (
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Status</Text>
                <View className="px-2 py-1 rounded bg-green-100">
                  <Text className="text-xs font-medium text-green-700">
                    {poolStatus.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Passengers</Text>
                <View className="flex-row items-center gap-2">
                  <Users size={16} color="#6b7280" />
                  <Text className="font-medium">{passengers.length}/{pool?.max_passengers || 4}</Text>
                </View>
              </View>
              {lastUpdated && (
                <Text className="text-xs text-gray-400 text-right">
                  Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Passengers List */}
        <View className="mx-4 mt-4">
          <Text className="mb-3 text-lg font-semibold">Passengers ({passengers.length})</Text>
          <View className="gap-3">
            {passengers.map((passenger) => {
              const isCompleted = completedPassengers.has(passenger.user_id);

              return (
                <Card
                  key={passenger.user_id}
                  className={`p-4 ${isCompleted ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
                >
                  <View className="flex-row items-start justify-between gap-3 mb-3">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-12 h-12 rounded-full bg-blue-600 items-center justify-center">
                        <Text className="text-white text-lg">
                          {passenger.name.charAt(0)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold mb-1">{passenger.name}</Text>
                        {passenger.rating !== undefined && passenger.rating > 0 && (
                          <View className="flex-row items-center gap-1">
                            <Star size={12} color="#EAB308" fill="#EAB308" />
                            <Text className="text-sm">{passenger.rating}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-10 h-10"
                        onPress={() => {}}
                      >
                        <Phone size={16} color="#6B7280" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-10 h-10"
                        onPress={() => {}}
                      >
                        <MessageCircle size={16} color="#6B7280" />
                      </Button>
                    </View>
                  </View>

                  <View className="bg-gray-50 rounded-lg p-3 mb-3">
                    <View className="flex-row items-start gap-2 mb-2">
                      <Text className="text-green-700 font-medium">↑ Pickup:</Text>
                      <Text className="text-gray-700 flex-1">{passenger.pickup?.address || 'N/A'}</Text>
                    </View>
                    <View className="flex-row items-start gap-2">
                      <Text className="text-red-700 font-medium">↓ Drop:</Text>
                      <Text className="text-gray-700 flex-1">{passenger.dropoff?.address || 'N/A'}</Text>
                    </View>
                  </View>

                  <Button
                    variant={isCompleted ? 'secondary' : 'default'}
                    className={`w-full h-11 ${!isCompleted && 'bg-green-600'}`}
                    onPress={() => togglePassengerComplete(passenger.user_id)}
                  >
                    <View className="flex-row items-center">
                      {isCompleted ? (
                        <>
                          <X size={16} color="#6B7280" />
                          <Text className="ml-2">Undo Complete</Text>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} color="#FFFFFF" />
                          <Text className="text-white ml-2">Mark as Dropped Off</Text>
                        </>
                      )}
                    </View>
                  </Button>
                </Card>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mx-4 mt-4 flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 border-2"
            onPress={handleCancelRide}
          >
            <Text className="text-base">Cancel Ride</Text>
          </Button>
          <Button
            className="flex-1 h-14 bg-green-600"
            disabled={!allCompleted}
            onPress={handleCompletePool}
          >
            <Text className="text-white text-base">Complete Pool</Text>
          </Button>
        </View>

        {/* Billing Dialog */}
        {billingPassenger && (
          <PassengerBillingDialog
            isOpen={billingPassenger !== null}
            passenger={billingPassenger}
            earnings={billingEarnings}
            distance={billingDistance}
            onClose={() => setBillingPassenger(null)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
