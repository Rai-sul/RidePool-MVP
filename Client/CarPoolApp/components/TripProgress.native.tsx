import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Phone, MessageCircle, User, Navigation, Clock, Star } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import type { UserProfile } from '../contexts/GlobalContext';

type TripProgressProps = {
  userProfile: UserProfile | null;
  onComplete?: () => void;
  onChatDriver?: () => void;
};

export default function TripProgress({ userProfile, onComplete, onChatDriver }: TripProgressProps) {
  const [progress, setProgress] = useState(15);
  const [tripStatus, setTripStatus] = useState<'waiting' | 'on-the-way' | 'arrived' | 'in-progress' | 'completed'>('waiting');
  
  const isFemale = userProfile?.gender === 'female';
  const accentColor = isFemale ? 'pink' : 'blue';
  const accentBg = isFemale ? 'bg-pink-500' : 'bg-blue-600';
  const accentText = isFemale ? 'text-pink-600' : 'text-blue-600';
  const accentBorder = isFemale ? 'border-pink-500' : 'border-blue-600';

  // Driver info
  const driver = {
    name: 'Ahmed Khan',
    initial: 'A',
    rating: 4.8,
    trips: 1250,
    vehicle: 'Toyota Corolla',
    plateNumber: 'DHA-1234',
    eta: '5 mins',
    phone: '+880 1711-123456'
  };

  // Co-riders
  const coRiders = [
    { name: 'Fatima Ali', initial: 'F' },
    { name: 'Sarah Ahmed', initial: 'S' },
  ];

  // Simulate trip progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setTripStatus('completed');
          return 100;
        }
        return prev + 5;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Update status based on progress
  useEffect(() => {
    if (progress < 20) setTripStatus('waiting');
    else if (progress < 40) setTripStatus('on-the-way');
    else if (progress < 50) setTripStatus('arrived');
    else if (progress < 100) setTripStatus('in-progress');
    else setTripStatus('completed');
  }, [progress]);

  const getStatusText = () => {
    switch (tripStatus) {
      case 'waiting': return 'Driver is on the way';
      case 'on-the-way': return 'Driver arriving soon';
      case 'arrived': return 'Driver has arrived';
      case 'in-progress': return 'Trip in progress';
      case 'completed': return 'Trip completed';
      default: return 'Preparing trip';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Map Placeholder */}
        <View className="h-64 bg-gray-200 relative">
          <View className="absolute inset-0 items-center justify-center">
            <MapPin className="w-16 h-16 text-gray-400" />
            <Text className="text-gray-500 mt-2">Live Map View</Text>
          </View>
          
          {/* Status Badge */}
          <View className={`absolute top-4 left-4 ${accentBg} px-4 py-2 rounded-full`}>
            <Text className="text-white font-semibold">{getStatusText()}</Text>
          </View>

          {/* ETA Badge */}
          {tripStatus !== 'completed' && (
            <View className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full border-2 border-gray-200">
              <View className="flex-row items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <Text className="font-semibold">{driver.eta}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        <View className="px-6 py-4 bg-white">
          <Progress value={progress} className="h-2" />
          <View className="flex-row justify-between mt-2">
            <Text className="text-sm text-gray-500">Pickup</Text>
            <Text className="text-sm text-gray-500">Destination</Text>
          </View>
        </View>

        {/* Driver Card */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">Your Driver</Text>
          
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full items-center justify-center bg-gray-300 border-2 border-white shadow-md">
              <Text className="text-gray-800 text-xl font-semibold">{driver.initial}</Text>
            </View>
            
            <View className="flex-1">
              <Text className="text-lg font-semibold">{driver.name}</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Star className="w-4 h-4 text-yellow-500" fill="#eab308" />
                <Text className="text-sm text-gray-600">{driver.rating} • {driver.trips} trips</Text>
              </View>
              <Text className="text-sm text-gray-500 mt-1">{driver.vehicle} • {driver.plateNumber}</Text>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity className={`w-12 h-12 rounded-full ${accentBg} items-center justify-center`}>
                <Phone className="w-5 h-5 text-white" />
              </TouchableOpacity>
              <TouchableOpacity 
                className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center"
                onPress={onChatDriver}
              >
                <MessageCircle className="w-5 h-5 text-gray-600" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Co-Riders Card */}
        {coRiders.length > 0 && (
          <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
            <Text className="font-semibold mb-4">Co-Riders ({coRiders.length})</Text>
            
            <View className="gap-3">
              {coRiders.map((rider, index) => (
                <View key={index} className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full items-center justify-center bg-gray-300 border-2 border-white">
                    <Text className="text-gray-800 font-semibold">{rider.initial}</Text>
                  </View>
                  <Text className="text-gray-800">{rider.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Route Info */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">Route</Text>
          
          <View className="gap-4">
            <View className="flex-row items-start gap-3">
              <View className="w-3 h-3 rounded-full bg-green-500 mt-1" />
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Pickup</Text>
                <Text className="font-medium">Gulshan 2, Dhaka</Text>
              </View>
            </View>

            <View className="flex-row items-start gap-3">
              <View className="w-3 h-3 rounded-full bg-red-500 mt-1" />
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Drop-off</Text>
                <Text className="font-medium">Dhanmondi 27, Dhaka</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trip Details */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">Trip Details</Text>
          
          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Distance</Text>
              <Text className="font-medium">12.5 km</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Estimated Time</Text>
              <Text className="font-medium">25 mins</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Fare</Text>
              <Text className={`font-semibold ${accentText}`}>৳ 180</Text>
            </View>
          </View>
        </View>

        {/* SOS Button */}
        {tripStatus !== 'completed' && (
          <View className="mx-6 mt-4">
            <Button
              variant="outline"
              className="w-full border-2 border-red-500"
            >
              <Text className="text-red-500 font-semibold">🚨 Emergency SOS</Text>
            </Button>
          </View>
        )}

        {/* Complete Trip Button */}
        {tripStatus === 'completed' && (
          <View className="mx-6 mt-4">
            <Button
              onPress={onComplete}
              className={`w-full ${accentBg}`}
            >
              <Text className="text-white font-semibold">Confirm Payment</Text>
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
