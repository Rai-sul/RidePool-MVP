import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, Users, Clock, Plus } from './Icons';
import { Button } from './ui/button';
import { useGlobalContext } from '../contexts/GlobalContext';
import { usePoolRealtime } from '../hooks/usePoolRealtime';
import { poolService } from '../services/pool.service';

type SearchingDriverProps = {
  onCancel: () => void;
  onDriverFound?: () => void;
  onSearchExpired?: () => void;
};

const SEARCH_TIMEOUT_SECONDS = 30;

const statusMessages = [
  'Waiting for other riders...',
  'Looking for matching pools...',
  'Almost there...',
];

export default function SearchingDriver({ onCancel, onDriverFound, onSearchExpired }: SearchingDriverProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [opacityAnim] = useState(new Animated.Value(0.5));
  const [remainingSeconds, setRemainingSeconds] = useState(SEARCH_TIMEOUT_SECONDS);
  const [searchExpired, setSearchExpired] = useState(false);
  const [isCreatingNewPool, setIsCreatingNewPool] = useState(false);
  
  const { selectedPool, userProfile, cancelTrip, startTrip, selectedDestination, pickupLocation } = useGlobalContext();
  
  // Use realtime pool updates
  const { poolStatus, hasDriver, pool: poolDetails, error: poolError } = usePoolRealtime(
    selectedPool?.id || null,
    userProfile?.id || null
  );

  // Get current passenger count
  const currentPassengers = poolDetails?.current_passengers || selectedPool?.current_passengers || 1;

  // Handle search expiry - called when timer reaches 0 with no riders joined
  const handleSearchExpiry = useCallback(async () => {
    // If 2+ riders joined, proceed to trip progress
    if (currentPassengers >= 2) {
      if (onDriverFound) {
        onDriverFound();
      }
      return;
    }
    
    // If only 1 rider (no one joined), show "No pool found" state
    setSearchExpired(true);
    
    // Notify server to mark the pool as expired so others don't see it
    if (selectedPool?.id) {
      try {
        await poolService.completePoolSearch(selectedPool.id);
      } catch (err) {
        console.warn('[SearchingDriver] Failed to complete search on server:', err);
      }
    }
    
    // Call the callback if provided
    if (onSearchExpired) {
      onSearchExpired();
    }
  }, [currentPassengers, selectedPool?.id, onDriverFound, onSearchExpired]);

  // Countdown timer
  useEffect(() => {
    if (searchExpired) return; // Don't continue countdown if already expired
    
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Timer expired - handle based on passenger count
          handleSearchExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleSearchExpiry, searchExpired]);

  // Watch for pool status changes - navigate when pool is ready or has driver
  useEffect(() => {
    if (poolStatus === 'WAITING_FOR_DRIVER' || poolStatus === 'READY_TO_START' || hasDriver) {
      // Pool has progressed, navigate to trip progress
      if (onDriverFound) {
        onDriverFound();
      }
    }
    // If pool was cancelled by server, show expired state
    if (poolStatus === 'CANCELLED' || poolError?.includes('cancelled') || poolError?.includes('no longer available')) {
      setSearchExpired(true);
    }
  }, [poolStatus, hasDriver, poolError, onDriverFound]);

  // Handle creating a new pool after search expired
  const handleCreateNewPool = useCallback(async () => {
    if (!pickupLocation || !selectedDestination || !selectedPool) return;
    
    setIsCreatingNewPool(true);
    try {
      // First cancel the current pool/trip
      await cancelTrip();
      
      // Create a new pool with the same parameters
      const result = await poolService.createPool({
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        pickup_address: pickupLocation.address || pickupLocation.name,
        destination_lat: selectedDestination.latitude!,
        destination_lng: selectedDestination.longitude!,
        destination_address: selectedDestination.address || selectedDestination.name,
        vehicle_type: selectedPool.vehicle_type,
        max_passengers: selectedPool.max_passengers,
        gender_restriction: selectedPool.gender_restriction,
      });
      
      if (result.success && result.data?.pool) {
        // Start new trip with new pool
        startTrip(result.data.pool);
        // Reset the search state
        setSearchExpired(false);
        setRemainingSeconds(SEARCH_TIMEOUT_SECONDS);
      }
    } catch (err) {
      console.error('[SearchingDriver] Failed to create new pool:', err);
    } finally {
      setIsCreatingNewPool(false);
    }
  }, [pickupLocation, selectedDestination, selectedPool, cancelTrip, startTrip]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 1200);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    return () => {
      clearInterval(interval);
    };
  }, [scaleAnim, opacityAnim]);

  // Show "No pool found" state when search expired with no riders
  if (searchExpired) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-8 pb-24">
        <View className="flex-1 items-center justify-center gap-6">
          {/* No match icon */}
          <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center">
            <Users size={48} color="#9ca3af" />
          </View>

          {/* Message */}
          <View className="items-center gap-2">
            <Text className="text-2xl font-semibold text-center text-gray-800">No Riders Found</Text>
            <Text className="text-gray-500 text-center px-4">
              No one joined your pool within the search time. You can create a new pool to try again.
            </Text>
          </View>

          {/* Create New Pool Button */}
          <TouchableOpacity
            onPress={handleCreateNewPool}
            disabled={isCreatingNewPool}
            className="bg-blue-600 rounded-xl px-8 py-4 flex-row items-center gap-3"
            style={{ opacity: isCreatingNewPool ? 0.7 : 1 }}
          >
            {isCreatingNewPool ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Plus size={24} color="#ffffff" />
            )}
            <Text className="text-white font-semibold text-lg">
              {isCreatingNewPool ? 'Creating...' : 'Create New Pool'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cancel Button */}
        <Button
          variant="outline"
          onPress={onCancel}
          className="w-full h-14 border-2 border-gray-300"
        >
          <Text className="text-gray-600 font-semibold">Go Back</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white items-center justify-center p-8 pb-24">
      <View className="flex-1 items-center justify-center gap-8">
        {/* Animated Map Pin */}
        <View className="relative items-center justify-center">
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }}
            className="absolute w-32 h-32 bg-blue-500 rounded-full"
          />
          
          <View className="z-10">
            <MapPin size={96} color="#2563eb" />
          </View>
        </View>

        {/* Countdown Timer */}
        <View className="items-center bg-blue-50 px-6 py-3 rounded-full">
          <View className="flex-row items-center gap-2">
            <Clock size={20} color="#2563eb" />
            <Text className="text-2xl font-bold text-blue-600">{remainingSeconds}s</Text>
          </View>
          <Text className="text-xs text-blue-500 mt-1">Searching for riders</Text>
        </View>

        {/* Status Message */}
        <View className="items-center gap-2">
          <Text className="text-2xl font-semibold text-center">{statusMessages[messageIndex]}</Text>
          <Text className="text-gray-500 text-center">Your pool is visible to other users nearby</Text>
        </View>

        {/* Pool Info */}
        {poolDetails && (
          <View className="items-center bg-gray-50 px-4 py-3 rounded-xl">
            <View className="flex-row items-center gap-2">
              <Users size={16} color="#6b7280" />
              <Text className="text-gray-600">
                {poolDetails.current_passengers || 1}/{poolDetails.max_passengers || 4} riders
              </Text>
            </View>
          </View>
        )}

        {/* Loading dots */}
        <View className="flex-row gap-2">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className="w-3 h-3 bg-blue-600 rounded-full"
            />
          ))}
        </View>
      </View>

      <Button
        variant="outline"
        onPress={onCancel}
        className="w-full h-14 border-2 border-red-500"
      >
        <Text className="text-red-500 font-semibold">Cancel Ride</Text>
      </Button>
    </View>
  );
}
