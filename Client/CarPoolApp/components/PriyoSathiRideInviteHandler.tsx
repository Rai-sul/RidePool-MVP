import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Users, X, Check, MapPin, Navigation } from './Icons';
import LinearGradient from './LinearGradient';
import { priyoSathiService, RideInviteDetails } from '../services/priyoSathi.service';

export default function PriyoSathiRideInviteHandler() {
  const { priyoSathiInvite, clearPriyoSathiInvite } = useNotificationContext();
  const { userProfile, setSelectedPool, startTrip } = useGlobalContext();
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

    // Check if pool is joinable
    if (!inviteDetails.pool?.can_join) {
      let message = 'No pool available to join.';
      if (inviteDetails.pool) {
        if (inviteDetails.pool.current_passengers >= inviteDetails.pool.max_passengers) {
          message = `Pool is full (${inviteDetails.pool.current_passengers}/${inviteDetails.pool.max_passengers} riders).`;
        } else {
          message = `Pool status is "${inviteDetails.pool.status}". Cannot join at this time.`;
        }
      }
      Alert.alert('Cannot Join', message, [{ text: 'OK', onPress: handleDismiss }]);
      return;
    }

    setJoining(true);
    try {
      // Request location permission and get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Please enable location access to join the ride.',
          [{ text: 'OK' }]
        );
        setJoining(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Get address for the current location
      let pickupAddress = 'Current Location';
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (address) {
          pickupAddress = [address.name, address.street, address.city]
            .filter(Boolean)
            .join(', ') || 'Current Location';
        }
      } catch {
        // Use default address
      }

      // Accept the invite and join the pool
      const response = await priyoSathiService.acceptRideInvite(
        priyoSathiInvite.rideId,
        location.coords.latitude,
        location.coords.longitude,
        pickupAddress
      );

      if (response.success && response.data) {
        // Update global context with new pool
        if (setSelectedPool) {
          setSelectedPool({
            id: response.data.pool_id,
            status: 'WAITING_FOR_DRIVER',
          } as any);
        }

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
                {/* Destination Info */}
                {inviteDetails && (
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <View className="flex-row items-start gap-3">
                      <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mt-0.5">
                        <Navigation size={16} color="#16a34a" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-500 text-xs uppercase tracking-wide">Destination</Text>
                        <Text className="text-gray-900 font-medium mt-1">
                          {inviteDetails.destination.address || 'Unknown destination'}
                        </Text>
                        {inviteDetails.pool && (
                          <View className="flex-row items-center gap-2 mt-2">
                            <View className="bg-blue-100 px-2 py-1 rounded">
                              <Text className="text-blue-700 text-xs font-medium">
                                {inviteDetails.pool.current_passengers}/{inviteDetails.pool.max_passengers} riders
                              </Text>
                            </View>
                            <View className="bg-green-100 px-2 py-1 rounded">
                              <Text className="text-green-700 text-xs font-medium">
                                ৳{inviteDetails.pool.fare_per_person}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                <Text className="text-gray-700 font-medium text-center text-base">
                  Join {priyoSathiInvite.inviterName}'s ride?
                </Text>
                <Text className="text-gray-500 text-sm text-center mt-1">
                  Your current location will be used as pickup
                </Text>
                
                {/* Pool not available warning - show specific reason with retry option */}
                {inviteDetails && !inviteDetails.pool?.can_join && (
                  <View className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                    <Text className="text-amber-700 text-sm text-center">
                      {!inviteDetails.pool 
                        ? '⚠️ Pool is still being created. Please try again in a moment.'
                        : inviteDetails.pool.current_passengers >= inviteDetails.pool.max_passengers
                          ? `⚠️ Pool is full (${inviteDetails.pool.current_passengers}/${inviteDetails.pool.max_passengers} riders)`
                          : `⚠️ Pool status: ${inviteDetails.pool.status}. Cannot join at this time.`
                      }
                    </Text>
                    {/* Refresh button to retry fetching pool details */}
                    <TouchableOpacity
                      onPress={() => priyoSathiInvite?.rideId && fetchInviteDetails(priyoSathiInvite.rideId)}
                      className="mt-2 self-center"
                    >
                      <Text className="text-amber-600 font-medium text-sm underline">Tap to refresh</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Action Buttons */}
                <View className="flex-row gap-3 mt-5 w-full">
                  <TouchableOpacity
                    onPress={handleDismiss}
                    className="flex-1 py-3 border-2 border-gray-200 rounded-xl items-center"
                  >
                    <Text className="text-gray-700 font-semibold">Not Now</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleAccept}
                    disabled={joining || !inviteDetails?.pool?.can_join}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      isFemale ? 'bg-pink-500' : 'bg-blue-600'
                    }`}
                    style={{ opacity: joining || !inviteDetails?.pool?.can_join ? 0.5 : 1 }}
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
