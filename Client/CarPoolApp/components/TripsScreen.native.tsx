import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, MapPin, ChevronRight, AlertCircle, X, User, Phone, Car, Clock } from './Icons';
import { Button } from './ui/button';
import { UserProfile } from '../contexts/GlobalContext';

const pastTrips = [
  {
    id: '1',
    date: 'Oct 23, 2025',
    time: '2:45 PM',
    from: 'Current Location',
    fromAddress: 'House 45, Road 12, Gulshan 1, Dhaka',
    to: 'Airport',
    toAddress: 'Hazrat Shahjalal International Airport, Dhaka',
    driver: 'Raisul',
    driverPhone: '+880 1711-123456',
    carModel: 'Toyota Corolla',
    licensePlate: 'Dhaka Metro Ka 12-3456',
    amount: 185,
    distance: '12.5 km',
    duration: '25 min',
    status: 'completed',
  },
  {
    id: '2',
    date: 'Oct 22, 2025',
    time: '8:30 AM',
    from: 'Home',
    fromAddress: 'House 23, Road 8, Dhanmondi, Dhaka',
    to: 'Work',
    toAddress: 'Gulshan Avenue, Gulshan 2, Dhaka',
    driver: 'Fatima',
    driverPhone: '+880 1712-234567',
    carModel: 'Honda Civic',
    licensePlate: 'Dhaka Metro Ga 45-6789',
    amount: 120,
    distance: '8.2 km',
    duration: '18 min',
    status: 'completed',
  },
];

interface TripsScreenProps {
  userProfile: UserProfile | null;
  onBookRide?: () => void;
}

export default function TripsScreen({ userProfile, onBookRide }: TripsScreenProps) {
  const [selectedTrip, setSelectedTrip] = useState<typeof pastTrips[0] | null>(null);
  const [activeTab, setActiveTab] = useState<'past' | 'upcoming'>('past');
  const isFemale = userProfile?.gender === 'female';

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Tabs */}
      <View className="flex-row border-b border-gray-200">
        <TouchableOpacity
          onPress={() => setActiveTab('past')}
          className={`flex-1 h-12 items-center justify-center ${
            activeTab === 'past' ? 'border-b-2 border-blue-600' : ''
          }`}
          activeOpacity={0.7}
        >
          <Text className={activeTab === 'past' ? 'text-blue-600 font-semibold' : 'text-gray-600'}>
            Past Trips
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('upcoming')}
          className={`flex-1 h-12 items-center justify-center ${
            activeTab === 'upcoming' ? 'border-b-2 border-blue-600' : ''
          }`}
          activeOpacity={0.7}
        >
          <Text className={activeTab === 'upcoming' ? 'text-blue-600 font-semibold' : 'text-gray-600'}>
            Upcoming
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'past' ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 64 }}>
          {pastTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              onPress={() => setSelectedTrip(trip)}
              className="p-5 border-b border-gray-100"
              activeOpacity={0.7}
            >
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1 gap-3">
                  <View className="flex-row items-center gap-2">
                    <Calendar size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-600">{trip.date}</Text>
                    <Text className="text-gray-600">•</Text>
                    <Text className="text-sm text-gray-600">{trip.time}</Text>
                  </View>

                  <View className="gap-2">
                    <View className="flex-row items-start gap-2">
                      <View className="w-3 h-3 bg-blue-600 rounded-full mt-1.5" />
                      <View className="flex-1">
                        <Text className="text-sm text-gray-500">Pickup</Text>
                        <Text className="font-medium">{trip.from}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-start gap-2">
                      <MapPin size={16} color="#dc2626" fill="#dc2626" />
                      <View className="flex-1">
                        <Text className="text-sm text-gray-500">Drop-off</Text>
                        <Text className="font-medium">{trip.to}</Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-4">
                    <Text className="text-sm text-gray-600">Driver: {trip.driver}</Text>
                    <View className="w-px h-4 bg-gray-300" />
                    <Text className="text-sm font-semibold">{trip.amount} taka</Text>
                  </View>
                </View>

                <ChevronRight size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
            <Calendar size={32} color="#9ca3af" />
          </View>
          <Text className="text-xl font-semibold mb-2">No upcoming trips</Text>
          <Text className="text-gray-500 mb-6 text-center">Book a ride to get started</Text>
          <Button 
            className={isFemale ? 'bg-pink-500' : 'bg-blue-600'}
            onPress={onBookRide}
          >
            <Text className="text-white font-semibold">Book a Ride</Text>
          </Button>
        </View>
      )}

      {/* Report Issue Button */}
      <View className="p-4 pb-24 border-t border-gray-200">
        <Button variant="outline" className="w-full gap-2 h-12">
          <View className="flex-row items-center gap-2">
            <AlertCircle size={18} color="#000" />
            <Text className="font-medium">Report an Issue</Text>
          </View>
        </Button>
      </View>

      {/* Trip Details Modal */}
      <Modal
        visible={selectedTrip !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTrip(null)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl h-[90%]">
            <View className="p-6 pb-4 flex-row items-start justify-between border-b border-gray-200">
              <Text className="text-xl font-bold">Trip Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedTrip(null)}
                className="p-1"
                activeOpacity={0.7}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedTrip && (
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-6 pb-6 gap-5">
                  {/* Date and Time */}
                  <View className="flex-row items-center gap-2">
                    <Calendar size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-600">{selectedTrip.date}</Text>
                    <Text className="text-gray-600">•</Text>
                    <Text className="text-sm text-gray-600">{selectedTrip.time}</Text>
                  </View>

                  {/* Trip Route */}
                  <View className="bg-gray-50 rounded-xl p-4 gap-3">
                    <View className="flex-row items-start gap-3">
                      <View className="w-3 h-3 bg-blue-600 rounded-full mt-1.5" />
                      <View className="flex-1">
                        <Text className="text-sm text-gray-500 mb-1">Pickup Location</Text>
                        <Text className="text-sm">{selectedTrip.fromAddress}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-start gap-3">
                      <MapPin size={16} color="#dc2626" fill="#dc2626" />
                      <View className="flex-1">
                        <Text className="text-sm text-gray-500 mb-1">Drop-off Location</Text>
                        <Text className="text-sm">{selectedTrip.toAddress}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Payment */}
                  <View className="border-t border-gray-200 pt-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-600">Total Fare</Text>
                      <Text className="text-2xl font-bold">{selectedTrip.amount} ৳</Text>
                    </View>
                    <Text className="text-xs text-gray-500 mt-1 text-right">Paid via RideShare Wallet</Text>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-3 pt-2">
                    <Button variant="outline" className="flex-1">
                      <Text>Get Receipt</Text>
                    </Button>
                    <Button 
                      className={`flex-1 ${isFemale ? 'bg-pink-500' : 'bg-blue-600'}`}
                    >
                      <Text className="text-white font-semibold">Rebook</Text>
                    </Button>
                  </View>
                </View>
              </ScrollView>
            )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}