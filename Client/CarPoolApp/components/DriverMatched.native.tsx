import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { MapPin, Phone, MessageSquare, Clock } from './Icons';
import { Navigation } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import type { Pool } from '../contexts/GlobalContext';

type DriverMatchedProps = {
  pool: Pool | null;
  onStartRide: () => void;
  onChatDriver?: () => void;
};

export default function DriverMatched({ pool, onStartRide, onChatDriver }: DriverMatchedProps) {
  // Simulate ride starting after a few seconds
  useEffect(() => {
    if (!pool) return;
    
    const timeout = setTimeout(() => {
      onStartRide();
    }, 5000);

    return () => clearTimeout(timeout);
  }, [pool, onStartRide]);

  if (!pool) return null;

  return (
    <View className="flex-1 bg-white">
      {/* Map View */}
      <View className="flex-1 bg-gray-100 relative">
        {/* Car icon (driver location) */}
        <View className="absolute top-1/3 left-1/4">
          <View className="bg-blue-600 p-3 rounded-full shadow-lg">
            <Navigation size={24} color="#ffffff" />
          </View>
        </View>

        {/* Pickup location pin */}
        <View className="absolute top-1/2 left-1/2">
          <MapPin size={40} color="#2563eb" fill="#2563eb" />
        </View>
      </View>

      {/* Driver Info Bottom Sheet */}
      <View className="bg-white rounded-t-3xl shadow-2xl">
        <View className="p-6 gap-5">
          {/* Driver arriving banner */}
          <View className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <View className="flex-row items-center gap-2">
              <Clock size={20} color="#16a34a" />
              <Text className="text-green-800 font-semibold">Arriving in 4 min</Text>
            </View>
          </View>

          {/* Driver Card */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-blue-200">
                <AvatarFallback className="bg-blue-500">
                  <Text className="text-white text-xl font-semibold">{pool.photo ?? pool.driver?.id?.charAt(0).toUpperCase() ?? 'D'}</Text>
                </AvatarFallback>
              </Avatar>
              
              <View className="gap-1">
                <Text className="text-xl font-semibold">{pool.driverName ?? 'Driver'}</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-sm text-gray-600">⭐ {pool.rating ?? pool.driver?.average_rating?.toFixed(1) ?? 'N/A'}</Text>
                </View>
                <Text className="text-sm text-gray-600">{pool.carModel ?? pool.vehicles?.model ?? pool.vehicle_type}</Text>
                <Text className="text-sm text-gray-500">{pool.licensePlate ?? pool.vehicles?.vehicle_number ?? ''}</Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              <Button size="icon" variant="outline" className="rounded-full w-12 h-12">
                <Phone size={20} color="#000" />
              </Button>
              <Button 
                size="icon" 
                variant="outline" 
                className="rounded-full w-12 h-12"
                onPress={onChatDriver}
              >
                <MessageSquare size={20} color="#000" />
              </Button>
            </View>
          </View>

          {/* Pickup Note */}
          <View className="bg-blue-50 p-4 rounded-xl gap-2">
            <View className="flex-row items-start gap-3">
              <MapPin size={20} color="#2563eb" />
              <View className="flex-1">
                <Text className="text-sm text-gray-600">Destination</Text>
                <Text className="font-medium">{pool.destination_address ?? 'Destination'}</Text>
              </View>
            </View>
          </View>

          {/* Pool info */}
          <View className="border-t border-gray-200 pt-4 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">Seats in pool</Text>
              <Text className="text-sm font-semibold">{pool.seatsLeft ?? (pool.max_passengers - pool.current_passengers)} available</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">Fare per person</Text>
              <Text className="text-sm font-semibold text-green-600">{pool.fare_per_person ?? 'TBD'} taka</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
