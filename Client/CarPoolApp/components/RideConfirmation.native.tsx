import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Clock, Users, Navigation, ChevronRight, ChevronLeft, Car, Taka, AlertCircle, Plus, RefreshCw, UserPlus } from './Icons';
import { Button } from './ui/button';
import type { Destination, UserProfile, Pool, Location } from '../contexts/GlobalContext';
import { usePools } from '../hooks/usePools';
import { useRides } from '../hooks/useRides';
import { rideService, RideEstimate, RideEstimateResponse, AlternativeRouteInfo } from '../services/ride.service';
import { poolService } from '../services/pool.service';
import { priyoSathiService } from '../services/priyoSathi.service';
import { ApiError } from '../utils/apiClient';
import LinearGradient from './LinearGradient';
import GoogleMapView from './GoogleMapView';
import AvailablePoolCard, { PoolSearchResultData, CoRiderInfo } from './AvailablePoolCard';
import PriyoSathiInviteModal from './PriyoSathiInviteModal';

type RideConfirmationProps = {
  pickupLocation?: Location | null;
  destination: Destination | null;
  userProfile: UserProfile | null;
  rideType: 'female-only' | 'regular' | null;
  onPoolSelect: (pool: Pool) => void;
  onBack: () => void;
};

type PoolStop = {
  type: 'pickup' | 'dropoff';
  name: string;
  rider: string;
  x: number;
  y: number;
};

