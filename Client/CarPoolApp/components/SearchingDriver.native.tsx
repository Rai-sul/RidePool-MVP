import React, { useState, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { MapPin, Users } from './Icons';
import { Button } from './ui/button';

type SearchingDriverProps = {
  onCancel: () => void;
  onDriverFound?: () => void;
};

const statusMessages = [
  'Setting up your pool...',
  'Preparing your trip...',
  'Almost ready...',
];

export default function SearchingDriver({ onCancel, onDriverFound }: SearchingDriverProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [opacityAnim] = useState(new Animated.Value(0.5));

  // Navigate to TripProgress after brief animation (2 seconds)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (onDriverFound) {
        onDriverFound();
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [onDriverFound]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 800);

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

        {/* Status Message */}
        <View className="items-center gap-2">
          <Text className="text-2xl font-semibold text-center">{statusMessages[messageIndex]}</Text>
          <Text className="text-gray-500 text-center">Please wait...</Text>
        </View>

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
