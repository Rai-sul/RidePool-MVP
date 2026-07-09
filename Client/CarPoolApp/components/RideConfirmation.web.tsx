import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native-web';
import { MapPin, Clock, Users, Navigation, ChevronRight, ChevronLeft, Car, Taka, AlertCircle, Plus, RefreshCw } from './Icons';
import { Button } from './ui/button';
import GoogleMapView from './GoogleMapView';
import LinearGradient from './LinearGradient';
import type { Destination, UserProfile, Pool, Location } from '../contexts/GlobalContext';
import { usePools } from '../hooks/usePools';
import { useRides } from '../hooks/useRides';
import { rideService, RideEstimate, AlternativeRouteInfo } from '../services/ride.service';

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
  
  // Use the pools hook to search for real pools and create new ones
  const { searchPools, createPool, joinPool, searchResults, currentPool, loading, error, clearSearch } = usePools();
  
  // Use the rides hook to create rides
  const { requestRide } = useRides();
  
  // Get available pools from search results
  const availablePools = searchResults?.pools || [];
  const hasMatches = searchResults?.has_matches || false;
  const alternatives = searchResults?.alternatives || [];
  
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
          estimated_passengers: 3,
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
        // Pool created successfully - navigate to searching screen
        onPoolSelect(result.data.pool as Pool);
      }
    } catch (err) {
      console.error('Failed to create pool:', err);
    } finally {
      setIsCreatingPool(false);
    }
  }, [pickupLocation, destination, selectedVehicleType, isFemale, activeRideType, createPool, onPoolSelect]);
  
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
  
  // Filter pools based on gender preference (server already handles most filtering)
  const filteredPools = availablePools;
  
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
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        pickup_address: pickupLocation.address || pickupLocation.name || null,
        pickup_h3_index: '',
        destination_lat: destination.latitude,
        destination_lng: destination.longitude,
        destination_address: destination.address || destination.name || null,
        destination_h3_index: '',
        vehicle_type: selectedVehicleType,
        gender_restriction: (isFemale && activeRideType === 'female-only') ? 'FEMALE_ONLY' : 'ANY',
        current_passengers: joinResult.currentPassengers || 2,
        max_passengers: selectedVehicleType === 'CNG' ? 2 : 4,
        viability_score: poolResult.score || null,
        base_distance_km: null,
        base_duration_minutes: null,
        extended_search_h3: null,
        extended_pickup_h3: null,
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
        >
          {/* Back Button Overlay */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-10 bg-white shadow-md rounded-full w-10 h-10 active:scale-95 transition-transform"
            onClick={onBack}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Legend */}
          {selectedPoolId && (
            <View
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <View className="flex flex-row items-center gap-2 mb-1">
                <View className="w-3 h-3 bg-green-500 rounded-full"></View>
                <Text style={{ fontSize: 12 }}>Pickup</Text>
              </View>
              <View className="flex flex-row items-center gap-2">
                <View className="w-3 h-3 bg-red-500 rounded-full"></View>
                <Text style={{ fontSize: 12 }}>Destination</Text>
              </View>
            </View>
          )}
        </GoogleMapView>
      </View>

      {/* Bottom Sheet */}
      <ScrollView className="flex-1 pb-32">
        <View className="p-5 space-y-5">
          {/* Ride Type Selector for Female Users */}
          {isFemale && (
            <View className="space-y-3">
              <View className="flex flex-row items-center gap-2">
                <Users className="w-5 h-5" />
                <Text>Ride Type</Text>
              </View>
              <View className="flex flex-row gap-3">
                <Button 
                  onClick={() => {
                    setActiveRideType('female-only');
                    setSelectedPoolId(null); // Reset selection when switching
                  }}
                  className={`flex-1 h-12 transition-all ${
                    activeRideType === 'female-only'
                      ? 'bg-pink-500 text-white border-2 border-pink-500 hover:bg-pink-600'
                      : 'bg-pink-50 text-pink-700 border-2 border-pink-300 hover:bg-pink-100'
                  } active:scale-[0.98]`}
                >
                  RideShare with Female
                </Button>
                <Button 
                  onClick={() => {
                    setActiveRideType('regular');
                    setSelectedPoolId(null); // Reset selection when switching
                  }}
                  variant={activeRideType === 'regular' ? 'default' : 'outline'}
                  className={`flex-1 h-12 transition-all ${
                    activeRideType === 'regular'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-2'
                  } active:scale-[0.98]`}
                >
                  Regular RideShare
                </Button>
              </View>
              {activeRideType === 'female-only' && (
                <Text className="text-sm text-pink-600 bg-pink-50 border border-pink-200 rounded-lg p-3">
                  Showing pools with female drivers and riders only for your preference and comfort.
                </Text>
              )}
            </View>
          )}

          {/* Route Summary */}
          <View className="space-y-3">
            <View className="flex flex-row items-start gap-3">
              <View className="w-3 h-3 bg-blue-600 rounded-full mt-2"></View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Pickup</Text>
                <Text>Current Location</Text>
              </View>
            </View>
            <View className="flex flex-row items-start gap-3">
              <MapPin className="w-4 h-4 text-red-600 fill-red-600 flex-shrink-0 mt-1" />
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Drop-off</Text>
                <Text>{destination?.name}</Text>
                <Text className="text-sm text-gray-500">{destination?.address}</Text>
              </View>
            </View>
          </View>

          {/* Cost & Time - Now using real estimates */}
          <View className="flex flex-row items-center justify-center gap-4 py-3 px-4 bg-gray-50 rounded-xl">
            {estimateLoading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : rideEstimate ? (
              <>
                <View className="flex flex-col items-center">
                  <View className="flex flex-row items-center gap-2">
                    <Taka className="w-5 h-5 text-green-600" />
                    <Text className="font-semibold">৳{rideEstimate.estimatedFare}</Text>
                  </View>
                  <Text className="text-xs text-gray-500">per person (3-person pool)</Text>
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
                      <Text className="font-semibold text-green-600">৳{rideEstimate.estimatedSavings}</Text>
                      <Text className="text-xs text-gray-500">You Save (vs solo)</Text>
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

          {/* Vehicle Type Selector */}
          <View className="space-y-3">
            <Text>Select Vehicle Type</Text>
            <View className="grid grid-cols-2 gap-3">
              {/* Car Option */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedVehicleType('CAR');
                  setSelectedPoolId(null); // Reset pool selection when switching vehicle type
                }}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                  selectedVehicleType === 'CAR'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200'
                }`}
              >
                <View className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  selectedVehicleType === 'CAR' ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  <Car className={`w-7 h-7 ${
                    selectedVehicleType === 'CAR' ? 'text-white' : 'text-gray-600'
                  }`} />
                </View>
                <View className="items-center">
                  <Text>Car</Text>
                  <Text className="text-xs text-gray-500">Max 3 passengers</Text>
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
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.98] relative ${
                  selectedVehicleType === 'CNG'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200'
                }`}
              >
                <View className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  selectedVehicleType === 'CNG' ? 'bg-green-500' : 'bg-gray-200'
                }`}>
                  {/* CNG Icon - simplified three-wheeler */}
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-7 h-7 ${
                      selectedVehicleType === 'CNG' ? 'text-white' : 'text-gray-600'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="17" cy="17" r="2" />
                    <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" />
                    <path d="M12 17v-9" />
                  </svg>
                </View>
                <View className="items-center">
                  <Text>CNG</Text>
                  <Text className="text-xs text-gray-500">Max 2 passengers</Text>
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

          {/* Available Pools */}
          {selectedVehicleType && (
            <View className="space-y-3">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center gap-2">
                  <Users className="w-5 h-5" />
                  <Text>Available Pools</Text>
                  <Text className="text-sm text-gray-500">
                    {loading ? '(Searching...)' : `(${filteredPools.length} found)`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleReloadPools}
                  disabled={loading}
                  className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center"
                  style={{ opacity: loading ? 0.5 : 1 }}
                >
                  <RefreshCw className={`w-5 h-5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
                </TouchableOpacity>
              </View>
              
              {/* Loading State */}
              {loading && (
                <View className="items-center py-8 px-4 bg-gray-50 rounded-xl">
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text className="text-gray-600 mt-3">Searching for pools...</Text>
                </View>
              )}
              
              {/* Error State */}
              {error && !loading && (
                <View className="items-center py-8 px-4 bg-red-50 rounded-xl">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                  <Text className="text-red-700 font-medium text-center">Failed to search pools</Text>
                  <Text className="text-sm text-red-500 mt-2 text-center">{error}</Text>
                </View>
              )}
              
              {/* No Pools Found - Show Create Pool Option */}
              {!loading && !error && filteredPools.length === 0 && (
                <View className="items-center py-8 px-4 bg-blue-50 rounded-xl">
                  <Users className="w-12 h-12 text-blue-500 mb-3" />
                  <Text className="text-gray-800 font-semibold text-center text-lg">No matching pools found</Text>
                  <Text className="text-sm text-gray-600 mt-2 text-center">
                    Be the first to create a pool for this route!
                  </Text>
                  
                  <TouchableOpacity
                    onPress={handleCreatePool}
                    disabled={isCreatingPool}
                    className="mt-4 bg-blue-600 rounded-xl px-6 py-3 flex-row items-center gap-2"
                    style={{
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    }}
                  >
                    {isCreatingPool ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Plus className="w-5 h-5 text-white" />
                        <Text className="text-white font-semibold">Create New Pool</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  {/* Show alternatives if available */}
                  {alternatives.length > 0 && (
                    <View className="mt-4 w-full">
                      <Text className="text-sm text-gray-600 mb-2">Or try:</Text>
                      {alternatives.map((alt: any, idx: number) => (
                        <View key={idx} className="bg-white rounded-lg p-3 mb-2 border border-gray-200">
                          <Text className="font-medium text-gray-800">{alt.title}</Text>
                          <Text className="text-sm text-gray-500">{alt.description}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
              
              {/* Pool Results */}
              {!loading && !error && filteredPools.length > 0 && (
                <View className="space-y-3">
                  <Text className="text-sm text-gray-500">Tap a pool to join</Text>
                  {filteredPools.map((poolResult: any) => (
                    <TouchableOpacity
                      key={poolResult.poolId}
                      onPress={() => handlePoolClick(poolResult)}
                      className={`border-2 rounded-2xl p-4 space-y-3 transition-all ${
                        selectedPoolId === poolResult.poolId
                          ? 'border-blue-500 shadow-lg bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <View className="flex flex-row items-center justify-between">
                        <View className="flex flex-row items-center gap-3">
                          <LinearGradient
                            colors={['#2563eb', '#06b6d4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                          >
                            <Text className="text-white text-lg font-bold">P</Text>
                          </LinearGradient>
                          <View>
                            <Text className="font-semibold">Pool #{poolResult.poolId.slice(0, 8)}</Text>
                            <View className="flex flex-row items-center gap-1">
                              <Text className="text-sm text-gray-600">Match: {Math.round(poolResult.score * 100)}%</Text>
                            </View>
                          </View>
                        </View>
                        {selectedPoolId === poolResult.poolId && (
                          <View className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <View className="w-2 h-2 bg-white rounded-full"></View>
                          </View>
                        )}
                      </View>

                      <View className="flex flex-row flex-wrap gap-2">
                        {/* Distance to co-rider's pickup */}
                        {poolResult.distanceToPoolKm !== undefined && (
                          <View className="flex flex-row items-center gap-1.5 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <Text className="text-sm text-blue-700 font-medium">
                              {poolResult.distanceToPoolKm < 1 
                                ? `${Math.round(poolResult.distanceToPoolKm * 1000)}m away` 
                                : `${poolResult.distanceToPoolKm.toFixed(1)}km away`}
                            </Text>
                          </View>
                        )}
                        {/* Pickup detour time - time to reach co-rider */}
                        {poolResult.pickupDetourMinutes !== undefined && poolResult.pickupDetourMinutes > 0 && (
                          <View className="flex flex-row items-center gap-1.5 bg-purple-50 px-2.5 py-1.5 rounded-lg">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <Text className="text-sm text-purple-700 font-medium">~{poolResult.pickupDetourMinutes} min</Text>
                          </View>
                        )}
                        {/* Route match percentage */}
                        <View className="flex flex-row items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                          <Navigation className="w-4 h-4 text-gray-600" />
                          <Text className="text-sm text-gray-700 font-medium">{poolResult.routeOverlapPercentage}% match</Text>
                        </View>
                        {/* ETA - only show if available */}
                        {poolResult.exactETA && (
                          <View className="flex flex-row items-center gap-1.5 bg-green-50 px-2.5 py-1.5 rounded-lg">
                            <Clock className="w-4 h-4 text-green-600" />
                            <Text className="text-sm text-green-700 font-medium">{poolResult.exactETA} min ETA</Text>
                          </View>
                        )}
                        {/* Detour time for destination */}
                        {poolResult.estimatedDetourMinutes !== undefined && poolResult.estimatedDetourMinutes > 0 && (
                          <View className="flex flex-row items-center gap-1.5 bg-orange-50 px-2.5 py-1.5 rounded-lg">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <Text className="text-sm text-orange-600 font-medium">+{poolResult.estimatedDetourMinutes} min detour</Text>
                          </View>
                        )}
                      </View>

                      {/* Pickup point location - shows where the pool's pickup is */}
                      {(poolResult.poolPickupLocation?.name || poolResult.poolPickupLocation?.address) && (
                        <View className="mt-3 pt-2 border-t border-gray-100">
                          <View className="flex flex-row items-center gap-2">
                            <View className="w-6 h-6 rounded-full bg-green-100 items-center justify-center">
                              <Car className="w-3.5 h-3.5 text-green-600" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-xs text-gray-500">Co-rider's pickup</Text>
                              <Text className="text-sm text-gray-700 font-medium">
                                {poolResult.poolPickupLocation.name || poolResult.poolPickupLocation.address}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Payment Method */}
          <View className="border-t pt-4">
            <View className="flex flex-row items-center justify-between py-3">
              <Text className="text-gray-600">Payment Method</Text>
              <View className="flex flex-row items-center gap-2">
                <Text>Cash</Text>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </View>
            </View>
          </View>

          {/* Spacer for fixed button */}
          <View className="h-20"></View>
        </View>
      </ScrollView>

      {/* Fixed Confirm Button above bottom nav */}
      {showConfirmButton && selectedPoolId && (
        <View
          
          
          className="fixed bottom-16 left-0 right-0 px-5 pb-3 bg-white border-t border-gray-200"
        >
          <Button
            onClick={handleConfirm}
            disabled={isJoiningPool}
            className={`w-full h-14 ${isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'} active:scale-[0.98] transition-transform ${isJoiningPool ? 'opacity-70' : ''}`}
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
    </View>
  );
}
