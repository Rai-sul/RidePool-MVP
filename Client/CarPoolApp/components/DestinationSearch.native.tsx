import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MapPin, Search, Clock, Star, X } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { Destination } from '../contexts/GlobalContext';

type DestinationSearchProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination: (destination: Destination) => void;
};

const recentDestinations = [
  { name: 'Gulshan Office Complex', address: 'Gulshan 2, Dhaka 1212', latitude: 23.7925, longitude: 90.4078 },
  { name: 'Bashundhara City', address: 'Panthapath, Dhaka 1215', latitude: 23.7506, longitude: 90.3902 },
  { name: 'Uttara Sector 7', address: 'Uttara, Dhaka 1230', latitude: 23.8759, longitude: 90.3795 },
];

const popularDestinations = [
  { name: 'Airport', address: 'Hazrat Shahjalal International Airport', latitude: 23.8513, longitude: 90.4089 },
  { name: 'Dhanmondi Lake', address: 'Dhanmondi, Dhaka 1209', latitude: 23.7461, longitude: 90.3742 },
  { name: 'Banani 11', address: 'Banani, Dhaka 1213', latitude: 23.7937, longitude: 90.4066 },
  { name: 'Mirpur 10', address: 'Mirpur, Dhaka 1216', latitude: 23.8069, longitude: 90.3687 },
  { name: 'Mohakhali DOHS', address: 'Mohakhali, Dhaka 1206', latitude: 23.7808, longitude: 90.4064 },
];

export default function DestinationSearch({ isOpen, onClose, onSelectDestination }: DestinationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDestinations = searchQuery
    ? popularDestinations.filter(
        (dest) =>
          dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dest.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : popularDestinations;

  const handleSelect = (destination: Destination) => {
    onSelectDestination(destination);
    onClose();
    setSearchQuery('');
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50">
          <TouchableOpacity 
            className="flex-1"
            activeOpacity={1}
            onPress={onClose}
          />
          <View className="bg-white rounded-t-3xl h-[90%]">
          {/* Header */}
          <View className="flex-row items-center gap-3 p-4 border-b border-gray-200">
            <Button
              variant="ghost"
              size="icon"
              onPress={onClose}
              className="rounded-full h-10 w-10"
            >
              <X className="w-5 h-5" color="#000" />
            </Button>
            <View className="flex-1 relative">
              <View className="absolute left-3 top-0 bottom-0 justify-center z-10" style={{ pointerEvents: 'none' }}>
                <Search className="w-5 h-5" color="#9ca3af" />
              </View>
              <Input
                autoFocus
                placeholder="Where to?"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="pl-10 h-12"
              />
            </View>
          </View>

          {/* Current Location */}
          <View className="border-b border-gray-200">
            <TouchableOpacity
              onPress={() =>
                handleSelect({ name: 'Current Location', address: 'Your current position' })
              }
              className="p-4 flex-row items-center gap-3"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                <MapPin className="w-5 h-5" color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="font-medium">Use Current Location</Text>
                <Text className="text-sm text-gray-500">Via GPS</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Recent Searches */}
            {!searchQuery && recentDestinations.length > 0 && (
              <View className="p-4 gap-3">
                <View className="flex-row items-center gap-2">
                  <Clock className="w-4 h-4" color="#6b7280" />
                  <Text className="text-sm font-semibold text-gray-600">Recent</Text>
                </View>
                <View className="gap-2">
                  {recentDestinations.map((dest, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleSelect(dest)}
                      className="p-3 flex-row items-start gap-3 bg-gray-50 rounded-xl"
                      activeOpacity={0.7}
                    >
                      <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                        <MapPin className="w-5 h-5" color="#6b7280" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-medium">{dest.name}</Text>
                        <Text className="text-sm text-gray-500">{dest.address}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Popular/Search Results */}
            <View className="p-4 gap-3">
              <View className="flex-row items-center gap-2">
                <Star className="w-4 h-4" color="#6b7280" />
                <Text className="text-sm font-semibold text-gray-600">
                  {searchQuery ? 'Search Results' : 'Popular Destinations'}
                </Text>
              </View>
              <View className="gap-2">
                {filteredDestinations.length > 0 ? (
                  filteredDestinations.map((dest, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleSelect(dest)}
                      className="p-3 flex-row items-start gap-3 bg-gray-50 rounded-xl"
                      activeOpacity={0.7}
                    >
                      <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                        <MapPin className="w-5 h-5" color="#6b7280" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-medium">{dest.name}</Text>
                        <Text className="text-sm text-gray-500">{dest.address}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View className="items-center py-8">
                    <Text className="text-gray-500">No destinations found</Text>
                    <Text className="text-sm text-gray-400">Try a different search</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}