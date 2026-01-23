import React, { useState, useEffect } from 'react';
import { View, Text, Animated } from 'react-native-web';
import { MapPin, Users, Clock } from './Icons';
import { Button } from './ui/button';
import { useGlobalContext } from '../contexts/GlobalContext';
import { usePoolRealtime } from '../hooks/usePoolRealtime';

type SearchingDriverProps = {
  onCancel: () => void;
  onDriverFound?: () => void;
};

const SEARCH_TIMEOUT_SECONDS = 30;

const statusMessages = [
  'Waiting for other riders...',
  'Looking for matching pools...',
  'Almost there...',
];

export default function SearchingDriver({ onCancel, onDriverFound }: SearchingDriverProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [opacityAnim] = useState(new Animated.Value(0.5));
  const [remainingSeconds, setRemainingSeconds] = useState(SEARCH_TIMEOUT_SECONDS);
  
  const { selectedPool, userProfile } = useGlobalContext();
  
  // Use realtime pool updates
  const { poolStatus, hasDriver, pool: poolDetails } = usePoolRealtime(
    selectedPool?.id || null,
    userProfile?.id || null
  );

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Timer expired, navigate to trip progress
          if (onDriverFound) {
            onDriverFound();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDriverFound]);

  // Watch for pool status changes - navigate when pool is ready or has driver
  useEffect(() => {
    if (poolStatus === 'WAITING_FOR_DRIVER' || poolStatus === 'READY_TO_START' || hasDriver) {
      // Pool has progressed, navigate to trip progress
      if (onDriverFound) {
        onDriverFound();
      }
    }
  }, [poolStatus, hasDriver, onDriverFound]);

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

    return () => clearInterval(interval);
  }, [scaleAnim, opacityAnim]);

  return (
    <View className="flex-1 bg-white items-center justify-center p-8">
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
            <MapPin size={96} color="#2563eb" fill="#2563eb" />
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
