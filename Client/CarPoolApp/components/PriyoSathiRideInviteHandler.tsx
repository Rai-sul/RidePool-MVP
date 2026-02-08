import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useGlobalContext, toDisplayPool } from '../contexts/GlobalContext';
import { Users, X, Check, MapPin, Navigation } from './Icons';
import LinearGradient from './LinearGradient';
import { priyoSathiService, RideInviteDetails } from '../services/priyoSathi.service';
import { poolService } from '../services/pool.service';

export default function PriyoSathiRideInviteHandler() {
  const { priyoSathiInvite, clearPriyoSathiInvite } = useNotificationContext();
  const { userProfile, startTrip, pickupLocation, selectedDestination, selectedRideType } = useGlobalContext();
  const router = useRouter();
  
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<RideInviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFemale = userProfile?.gender === 'female';
  const accentGradient: [string, string] = isFemale ? ['#ec4899', '#e11d48'] : ['#2563eb', '#1d4ed8'];
  const accentColor = isFemale ? '#ec4899' : '#2563eb';

  // Fetch invite details when invite is received
  useEffect(() => {
    if (priyoSathiInvite?.rideId) {
      fetchInviteDetails(priyoSathiInvite.rideId);
    } else {
      setInviteDetails(null);
      setError(null);
    }
  }, [priyoSathiInvite?.rideId]);

  const fetchInviteDetails = async (rideId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await priyoSathiService.getRideInviteDetails(rideId);
      if (response.success && response.data) {
        setInviteDetails(response.data);
      } else {
        setError('Could not load invite details');
      }
    } catch (err: any) {
      console.error('[PriyoSathiInviteHandler] Error fetching invite details:', err);
      setError(err.message || 'Failed to load invite');
    } finally {
      setLoading(false);
    }
  };

  // Handle dismissing the invite
  const handleDismiss = () => {
    clearPriyoSathiInvite();
    setInviteDetails(null);
    setError(null);
  };

  // Handle accepting the invite - get current location and join the pool
  const handleAccept = async () => {
    if (!inviteDetails || !priyoSathiInvite) return;

    // If pool exists but isn't joinable, refresh once to avoid stale data
    if (inviteDetails.pool && !inviteDetails.pool.can_join) {
      try {
        const refreshed = await priyoSathiService.getRideInviteDetails(priyoSathiInvite.rideId);
        if (refreshed.success && refreshed.data) {
          setInviteDetails(refreshed.data);
          if (!refreshed.data.pool?.can_join) {
            Alert.alert(
              'Cannot Join',
              refreshed.data.pool
                ? `This pool is not accepting riders. Status: ${refreshed.data.pool.status} (${refreshed.data.pool.current_passengers}/${refreshed.data.pool.max_passengers})`
                : 'No pool available to join.',
              [{ text: 'OK', onPress: handleDismiss }]
            );
            return;
          }
        }
      } catch (err: any) {
        Alert.alert(
          'Cannot Join',
          err.message || 'Failed to refresh invite details.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // If pool details are missing, try a single refresh but allow join attempt anyway
    if (!inviteDetails.pool) {
      try {
        const refreshed = await priyoSathiService.getRideInviteDetails(priyoSathiInvite.rideId);
        if (refreshed.success && refreshed.data?.pool) {
          setInviteDetails(refreshed.data);
          if (!refreshed.data.pool.can_join) {
            Alert.alert(
              'Cannot Join',
              `This pool is not accepting riders. Status: ${refreshed.data.pool.status} (${refreshed.data.pool.current_passengers}/${refreshed.data.pool.max_passengers})`,
              [{ text: 'OK', onPress: handleDismiss }]
            );
            return;
          }
        }
      } catch {
        // Continue and let server resolve pool from the invite
      }
    }

    if (!pickupLocation?.latitude || !pickupLocation?.longitude) {
      Alert.alert(
        'Pickup Location Required',
        'Please set your pickup location before joining the pool.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!selectedDestination?.latitude || !selectedDestination?.longitude) {
      Alert.alert(
        'Destination Required',
        'Please set your destination before joining the pool.',
        [{ text: 'OK' }]
      );
      return;
    }

    setJoining(true);
    try {
      const pickupAddress = pickupLocation.address || pickupLocation.name || 'Pickup Location';
      const dropoffAddress = selectedDestination.address || selectedDestination.name || 'Destination';
      const genderRestriction = selectedRideType === 'female-only' ? 'FEMALE_ONLY' : 'ANY';

      // Accept the invite and join the pool
      const response = await priyoSathiService.acceptRideInvite(
        priyoSathiInvite.rideId,
        pickupLocation.latitude,
        pickupLocation.longitude,
        pickupAddress,
        selectedDestination.latitude,
        selectedDestination.longitude,
        dropoffAddress,
        genderRestriction
      );

      if (response.success && response.data) {
        const rideType = selectedRideType || (inviteDetails.gender_restriction === 'FEMALE_ONLY' ? 'female-only' : 'regular');
        const pickupOverride = pickupLocation || {
          name: inviteDetails.pickup.address || 'Pickup',
          address: inviteDetails.pickup.address || 'Pickup',
          latitude: inviteDetails.pickup.latitude,
          longitude: inviteDetails.pickup.longitude,
        };
        const destinationOverride = selectedDestination || {
          name: inviteDetails.destination.address || 'Destination',
          address: inviteDetails.destination.address || 'Destination',
          latitude: inviteDetails.destination.latitude,
          longitude: inviteDetails.destination.longitude,
        };

        let poolToUse: any = null;
        try {
          const poolResponse = await poolService.getPoolById(response.data.pool_id);
          if (poolResponse.success && poolResponse.data?.pool) {
            poolToUse = toDisplayPool(poolResponse.data.pool);
          }
        } catch {
          // Fall back to invite details
        }

        if (!poolToUse) {
          poolToUse = {
            id: response.data.pool_id,
            creator_user_id: '',
            driver_id: null,
            vehicle_id: null,
            status: inviteDetails.pool?.status || 'WAITING_FOR_RIDERS',
            destination_lat: inviteDetails.destination.latitude,
            destination_lng: inviteDetails.destination.longitude,
            destination_address: inviteDetails.destination.address || null,
            destination_h3_index: '',
            vehicle_type: inviteDetails.vehicle_type,
            gender_restriction: inviteDetails.gender_restriction,
            current_passengers: inviteDetails.pool?.current_passengers || 2,
            max_passengers: inviteDetails.pool?.max_passengers || 4,
            viability_score: null,
            score_breakdown: null,
            fare_per_person: inviteDetails.pool?.fare_per_person || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            started_at: null,
            completed_at: null,
            deleted_at: null,
          };
        }

        // Start trip with correct pool + locations so floating button works
        startTrip(poolToUse, {
          pickupLocation: pickupOverride,
          destination: destinationOverride,
          rideType,
        });

        clearPriyoSathiInvite();
        setInviteDetails(null);

        // Navigate to the searching/trip progress screen
        router.push('/searching');

        Alert.alert(
          'Joined Successfully! 🎉',
          `You've joined ${inviteDetails.inviter_name}'s pool!`,
          [{ text: 'Great!' }]
        );
      } else {
        throw new Error('Failed to join pool');
      }
    } catch (err: any) {
      console.error('[PriyoSathiInviteHandler] Error accepting invite:', err);
      Alert.alert(
        'Could Not Join',
        err.message || 'Failed to join the pool. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setJoining(false);
    }
  };

  if (!priyoSathiInvite) {
    return null;
  }

  return (
    <Modal
      visible={!!priyoSathiInvite}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
          {/* Header */}
          <LinearGradient
            colors={accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-5"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
                  <Users size={24} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-white text-lg font-bold">Priyo Sathi Invite!</Text>
                  <Text className="text-white/80 text-sm">
                    {priyoSathiInvite.inviterName} wants to ride together
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleDismiss}
                className="w-8 h-8 bg-white/20 rounded-full items-center justify-center"
              >
                <X size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Content */}
          <View className="p-5">
            {loading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color={accentColor} />
                <Text className="text-gray-500 mt-3">Loading invite details...</Text>
              </View>
            ) : error ? (
              <View className="items-center py-6">
                <Text className="text-red-500 text-center mb-4">{error}</Text>
                <TouchableOpacity
                  onPress={() => priyoSathiInvite?.rideId && fetchInviteDetails(priyoSathiInvite.rideId)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  <Text className="text-gray-700">Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="py-2">
                {/* Ride Details */}
                {inviteDetails && (
                  <View className="space-y-3 mb-4">
                    {/* Pickup Location */}
                    <View className="bg-gray-50 rounded-xl p-4">
                      <View className="flex-row items-start gap-3">
                        <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mt-0.5">
                          <MapPin size={16} color="#2563eb" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-gray-500 text-xs uppercase tracking-wide">Pickup</Text>
                          <Text className="text-gray-900 font-medium mt-1">
                            {inviteDetails.pickup.address || 'Unknown pickup'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Destination */}
                    <View className="bg-gray-50 rounded-xl p-4">
                      <View className="flex-row items-start gap-3">
                        <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mt-0.5">
                          <Navigation size={16} color="#16a34a" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-gray-500 text-xs uppercase tracking-wide">Destination</Text>
                          <Text className="text-gray-900 font-medium mt-1">
                            {inviteDetails.destination.address || 'Unknown destination'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Pool Info: Fare, Duration, Riders */}
                    {inviteDetails.pool && (
                      <View className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4">
                        <View className="items-center flex-1">
                          <Text className="text-gray-500 text-xs uppercase">Fare</Text>
                          <Text className="text-green-700 font-bold text-lg mt-1">
                            ৳{inviteDetails.pool.fare_per_person}
                          </Text>
                        </View>
                        {inviteDetails.pool.estimated_duration_minutes && (
                          <View className="items-center flex-1 border-l border-gray-200">
                            <Text className="text-gray-500 text-xs uppercase">Duration</Text>
                            <Text className="text-gray-900 font-bold text-lg mt-1">
                              {inviteDetails.pool.estimated_duration_minutes} min
                            </Text>
                          </View>
                        )}
                        <View className="items-center flex-1 border-l border-gray-200">
                          <Text className="text-gray-500 text-xs uppercase">Riders</Text>
                          <Text className="text-blue-700 font-bold text-lg mt-1">
                            {inviteDetails.pool.current_passengers}/{inviteDetails.pool.max_passengers}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                <Text className="text-gray-700 font-medium text-center text-base">
                  Join {priyoSathiInvite.inviterName}'s ride?
                </Text>
                <Text className="text-gray-500 text-sm text-center mt-1">
                  Your current location will be used as pickup
                </Text>
                
                {/* Pool not available warning */}
                {inviteDetails?.pool && !inviteDetails.pool.can_join && (
                  <View className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                    <Text className="text-amber-700 text-sm text-center">
                      ⚠️ This pool may not be accepting riders. Tap Join to refresh.
                    </Text>
                  </View>
                )}
                
                {/* Action Buttons */}
                <View className="flex-row gap-3 mt-5 w-full">
                  <TouchableOpacity
                    onPress={handleDismiss}
                    className="flex-1 py-3 border-2 border-gray-200 rounded-xl items-center"
                  >
                    <Text className="text-gray-700 font-semibold">Decline</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleAccept}
                    disabled={joining || !inviteDetails}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      isFemale ? 'bg-pink-500' : 'bg-blue-600'
                    }`}
                    style={{ opacity: joining || !inviteDetails ? 0.5 : 1 }}
                  >
                    {joining ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <View className="flex-row items-center gap-2">
                        <Check size={18} color="#ffffff" />
                        <Text className="text-white font-semibold">Join Pool</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
