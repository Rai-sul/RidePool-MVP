import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapViewComponent, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Phone, CheckCircle, X, Navigation, MessageCircle, Star, Clock, AlertCircle, RefreshCw, Users, User } from 'lucide-react-native';
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

  // Combined route state
  const [combinedRoute, setCombinedRoute] = useState<any>(null);
  const [loadingCombinedRoute, setLoadingCombinedRoute] = useState(false);
  const prevPoolStatusRef = useRef<string | null>(null);

  // Watch driver's location via GPS
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const startWatching = async () => {
      try {
        subscription = await locationService.watchLocation(
          (location) => {
            const newLoc = { lat: location.latitude, lng: location.longitude };
            setDriverLocation(newLoc);
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

  // Fetch combined route when pool status changes
  useEffect(() => {
    const validStatuses = ['READY_TO_START', 'STARTED', 'WAITING_FOR_DRIVER'];
    if (!poolId || !validStatuses.includes(poolStatus)) return;
    if (prevPoolStatusRef.current === poolStatus && combinedRoute) return;

    let isMounted = true;
    let retryCount = 0;

    const fetchRoute = async () => {
      if (!isMounted) return;
      setLoadingCombinedRoute(true);

      try {
        const response = await driverService.getPoolRoute(poolId);
        if (!isMounted) return;

        if (response.success && response.data) {
          const data = response.data as any;
          const hasValid = data.waypoints?.length >= 2 && data.route?.coordinates?.length > 0;
          if (hasValid || retryCount >= 2) {
            setCombinedRoute(data);
            prevPoolStatusRef.current = poolStatus;
          } else if (retryCount < 2) {
            retryCount++;
            setTimeout(fetchRoute, 2000);
            return;
          }
        }
      } catch (error) {
        console.log('[TripProgress] Error fetching route:', error);
      }

      if (isMounted) setLoadingCombinedRoute(false);
    };

    fetchRoute();
    return () => { isMounted = false; };
  }, [poolId, poolStatus]);

  // Handle navigate button — opens Google Maps with optimized multi-stop route
  const handleStartNavigation = useCallback(async () => {
    if (!poolId) return;

    setLoadingNavLink(true);
    try {
      const response = await driverService.getNavigationLink(poolId);
      if (response.success && response.data) {
        const navData = response.data as any;
        const hasMultipleStops = (navData.meta?.waypointCount ?? 0) > 0;

        // For multi-stop routes, prefer platform links (which now use universal URL
        // format for waypoint support) then fall back to navigationUrl
        let url = '';
        if (navData.platformLinks) {
          if (Platform.OS === 'android' && navData.platformLinks.android) {
            url = navData.platformLinks.android;
          } else if (Platform.OS === 'ios' && navData.platformLinks.ios) {
            url = navData.platformLinks.ios;
          }
        }
        if (!url) {
          url = navData.platformLinks?.universal || navData.navigationUrl || '';
        }

        if (url) {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
          } else {
            // Fallback chain: universal → navigationUrl
            const fallback = navData.platformLinks?.universal || navData.navigationUrl;
            if (fallback && fallback !== url) {
              await Linking.openURL(fallback);
            } else {
              Alert.alert('Navigation', 'Could not open Google Maps. Please install Google Maps.');
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
      case 'WAITING_FOR_DRIVER': return 'Waiting for driver...';
      case 'READY_TO_START': return 'Driver is on the way';
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
        {/* Map Section — Driver location + passenger pickup/dropoff markers */}
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
            {passengers.map((p, idx) => (
              <React.Fragment key={p.user_id}>
                {p.pickup && (
                  <Marker
                    coordinate={{ latitude: p.pickup.lat, longitude: p.pickup.lng }}
                    title={`Pickup: ${p.name}`}
                    pinColor="#22c55e"
                  />
                )}
                {p.dropoff && (
                  <Marker
                    coordinate={{ latitude: p.dropoff.lat, longitude: p.dropoff.lng }}
                    title={`Drop-off: ${p.name}`}
                    pinColor="#ef4444"
                  />
                )}
              </React.Fragment>
            ))}
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

          {/* ETA Badge */}
          {combinedRoute?.route?.durationInTraffic && (
            <View
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'white',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: '#e5e7eb',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Clock size={16} color="#4b5563" />
              <Text style={{ fontWeight: '600' }}>{combinedRoute.route.durationInTraffic} mins</Text>
            </View>
          )}

          {/* Combined Route Badge */}
          {combinedRoute && (
            <View
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                backgroundColor: 'rgba(0,0,0,0.7)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Navigation size={14} color="#10b981" />
              <Text style={{ color: 'white', fontSize: 12 }}>
                {combinedRoute.route?.totalDistanceKm}km • {combinedRoute.route?.totalDurationMinutes}min
              </Text>
            </View>
          )}

          {/* Loading Combined Route */}
          {loadingCombinedRoute && (
            <View
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                backgroundColor: 'rgba(0,0,0,0.7)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={{ color: 'white', fontSize: 12 }}>Loading smart route...</Text>
            </View>
          )}

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

        {/* Your Driver Card — Shows you are the driver */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">Your Driver</Text>
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full items-center justify-center bg-blue-100 border-2 border-white shadow-md">
              <User size={28} color="#1e40af" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold">You (Driver)</Text>
              <Text className="text-sm text-gray-500 mt-1">
                {pool?.vehicle_type || 'Vehicle'} • {passengers.length} passenger{passengers.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Badge className="bg-green-100 px-3 py-1">
              <Text className="text-green-700 text-xs font-medium">Active</Text>
            </Badge>
          </View>
        </View>

        {/* Navigate Button */}
        {['READY_TO_START', 'STARTED', 'WAITING_FOR_DRIVER'].includes(poolStatus) && (
          <View className="mx-6 mt-4">
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
                    <Text className="text-white font-bold text-lg">View Route in Google Maps</Text>
                    <Text className="text-white text-xs opacity-80">See all pickup & dropoff points • FREE</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
            <Text className="text-center text-gray-500 text-xs mt-2">
              Opens Google Maps app with the full route and all stops
            </Text>
          </View>
        )}

        {/* Pool Status Card */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
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
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Driver</Text>
                <Text className="font-medium text-green-600">Assigned (You)</Text>
              </View>
              {lastUpdated && (
                <Text className="text-xs text-gray-400 text-right">
                  Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Passengers Card — Matches CarPoolApp co-riders style */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">
            Passengers {passengers.length > 0 ? `(${passengers.length})` : ''}
          </Text>

          {loadingPool && passengers.length === 0 ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-gray-500 text-sm mt-2">Loading passengers...</Text>
            </View>
          ) : passengers.length > 0 ? (
            <View className="gap-3">
              {passengers.map((passenger) => {
                const isCompleted = completedPassengers.has(passenger.user_id);

                return (
                  <View key={passenger.user_id} className={`${isCompleted ? 'opacity-60' : ''}`}>
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full items-center justify-center bg-blue-100 border-2 border-white">
                        <Text className="text-blue-800 font-semibold">{passenger.name.charAt(0)}</Text>
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-gray-800 font-medium">{passenger.name}</Text>
                          {passenger.rating !== undefined && passenger.rating > 0 && (
                            <View className="flex-row items-center gap-1">
                              <Star size={12} color="#EAB308" fill="#EAB308" />
                              <Text className="text-xs text-gray-600">{passenger.rating}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                          <Phone size={16} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                          <MessageCircle size={16} color="#4b5563" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Pickup / Dropoff addresses */}
                    <View className="bg-gray-50 rounded-lg p-3 mt-2 mb-2 ml-12">
                      <View className="flex-row items-start gap-2 mb-2">
                        <Text className="text-green-700 font-medium">↑ Pickup:</Text>
                        <Text className="text-gray-700 flex-1" numberOfLines={1}>{passenger.pickup?.address || 'N/A'}</Text>
                      </View>
                      <View className="flex-row items-start gap-2">
                        <Text className="text-red-700 font-medium">↓ Drop:</Text>
                        <Text className="text-gray-700 flex-1" numberOfLines={1}>{passenger.dropoff?.address || 'N/A'}</Text>
                      </View>
                    </View>

                    {/* Mark as Dropped Off button */}
                    <View className="ml-12">
                      <TouchableOpacity
                        className={`w-full h-10 rounded-lg flex-row items-center justify-center ${isCompleted ? 'bg-gray-200' : 'bg-green-600'}`}
                        onPress={() => togglePassengerComplete(passenger.user_id)}
                      >
                        {isCompleted ? (
                          <>
                            <X size={16} color="#6B7280" />
                            <Text className="ml-2 text-gray-600 font-medium">Undo Complete</Text>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} color="#FFFFFF" />
                            <Text className="text-white ml-2 font-medium">Mark as Dropped Off</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="items-center py-4">
              <Users size={32} color="#d1d5db" />
              <Text className="text-gray-500 text-center mt-2">No passengers yet</Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                Waiting for passengers to join...
              </Text>
            </View>
          )}
        </View>

        {/* Route Info — Smart route waypoints */}
        {combinedRoute?.waypoints && (
          <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-semibold">Smart Route</Text>
              {combinedRoute.route?.trafficLevel && (
                <View className={`px-2 py-1 rounded ${combinedRoute.route.trafficLevel === 'low' ? 'bg-green-100' : combinedRoute.route.trafficLevel === 'moderate' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                  <Text className={`text-xs font-medium ${combinedRoute.route.trafficLevel === 'low' ? 'text-green-700' : combinedRoute.route.trafficLevel === 'moderate' ? 'text-yellow-700' : 'text-red-700'}`}>
                    {combinedRoute.route.trafficLevel.charAt(0).toUpperCase() + combinedRoute.route.trafficLevel.slice(1)} traffic
                  </Text>
                </View>
              )}
            </View>

            <View className="gap-3">
              {combinedRoute.waypoints.map((waypoint: any, idx: number) => {
                const waypointColor = waypoint.type === 'driver' ? '#3B82F6' : waypoint.type === 'pickup' ? '#22C55E' : '#EF4444';
                const waypointLabel = waypoint.type === 'driver' ? 'Driver' : waypoint.type === 'pickup' ? 'Pick up' : 'Drop off';

                return (
                  <View key={waypoint.id || idx} className="flex-row items-start gap-3">
                    <View className="items-center">
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: waypointColor, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{idx + 1}</Text>
                      </View>
                      {idx < combinedRoute.waypoints.length - 1 && (
                        <View style={{ width: 2, height: 20, backgroundColor: '#e5e7eb', marginTop: 4 }} />
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm text-gray-500">{waypointLabel}</Text>
                        {waypoint.type === 'driver' && (
                          <View className="bg-blue-100 px-2 py-0.5 rounded">
                            <Text className="text-xs text-blue-700">You</Text>
                          </View>
                        )}
                      </View>
                      <Text className="font-medium" numberOfLines={1}>
                        {waypoint.name || waypoint.address || `Waypoint ${idx + 1}`}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        ETA: {waypoint.estimatedArrivalMinutes === 0 ? 'Start' : `+${waypoint.estimatedArrivalMinutes} min`}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Route Summary */}
              <View className="mt-3 pt-3 border-t border-gray-100">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Total Distance</Text>
                  <Text className="font-medium">{combinedRoute.route?.totalDistanceKm} km</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-600">Total Duration</Text>
                  <Text className="font-medium">{combinedRoute.route?.durationInTraffic || combinedRoute.route?.totalDurationMinutes} mins</Text>
                </View>
                {combinedRoute.optimization?.savingsPercent > 0 && (
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-600">Route Savings</Text>
                    <Text className="font-medium text-green-600">
                      {combinedRoute.optimization.savingsPercent}% more efficient
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Trip Details */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">Trip Details</Text>

          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Vehicle Type</Text>
              <Text className="font-medium">{pool?.vehicle_type || 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Estimated Time</Text>
              <Text className="font-medium">
                {combinedRoute?.route?.durationInTraffic
                  ? `${combinedRoute.route.durationInTraffic} mins`
                  : pool?.estimated_arrival_minutes
                    ? `${pool.estimated_arrival_minutes} mins`
                    : 'Calculating...'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Total Earnings</Text>
              <Text className="font-semibold text-blue-600">৳{pool?.total_earnings || 0}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Fare per Person</Text>
              <Text className="font-medium">৳{pool?.fare_per_person || 0}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Passengers Completed</Text>
              <Text className="font-medium">{completedPassengers.size}/{passengers.length}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {!['COMPLETED', 'CANCELLED'].includes(poolStatus) && (
          <View className="mx-6 mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={handleCancelRide}
              className="flex-1 h-14 rounded-xl border-2 border-gray-300 bg-white flex-row items-center justify-center"
            >
              <X size={20} color="#6b7280" />
              <Text className="text-gray-600 font-semibold ml-2">Cancel Ride</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCompletePool}
              disabled={!allCompleted}
              className={`flex-1 h-14 rounded-xl flex-row items-center justify-center ${allCompleted ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <CheckCircle size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Complete Pool</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SOS Button */}
        {!['COMPLETED', 'CANCELLED'].includes(poolStatus) && (
          <View className="mx-6 mt-4">
            <TouchableOpacity className="w-full py-4 rounded-xl border-2 border-red-500 bg-white flex-row items-center justify-center">
              <Text className="text-red-500 font-semibold">🚨 Emergency SOS</Text>
            </TouchableOpacity>
          </View>
        )}

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
