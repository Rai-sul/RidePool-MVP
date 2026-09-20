import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MapPin, Shield, Phone, Share2, Navigation, Clock } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import type { Pool, Destination } from '../contexts/GlobalContext';
import LinearGradient from './LinearGradient';

type ActiveRideProps = {
  pool: Pool | null;
  destination: Destination | null;
  onComplete: () => void;
};

export default function ActiveRide({ pool, destination, onComplete }: ActiveRideProps) {
  const [progress, setProgress] = useState(30);
  const [eta, setEta] = useState(18);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => onComplete(), 1000);
          return 100;
        }
        return next;
      });
      setEta((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [onComplete]);

  if (!pool || !destination) return null;

  return (
    <View className="h-full w-full flex flex-col bg-white">
      {/* Map View */}
      <LinearGradient
        colors={['#e0e0e0', '#f0f0f0', '#e0f2f7']} // Approximate colors for from-gray-200 via-gray-100 to-blue-50
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1 relative"
      >
        {/* Simulated map */}
        <View className="absolute inset-0 opacity-20">
          <View className="absolute top-1/4 left-0 w-full h-1 bg-gray-400 rotate-12"></View>
          <View className="absolute top-1/2 left-0 w-full h-1 bg-gray-400 -rotate-6"></View>
          <View className="absolute top-3/4 left-0 w-full h-1 bg-gray-400 rotate-3"></View>
        </View>

        {/* Route with multiple pins */}
        <View className="absolute inset-0">
          {/* Car position (moving) */}
          <View
            className="absolute top-1/4 left-1/4"
          >
            <View className="bg-blue-600 p-3 rounded-full shadow-lg">
              <Navigation className="w-6 h-6 text-white" />
            </View>
          </View>

          {/* Drop-off points */}
          <View className="absolute top-1/3 right-1/3">
            <View className="bg-gray-400 p-2 rounded-full">
              <MapPin className="w-5 h-5 text-white fill-white" />
            </View>
            <Text className="text-xs mt-1 bg-white px-2 py-1 rounded shadow text-center">Stop 1</Text>
          </View>

          <View className="absolute bottom-1/3 right-1/4">
            <View className="bg-red-600 p-2 rounded-full shadow-lg">
              <MapPin className="w-6 h-6 text-white fill-white" />
            </View>
            <Text className="text-xs mt-1 bg-white px-2 py-1 rounded shadow text-center">Your Stop</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Bottom Sheet */}
      <View className="bg-white rounded-t-3xl shadow-2xl">
        <ScrollView className="p-6 space-y-5" contentContainerStyle={{ paddingBottom: 64 }}> {/* Add paddingBottom here */}
          {/* Driver Info */}
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
                  {pool.photo ?? pool.driver?.id?.charAt(0).toUpperCase() ?? 'D'}
                </AvatarFallback>
              </Avatar>
              <View>
                <Text>{pool.driverName ?? 'Driver'}</Text>
                <Text className="text-sm text-gray-500">{pool.carModel ?? pool.vehicles?.model ?? pool.vehicle_type}</Text>
              </View>
            </View>
          </View>

          {/* ETA */}
          <View className="bg-blue-50 p-4 rounded-xl flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <View>
                <Text className="text-sm text-gray-600">Your ETA</Text>
                <Text className="text-xl">{eta} min</Text>
              </View>
            </View>
            <View>
              <Text className="text-sm text-gray-600 text-right">Destination</Text>
              <Text className="text-sm text-right">{destination.name ?? pool.destination_address ?? 'Destination'}</Text>
            </View>
          </View>

          {/* Trip Progress */}
          <View className="space-y-3">
            <View className="flex flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">Trip Progress</Text>
              <Text className="text-sm">{progress}%</Text>
            </View>
            <Progress value={progress} className="h-2" />
            
            <View className="flex flex-row items-center justify-between">
              <Text className="text-xs text-gray-500">Picked Up</Text>
              <Text className="text-xs text-gray-500">Drop Off 1</Text>
              <Text className="text-xs text-gray-500">Your Drop Off</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex flex-row gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-12 gap-2 active:scale-95 transition-transform">
              <Shield className="w-5 h-5" />
              Trip Status
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 active:scale-95 transition-transform">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 active:scale-95 transition-transform">
              <Share2 className="w-5 h-5" />
            </Button>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