export default function RideConfirmation({ pickupLocation, destination, userProfile, rideType, onPoolSelect, onBack }: RideConfirmationProps) {
  const insets = useSafeAreaInsets();
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [activeRideType, setActiveRideType] = useState<'female-only' | 'regular'>(rideType || 'regular');
  const [selectedVehicleType, setSelectedVehicleType] = useState<'CAR' | 'CNG' | null>(null);
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [isCreatingPool, setIsCreatingPool] = useState(false);
  const [isJoiningPool, setIsJoiningPool] = useState(false);
  const [rideEstimate, setRideEstimate] = useState<RideEstimate | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ summary?: string; selectedReason?: string } | null>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<AlternativeRouteInfo[]>([]);
  const [trafficInfo, setTrafficInfo] = useState<string>('');
  const [estimateLoading, setEstimateLoading] = useState(false);
  const isFemale = userProfile?.gender === 'female';

  // Priyo Sathi state
  const [showPriyoSathiModal, setShowPriyoSathiModal] = useState(false);
  const [priyoSathiCount, setPriyoSathiCount] = useState(0);
  const [invitedFriends, setInvitedFriends] = useState<{ id: string; name: string }[]>([]);

  // Use the pools hook to search for real pools and create new ones
  const { searchPools, createPool, joinPool, searchResults, currentPool, loading, error, clearSearch } = usePools();

  // Use the rides hook to create rides
  const { requestRide } = useRides();

  // Get available pools from search results
  const availablePools = searchResults?.pools || [];
  const hasMatches = searchResults?.has_matches || false;
  const alternatives = searchResults?.alternatives || [];

  // Fetch Priyo Sathi count on mount
  useEffect(() => {
    const fetchPriyoSathiCount = async () => {
      try {
        const res = await priyoSathiService.getCompanions();
        if (res.success && res.data?.companions) {
          const acceptedCount = res.data.companions.filter(c => c.status === 'ACCEPTED').length;
          setPriyoSathiCount(acceptedCount);
        }
      } catch (err) {
        // Silently fail - Priyo Sathi is optional
        console.log('[RideConfirmation] Could not fetch Priyo Sathi count:', err);
        setPriyoSathiCount(0);
      }
    };
    fetchPriyoSathiCount();
  }, []);

  // Register ride intent on the server as soon as locations are available.
  // This ensures companions can discover this user immediately, not just when the modal opens.
  useEffect(() => {
    if (!pickupLocation?.latitude || !pickupLocation?.longitude ||
        !destination?.latitude || !destination?.longitude) {
      return;
    }

    // Register intent immediately
    priyoSathiService.getNearbyCompanions(
      pickupLocation.latitude,
      pickupLocation.longitude,
      destination.latitude,
      destination.longitude
    ).catch(() => {});

    // Re-register every 30s to keep intent alive (TTL is 5 min)
    const pLat = pickupLocation.latitude!;
    const pLng = pickupLocation.longitude!;
    const dLat = destination.latitude;
    const dLng = destination.longitude;
    const interval = setInterval(() => {
      priyoSathiService.getNearbyCompanions(pLat, pLng, dLat, dLng).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [pickupLocation?.latitude, pickupLocation?.longitude, destination?.latitude, destination?.longitude]);

  // Handle Priyo Sathi invite
  const handlePriyoSathiInvite = useCallback((companionId: string, companionName: string) => {
    setInvitedFriends(prev => {
      if (prev.find(f => f.id === companionId)) return prev;
      return [...prev, { id: companionId, name: companionName }];
    });
    Alert.alert(
      'Invitation Queued',
      `${companionName} will be notified when you create or join a pool.`,
      [{ text: 'OK' }]
    );
  }, []);

  // Fetch ride estimate when locations and vehicle type are set
  useEffect(() => {
    if (!pickupLocation || !destination?.latitude || !destination?.longitude || !selectedVehicleType) {
      setRideEstimate(null);
      setRouteInfo(null);
      setAlternativeRoutes([]);
      setTrafficInfo('');
      return;
    }

    const fetchEstimate = async () => {
      setEstimateLoading(true);
      try {
        const response = await rideService.getRideEstimate({
          pickup_lat: pickupLocation.latitude,
          pickup_lng: pickupLocation.longitude,
          dropoff_lat: destination.latitude!,
          dropoff_lng: destination.longitude!,
          vehicle_type: selectedVehicleType,
        });

        if (response.success && response.data) {
          setRideEstimate(response.data.estimate);
          setRouteInfo(response.data.route ? {
            summary: response.data.route.summary,
            selectedReason: response.data.route.selectedReason,
          } : null);
          setAlternativeRoutes(response.data.alternativeRoutes || []);
          setTrafficInfo(response.data.trafficInfo || '');
        }
      } catch (err) {
        console.error('Failed to fetch ride estimate:', err);
      } finally {
        setEstimateLoading(false);
      }
    };

    fetchEstimate();
  }, [pickupLocation, destination, selectedVehicleType]);

  // Search for pools when location/preferences change
  useEffect(() => {
    if (!pickupLocation || !destination?.latitude || !destination?.longitude || !selectedVehicleType) {
      return;
    }

    searchPools({
      pickup_lat: pickupLocation.latitude,
      pickup_lng: pickupLocation.longitude,
      dropoff_lat: destination.latitude,
      dropoff_lng: destination.longitude,
      vehicle_type: selectedVehicleType,
      gender_restriction: (isFemale && activeRideType === 'female-only') ? 'FEMALE_ONLY' : 'ANY',
    });
  }, [pickupLocation, destination, selectedVehicleType, isFemale, activeRideType]);

  // Handle reload pools - manually refresh pool search results
  const handleReloadPools = useCallback(() => {
    if (!pickupLocation || !destination?.latitude || !destination?.longitude || !selectedVehicleType) {
      return;
    }

    searchPools({
      pickup_lat: pickupLocation.latitude,
      pickup_lng: pickupLocation.longitude,
      dropoff_lat: destination.latitude,
      dropoff_lng: destination.longitude,
      vehicle_type: selectedVehicleType,
      gender_restriction: (isFemale && activeRideType === 'female-only') ? 'FEMALE_ONLY' : 'ANY',
    });
  }, [pickupLocation, destination, selectedVehicleType, isFemale, activeRideType, searchPools]);

  // Handle creating a new pool when no matches found
  const handleCreatePool = useCallback(async () => {
    if (!pickupLocation?.latitude || !pickupLocation?.longitude || !destination?.latitude || !destination?.longitude || !selectedVehicleType) {
      return;
    }

    setIsCreatingPool(true);
    try {
      const result = await createPool({
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        pickup_address: pickupLocation.address,
        pickup_name: pickupLocation.name,
        destination_lat: destination.latitude,
        destination_lng: destination.longitude,
        destination_address: destination.address,
        destination_name: destination.name,
        vehicle_type: selectedVehicleType,
        max_passengers: selectedVehicleType === 'CNG' ? 2 : 4,
        gender_restriction: (isFemale && activeRideType === 'female-only') ? 'FEMALE_ONLY' : 'ANY',
      });

      if (result.success && result.data?.pool) {
        // Send invites to queued Priyo Sathi friends
        if (invitedFriends.length > 0 && result.data.ride?.id) {
          for (const friend of invitedFriends) {
            try {
              await priyoSathiService.inviteToRide(friend.id, result.data.ride.id);
              console.log(`[RideConfirmation] Invited ${friend.name} to ride`);
            } catch (inviteErr) {
              if (inviteErr instanceof ApiError && inviteErr.data?.error?.code === 'ALREADY_INVITED_BY_COMPANION') {
                Alert.alert('Already Invited', inviteErr.message);
              }
              console.warn(`[RideConfirmation] Failed to invite ${friend.name}:`, inviteErr);
            }
          }
        }
        // Pool created successfully - navigate to searching screen
        onPoolSelect(result.data.pool as Pool);
      }
    } catch (err) {
      console.error('Failed to create pool:', err);
    } finally {
      setIsCreatingPool(false);
    }
  }, [pickupLocation, destination, selectedVehicleType, isFemale, activeRideType, createPool, onPoolSelect, invitedFriends]);

  // Delay showing the confirm button to prevent touch event overlap
  useEffect(() => {
    if (selectedPoolId) {
      const timer = setTimeout(() => {
        setShowConfirmButton(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setShowConfirmButton(false);
    }
  }, [selectedPoolId]);

  // Generate dynamic stops based on pool data
  const getPoolStops = (pool: any): PoolStop[] => {
    const stops: PoolStop[] = [
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 25, y: 30 },
    ];

    // Add dropoff
    stops.push({
      type: 'dropoff',
      name: destination?.name || 'Your Destination',
      rider: 'You',
      x: 75,
      y: 75
    });

    return stops;
  };

  // Filter pools based on gender preference
  const filteredPools = availablePools.filter((poolResult: any) => {
    // For now, show all pools from search results
    // The server already handles gender filtering
    return true;
  });

  const handlePoolClick = (poolResult: any) => {
    setSelectedPoolId(poolResult.poolId);
  };

  // Handle joining an existing pool - creates a ride first, then joins the pool
  const handleConfirm = useCallback(async () => {
    if (!selectedPoolId || !pickupLocation?.latitude || !pickupLocation?.longitude ||
      !destination?.latitude || !destination?.longitude || !selectedVehicleType) {
      return;
    }

    const poolResult = filteredPools.find((p: any) => p.poolId === selectedPoolId);
    if (!poolResult) return;

    setIsJoiningPool(true);
    try {
      // Step 1: Create a ride request first
      // Use location name instead of address for better user-friendliness in co-rider views
      const rideResult = await requestRide({
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        pickup_address: pickupLocation.name || pickupLocation.address,
        dropoff_lat: destination.latitude,
        dropoff_lng: destination.longitude,
        dropoff_address: destination.name || destination.address,
        vehicle_type: selectedVehicleType,
        gender_restriction: (isFemale && activeRideType === 'female-only') ? 'FEMALE_ONLY' : 'ANY',
      });

      if (!rideResult.success || !rideResult.data) {
        console.error('Failed to create ride:', rideResult.error);
        throw new Error(rideResult.error || 'Failed to create ride');
      }

      // Step 2: Join the pool with the ride ID
      const joinResult = await joinPool(selectedPoolId, rideResult.data.id);

      if (!joinResult.success) {
        console.error('Failed to join pool:', joinResult.error);
        throw new Error(joinResult.error || 'Failed to join pool');
      }

      // Step 3: Create the pool object for navigation
      const selectedPool: Pool = {
        id: poolResult.poolId,
        creator_user_id: '',
        driver_id: null,
        vehicle_id: null,
        status: 'WAITING_FOR_RIDERS',
        destination_lat: destination.latitude,
        destination_lng: destination.longitude,
        destination_address: destination.address || destination.name || null,
        destination_h3_index: '',
        vehicle_type: selectedVehicleType,
        gender_restriction: (isFemale && activeRideType === 'female-only') ? 'FEMALE_ONLY' : 'ANY',
        current_passengers: joinResult.currentPassengers || 2,
        max_passengers: selectedVehicleType === 'CNG' ? 2 : 4,
        viability_score: poolResult.score || null,
        score_breakdown: null,
        fare_per_person: joinResult.farePerPerson || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        deleted_at: null,
        // Display properties
        eta: poolResult.exactETA || 5,
        rating: 4.5,
      };

      // Navigate to the searching/waiting screen
      onPoolSelect(selectedPool);
    } catch (err) {
      console.error('Failed to join pool:', err);
    } finally {
      setIsJoiningPool(false);
    }
  }, [selectedPoolId, pickupLocation, destination, selectedVehicleType, isFemale, activeRideType,
    filteredPools, requestRide, joinPool, onPoolSelect]);

  // Get stops for selected pool
  const selectedPoolResult = selectedPoolId ? filteredPools.find((p: any) => p.poolId === selectedPoolId) : null;
  const currentStops = selectedPoolResult ? getPoolStops(selectedPoolResult) : [];

  // Use pickup location from props or default to Dhaka center
  const pickupCoords = pickupLocation
    ? { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude }
    : { latitude: 23.8103, longitude: 90.4125 };

  // Use destination coordinates if available, otherwise use default
  const dropoffCoords = destination?.latitude && destination?.longitude
    ? { latitude: destination.latitude, longitude: destination.longitude }
    : { latitude: 23.82, longitude: 90.43 };

  // Get pool's pickup location for map display
  const poolPickupCoords = selectedPoolResult?.poolPickupLocation
    ? { latitude: selectedPoolResult.poolPickupLocation.lat, longitude: selectedPoolResult.poolPickupLocation.lng }
    : null;

  // Build markers for the map - includes pool location when selected
  const getMapMarkers = () => {
    const markers: Array<{
      id: string;
      latitude: number;
      longitude: number;
      title: string;
      icon: 'pickup' | 'dropoff' | 'pool';
    }> = [];

    // Add pool location marker when a pool is selected
    if (selectedPoolId && poolPickupCoords) {
      markers.push({
        id: 'pool-location',
        latitude: poolPickupCoords.latitude,
        longitude: poolPickupCoords.longitude,
        title: `Pool Location${selectedPoolResult?.poolPickupLocation?.name ? ` - ${selectedPoolResult.poolPickupLocation.name}` : (selectedPoolResult?.poolPickupLocation?.address ? ` - ${selectedPoolResult.poolPickupLocation.address}` : '')}`,
        icon: 'pool',
      });
    }

    return markers;
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="h-full w-full flex flex-col bg-white">
        {/* Google Map */}
        <View style={{ height: '33%', position: 'relative' }}>
          <GoogleMapView
            center={selectedPoolId && poolPickupCoords ? poolPickupCoords : pickupCoords}
            zoom={12}
            pickupLocation={pickupCoords}
            dropoffLocation={dropoffCoords}
            showDirections={true}
            markers={getMapMarkers()}
          />

          {/* Back Button */}
          <TouchableOpacity
            onPress={onBack}
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 10,
              backgroundColor: 'white',
              borderRadius: 20,
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </TouchableOpacity>

          {/* Legend */}
          {selectedPoolId && (
            <View
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <View className="flex flex-row items-center gap-2 mb-1.5">
                <View className="w-3 h-3 bg-blue-600 rounded-full"></View>
                <Text className="text-xs text-gray-700">Your stops</Text>
              </View>
              <View className="flex flex-row items-center gap-2 mb-1.5">
                <View className="w-3 h-3 bg-green-500 rounded-full"></View>
                <Text className="text-xs text-gray-700">Co-rider pickups</Text>
              </View>
              <View className="flex flex-row items-center gap-2">
                <View className="w-3 h-3 bg-red-500 rounded-full"></View>
                <Text className="text-xs text-gray-700">Drop-offs</Text>
              </View>
            </View>
          )}
        </View>

        {/* Bottom Sheet */}
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }}>
          <View className="px-4 py-5">
            {/* Ride Type Selector for Female Users */}
            {isFemale && (
              <View className="mb-6">
                <View className="flex flex-row items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-gray-700" />
                  <Text className="text-base font-semibold text-gray-900">Ride Type</Text>
                </View>
                <View className="flex flex-row gap-4">
                  <Button
                    onPress={() => {
                      setActiveRideType('female-only');
                      setSelectedPoolId(null); // Reset selection when switching
                    }}
                    className={`flex-1 h-12 transition-all ${activeRideType === 'female-only'
                        ? 'bg-pink-500 border-2 border-pink-500 hover:bg-pink-600'
                        : 'bg-pink-50 border-2 border-pink-300 hover:bg-pink-100'
                      } active:scale-[0.98]`}
                  >
                    <Text className={activeRideType === 'female-only' ? 'text-white font-semibold' : 'text-gray-900 font-semibold'}>
                      RideShare with Female
                    </Text>
                  </Button>
                  <Button
                    onPress={() => {
                      setActiveRideType('regular');
                      setSelectedPoolId(null); // Reset selection when switching
                    }}
                    className={`flex-1 h-12 transition-all ${activeRideType === 'regular'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-white border-2 border-gray-300'
                      } active:scale-[0.98]`}
                  >
                    <Text className={activeRideType === 'regular' ? 'text-white font-semibold' : 'text-gray-900 font-semibold'}>
                      Regular RideShare
                    </Text>
                  </Button>
                </View>
                {activeRideType === 'female-only' && (
                  <View className="mt-3 mx-1">
                    <Text className="text-sm text-pink-600 bg-pink-50 border border-pink-200 rounded-lg p-3">
                      Showing pools with female drivers and riders only for your safety and comfort.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Route Summary */}
            <View className="mx-1 mb-4">
              <View className="flex flex-row items-center justify-between gap-4 py-3 px-4 bg-gray-50 rounded-xl">
                {/* Pickup */}
                <View className="flex-1 flex flex-row items-center gap-3">
                  <View className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0"></View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">Pickup</Text>
                    <Text className="text-sm font-medium" numberOfLines={1}>{pickupLocation?.name}</Text>
                  </View>
                </View>

                <View className="w-px h-10 bg-gray-300"></View>

                {/* Drop-off */}
                <View className="flex-1 flex flex-row items-center gap-3">
                  <MapPin className="w-4 h-4 text-red-600 fill-red-600 flex-shrink-0" />
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">Drop-off</Text>
                    <Text className="text-sm font-medium" numberOfLines={1}>{destination?.name}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Priyo Sathi Invite Section */}
            {priyoSathiCount > 0 && (
              <TouchableOpacity
                onPress={() => setShowPriyoSathiModal(true)}
                className={`mx-1 mb-4 p-4 rounded-xl border-2 ${
                  isFemale ? 'bg-pink-50 border-pink-200' : 'bg-blue-50 border-blue-200'
                }`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${
                      isFemale ? 'bg-pink-200' : 'bg-blue-200'
                    }`}>
                      <UserPlus size={20} color={isFemale ? '#db2777' : '#2563eb'} />
                    </View>
                    <View>
                      <Text className={`font-semibold ${isFemale ? 'text-pink-900' : 'text-blue-900'}`}>
                        Invite Priyo Sathi
                      </Text>
                      <Text className={`text-xs ${isFemale ? 'text-pink-600' : 'text-blue-600'}`}>
                        {invitedFriends.length > 0 
                          ? `${invitedFriends.length} friend${invitedFriends.length > 1 ? 's' : ''} invited`
                          : `${priyoSathiCount} friend${priyoSathiCount > 1 ? 's' : ''} available`
                        }
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={isFemale ? '#db2777' : '#2563eb'} />
                </View>
                {invitedFriends.length > 0 && (
                  <View className="flex-row flex-wrap gap-2 mt-3">
                    {invitedFriends.map((friend) => (
                      <View 
                        key={`invited-${friend.id}`}
                        className={`px-3 py-1 rounded-full ${isFemale ? 'bg-pink-200' : 'bg-blue-200'}`}
                      >
                        <Text className={`text-xs font-medium ${isFemale ? 'text-pink-800' : 'text-blue-800'}`}>
                          {friend.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Cost & Time - Now using real estimates */}
            <View className="flex flex-row items-center justify-center gap-4 py-3 px-4 bg-gray-50 rounded-xl mx-1 mb-4">
              {estimateLoading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : rideEstimate ? (
                <>
                  <View className="flex flex-col items-center">
                    <View className="flex flex-row items-center gap-2">
                      <Taka className="w-5 h-5 text-green-600" />
                      <Text className="font-semibold">৳{rideEstimate.estimatedFare}</Text>
                    </View>
                    <Text className="text-xs text-gray-500">Fare (with pool)</Text>
                  </View>
                  <View className="w-px h-10 bg-gray-300"></View>
                  <View className="flex flex-col items-center">
                    <View className="flex flex-row items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <Text className="font-semibold">{rideEstimate.durationInTraffic || rideEstimate.durationMinutes} mins</Text>
                    </View>
                    <Text className="text-xs text-gray-500">{rideEstimate.distanceKm} km</Text>
                  </View>
                  {rideEstimate.estimatedSavings > 0 && (
                    <>
                      <View className="w-px h-10 bg-gray-300"></View>
                      <View className="flex flex-col items-center">
                        <Text className="font-semibold text-green-600">৳{Math.floor(rideEstimate.estimatedSavings)}</Text>
                        <Text className="text-xs text-gray-500">savings</Text>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <>
                  <View className="flex flex-row items-center gap-2">
                    <Taka className="w-5 h-5 text-green-600" />
                    <Text className="font-semibold text-gray-400">Select vehicle</Text>
                  </View>
                  <View className="w-px h-6 bg-gray-300"></View>
                  <View className="flex flex-row items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <Text className="font-semibold text-gray-400">--</Text>
                  </View>
                </>
              )}
            </View>

            {/* Best Route Info */}
            {rideEstimate && routeInfo && (
              <View className="mx-1 mb-4 p-3 bg-green-50 rounded-xl border border-green-200">
                <View className="flex flex-row items-center gap-2 mb-2">
                  <Navigation className="w-4 h-4 text-green-600" />
                  <Text className="text-sm font-semibold text-green-800">Best Route Selected</Text>
                </View>
                {routeInfo.summary && (
                  <Text className="text-sm text-green-700 font-medium">Via {routeInfo.summary}</Text>
                )}
                {routeInfo.selectedReason && (
                  <Text className="text-xs text-green-600 mt-1">{routeInfo.selectedReason}</Text>
                )}
                <View className="flex flex-row items-center gap-2 mt-2">
                  <Text className="text-xs font-medium text-gray-600">{trafficInfo}</Text>
                </View>
              </View>
            )}

            {/* Alternative Routes */}
            {alternativeRoutes.length > 0 && (
              <View className="mx-1 mb-4 p-3 bg-gray-50 rounded-xl">
                <Text className="text-xs text-gray-600 font-medium mb-2">Other routes available:</Text>
                {alternativeRoutes.slice(0, 2).map((alt, idx) => (
                  <View key={idx} className="flex flex-row items-center justify-between py-1">
                    <Text className="text-xs text-gray-500">{alt.description}</Text>
                    <Text className="text-xs text-orange-600">
                      +{alt.timeDifference} min {alt.trafficLevel === 'high' ? '🔴' : alt.trafficLevel === 'moderate' ? '🟡' : '🟢'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Fare breakdown info */}
            {rideEstimate && (
              <View className="mx-1 mb-4 p-3 bg-blue-50 rounded-xl">
                <Text className="text-xs text-blue-700 font-medium mb-2">Fare varies with pool size:</Text>
                <View className="flex flex-row justify-between">
                  <Text className="text-xs text-blue-600">Solo: ৳{rideEstimate.fareEstimates.solo}</Text>
                  <Text className="text-xs text-blue-600">2 riders: ৳{rideEstimate.fareEstimates.with2Passengers}</Text>
                  <Text className="text-xs text-blue-600">3 riders: ৳{rideEstimate.fareEstimates.with3Passengers}</Text>
                  <Text className="text-xs text-blue-600">4 riders: ৳{rideEstimate.fareEstimates.with4Passengers}</Text>
                </View>
              </View>
            )}

            {/* Vehicle Type Selector */}
            <View className="mb-6">
              <View className="flex flex-row items-center gap-2 mb-3 mx-1">
                <Car className="w-5 h-5 text-gray-700" />
                <Text className="text-base font-semibold text-gray-900">Select Vehicle Type</Text>
              </View>
              <View className="flex-row flex-wrap gap-4 px-1">
                {/* Car Option */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedVehicleType('CAR');
                    setSelectedPoolId(null); // Reset pool selection when switching vehicle type
                  }}
                  className={`flex-1 flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${selectedVehicleType === 'CAR'
                      ? 'border-blue-500'
                      : 'border-gray-200'
                    }`}
                  style={selectedVehicleType === 'CAR' ? {
                    backgroundColor: '#eff6ff',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 4,
                  } : {}}
                >
                  <View className={`w-14 h-14 rounded-full flex items-center justify-center ${selectedVehicleType === 'CAR' ? 'bg-blue-500' : 'bg-gray-200'
                    }`}>
                    <Car className={`w-7 h-7 ${selectedVehicleType === 'CAR' ? 'text-white' : 'text-gray-600'
                      }`} />
                  </View>
                  <View className="items-center">
                    <Text className="text-sm font-medium text-gray-900">Car</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Max 3 passengers</Text>
                  </View>
                  {selectedVehicleType === 'CAR' && (
                    <View
                      className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                    >
                      <View className="w-2 h-2 bg-white rounded-full"></View>
                    </View>
                  )}
                </TouchableOpacity>

                {/* CNG Option */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedVehicleType('CNG');
                    setSelectedPoolId(null); // Reset pool selection when switching vehicle type
                  }}
                  className={`flex-1 flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.98] relative ${selectedVehicleType === 'CNG'
                      ? 'border-green-500'
                      : 'border-gray-200'
                    }`}
                  style={selectedVehicleType === 'CNG' ? {
                    backgroundColor: '#f0fdf4',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 4,
                  } : {}}
                >
                  <View className={`w-14 h-14 rounded-full flex items-center justify-center ${selectedVehicleType === 'CNG' ? 'bg-green-500' : 'bg-gray-200'
                    }`}>
                    {/* CNG Icon - simplified three-wheeler */}
                    <Car className={`w-7 h-7 ${selectedVehicleType === 'CNG' ? 'text-white' : 'text-gray-600'
                      }`} />
                  </View>
                  <View className="items-center">
                    <Text className="text-sm font-medium text-gray-900">CNG</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Max 2 passengers</Text>
                  </View>
                  {selectedVehicleType === 'CNG' && (
                    <View
                      className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                    >
                      <View className="w-2 h-2 bg-white rounded-full"></View>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              {!selectedVehicleType && (
                <Text className="text-sm text-gray-500 text-center">Select a vehicle type to see available pools</Text>
              )}
            </View>

            {/* Available Pools Section */}
            {selectedVehicleType && (
              <View style={{ marginTop: 8 }}>
                {/* Section Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                    paddingHorizontal: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: '#eff6ff',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Users size={20} color="#2563eb" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
                        Available Pools
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>
                        {loading ? 'Searching...' : `${filteredPools.length} pool${filteredPools.length !== 1 ? 's' : ''} found`}
                      </Text>
                    </View>
                  </View>
                  {!loading && filteredPools.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={handleReloadPools}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#eff6ff',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <RefreshCw size={18} color="#2563eb" />
                      </TouchableOpacity>
                      <View
                        style={{
                          backgroundColor: '#dcfce7',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#16a34a' }}>
                          LIVE
                        </Text>
                      </View>
                    </View>
                  )}
                  {!loading && filteredPools.length === 0 && (
                    <TouchableOpacity
                      onPress={handleReloadPools}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#eff6ff',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <RefreshCw size={18} color="#2563eb" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Loading State */}
                {loading && (
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: 40,
                      paddingHorizontal: 20,
                      backgroundColor: '#f9fafb',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      borderStyle: 'dashed',
                    }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: '#eff6ff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                      }}
                    >
                      <ActivityIndicator size="large" color="#2563eb" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
                      Finding nearby pools...
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                      We're matching you with riders heading your way
                    </Text>
                  </View>
                )}

                {/* Error State */}
                {error && !loading && (
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: 32,
                      paddingHorizontal: 20,
                      backgroundColor: '#fef2f2',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#fecaca',
                    }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: '#fee2e2',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <AlertCircle size={28} color="#dc2626" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#b91c1c', marginBottom: 4 }}>
                      Search Failed
                    </Text>
                    <Text style={{ fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
                      {error}
                    </Text>
                  </View>
                )}

                {/* No Pools Found - Create Pool CTA */}
                {!loading && !error && filteredPools.length === 0 && (
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: 32,
                      paddingHorizontal: 20,
                      backgroundColor: '#eff6ff',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#bfdbfe',
                    }}
                  >
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: '#dbeafe',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                      }}
                    >
                      <Users size={36} color="#2563eb" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e40af', marginBottom: 6, textAlign: 'center' }}>
                      No pools found nearby
                    </Text>
                    <Text style={{ fontSize: 14, color: '#3b82f6', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
                      Be the first to create a pool for this route and save money when others join!
                    </Text>

                    <TouchableOpacity
                      onPress={handleCreatePool}
                      disabled={isCreatingPool}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#2563eb',
                        paddingHorizontal: 24,
                        paddingVertical: 14,
                        borderRadius: 12,
                        gap: 8,
                        shadowColor: '#2563eb',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 6,
                        opacity: isCreatingPool ? 0.7 : 1,
                      }}
                    >
                      {isCreatingPool ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Plus size={20} color="#ffffff" />
                      )}
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                        {isCreatingPool ? 'Creating Pool...' : 'Create New Pool'}
                      </Text>
                    </TouchableOpacity>

                    {/* Alternatives */}
                    {/* {alternatives.length > 0 && (
                      <View style={{ width: '100%', marginTop: 20 }}>
                        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                          Or try these alternatives:
                        </Text>
                        {alternatives.map((alt: any, idx: number) => (
                          <View
                            key={idx}
                            style={{
                              backgroundColor: '#ffffff',
                              borderRadius: 10,
                              padding: 12,
                              marginBottom: 8,
                              borderWidth: 1,
                              borderColor: '#e5e7eb',
                            }}
                          >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                              {alt.title}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                              {alt.description}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )} */}
                  </View>
                )}

                {/* Pool Results - Using new AvailablePoolCard */}
                {!loading && !error && filteredPools.length > 0 && (
                  <View>
                    {/* Results Header */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: '#6b7280' }}>
                        Tap a pool to see details and join
                      </Text>
                      <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                        Sorted by match
                      </Text>
                    </View>

                    {/* Pool Cards */}
                    {filteredPools.map((poolResult: any) => {
                      const poolData: PoolSearchResultData = {
                        poolId: poolResult.poolId,
                        score: poolResult.score,
                        routeOverlapPercentage: poolResult.routeOverlapPercentage,
                        estimatedDetour: poolResult.estimatedDetour,
                        estimatedDetourMinutes: poolResult.estimatedDetourMinutes,
                        pickupDetourMinutes: poolResult.pickupDetourMinutes,
                        exactDistance: poolResult.exactDistance,
                        exactETA: poolResult.exactETA,
                        poolPickupLocation: poolResult.poolPickupLocation,
                        poolDropoffLocation: poolResult.poolDropoffLocation || (destination ? {
                          lat: destination.latitude!,
                          lng: destination.longitude!,
                          name: destination.name,
                          address: destination.address,
                        } : undefined),
                        distanceToPoolKm: poolResult.distanceToPoolKm,
                        currentPassengers: poolResult.currentPassengers || 1,
                        maxPassengers: poolResult.maxPassengers || (selectedVehicleType === 'CNG' ? 2 : 4),
                      };

                      return (
                        <AvailablePoolCard
                          key={poolResult.poolId}
                          pool={poolData}
                          isSelected={selectedPoolId === poolResult.poolId}
                          onPress={() => handlePoolClick(poolResult)}
                        />
                      );
                    })}

                    {/* Create Pool Alternative */}
                    <TouchableOpacity
                      onPress={handleCreatePool}
                      disabled={isCreatingPool}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f9fafb',
                        borderWidth: 2,
                        borderColor: '#e5e7eb',
                        borderStyle: 'dashed',
                        borderRadius: 16,
                        padding: 16,
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <Plus size={20} color="#6b7280" />
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#6b7280' }}>
                        Or create your own pool
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Payment Method */}
            <View className="mt-6 pt-5 border-t border-gray-200">
              <TouchableOpacity
                className="flex flex-row items-center justify-between py-3 px-4 rounded-xl"
                style={{ backgroundColor: '#f9fafb' }}
              >
                <Text className="text-gray-700 font-medium">Payment Method</Text>
                <View className="flex flex-row items-center gap-2">
                  <Text className="text-gray-900 font-semibold">Cash</Text>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Fixed Confirm Button above bottom nav - accounts for system navigation bar */}
        {showConfirmButton && selectedPoolId && (
          <View
            className="absolute left-0 right-0 px-4 py-4 bg-white border-t border-gray-200"
            style={{
              bottom: 64 + insets.bottom, // 64 = bottom nav height + system nav bar
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 10
            }}
          >
            <Button
              onPress={handleConfirm}
              disabled={isJoiningPool}
              className={`w-full h-14 ${isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'} active:scale-[0.98] transition-transform rounded-xl ${isJoiningPool ? 'opacity-70' : ''}`}
              textClassName="text-white font-bold text-base"
            >
              {isJoiningPool ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="text-white font-bold text-base">Joining Pool...</Text>
                </View>
              ) : (
                'Join RideShare Pool'
              )}
            </Button>
          </View>
        )}

        {/* Priyo Sathi Invite Modal */}
        <PriyoSathiInviteModal
          visible={showPriyoSathiModal}
          onClose={() => setShowPriyoSathiModal(false)}
          onInvite={handlePriyoSathiInvite}
          pickupLat={pickupLocation?.latitude}
          pickupLng={pickupLocation?.longitude}
          destinationLat={destination?.latitude}
          destinationLng={destination?.longitude}
          isFemale={isFemale}
        />
      </View>
    </SafeAreaView>
  );
}
