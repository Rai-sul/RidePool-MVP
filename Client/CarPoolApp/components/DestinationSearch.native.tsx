import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { MapPin, Search, Clock, Star, X, Navigation } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { Destination } from '../contexts/GlobalContext';
import * as ExpoLocation from 'expo-location';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

type DestinationSearchProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination: (destination: Destination) => void;
};

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

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
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search function using Google Places Autocomplete
  const searchPlaces = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !GOOGLE_MAPS_API_KEY) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:bd&types=geocode|establishment&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Place search error:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect for debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.length >= 2) {
      debounceTimer.current = setTimeout(() => {
        searchPlaces(searchQuery);
      }, 300) as ReturnType<typeof setTimeout>;
    } else {
      setPredictions([]);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, searchPlaces]);

  // Filter local destinations when API is not available or no predictions
  const filteredDestinations = searchQuery && predictions.length === 0 && !isLoading
    ? popularDestinations.filter(
        (dest) =>
          dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dest.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelect = (destination: Destination) => {
    onSelectDestination(destination);
    onClose();
    setSearchQuery('');
    setPredictions([]);
  };

  const handlePlaceSelect = async (prediction: PlacePrediction) => {
    if (!GOOGLE_MAPS_API_KEY) {
      handleSelect({
        name: prediction.structured_formatting.main_text,
        address: prediction.structured_formatting.secondary_text,
        latitude: 23.8103,
        longitude: 90.4125,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,name,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.result?.geometry?.location) {
        handleSelect({
          name: data.result.name || prediction.structured_formatting.main_text,
          address: data.result.formatted_address || prediction.structured_formatting.secondary_text,
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
        });
      } else {
        handleSelect({
          name: prediction.structured_formatting.main_text,
          address: prediction.structured_formatting.secondary_text,
          latitude: 23.8103,
          longitude: 90.4125,
        });
      }
    } catch (error) {
      console.error('Place details error:', error);
      handleSelect({
        name: prediction.structured_formatting.main_text,
        address: prediction.structured_formatting.secondary_text,
        latitude: 23.8103,
        longitude: 90.4125,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setIsGettingCurrentLocation(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        handleSelect({
          name: 'Current Location',
          address: 'Dhaka, Bangladesh',
          latitude: 23.8103,
          longitude: 90.4125,
        });
        return;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      if (GOOGLE_MAPS_API_KEY) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          const address = data.results?.[0]?.formatted_address || 'Your current position';
          
          handleSelect({
            name: 'Current Location',
            address,
            latitude,
            longitude,
          });
        } catch {
          handleSelect({
            name: 'Current Location',
            address: 'Your current position',
            latitude,
            longitude,
          });
        }
      } else {
        handleSelect({
          name: 'Current Location',
          address: 'Your current position',
          latitude,
          longitude,
        });
      }
    } catch (error) {
      console.error('Location error:', error);
      handleSelect({
        name: 'Current Location',
        address: 'Dhaka, Bangladesh',
        latitude: 23.8103,
        longitude: 90.4125,
      });
    } finally {
      setIsGettingCurrentLocation(false);
    }
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
              onPress={getCurrentLocation}
              className="p-4 flex-row items-center gap-3"
              activeOpacity={0.7}
              disabled={isGettingCurrentLocation}
            >
              <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center">
                {isGettingCurrentLocation ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Navigation className="w-5 h-5" color="#ef4444" />
                )}
              </View>
              <View className="flex-1">
                <Text className="font-medium">Use Current Location</Text>
                <Text className="text-sm text-gray-500">Via GPS</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Loading State */}
            {isLoading && (
              <View className="p-4 items-center">
                <ActivityIndicator size="small" color="#ef4444" />
                <Text className="text-gray-500 mt-2">Searching...</Text>
              </View>
            )}

            {/* Google Places Search Results */}
            {predictions.length > 0 && (
              <View className="p-4 gap-3">
                <View className="flex-row items-center gap-2">
                  <Search className="w-4 h-4" color="#6b7280" />
                  <Text className="text-sm font-semibold text-gray-600">Search Results</Text>
                </View>
                <View className="gap-2">
                  {predictions.map((prediction) => (
                    <TouchableOpacity
                      key={prediction.place_id}
                      onPress={() => handlePlaceSelect(prediction)}
                      className="p-3 flex-row items-start gap-3 bg-gray-50 rounded-xl"
                      activeOpacity={0.7}
                    >
                      <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center">
                        <MapPin className="w-5 h-5" color="#ef4444" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-medium">{prediction.structured_formatting.main_text}</Text>
                        <Text className="text-sm text-gray-500" numberOfLines={2}>
                          {prediction.structured_formatting.secondary_text}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Searches (only when no search query) */}
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

            {/* Popular Destinations (when no search query) */}
            {!searchQuery && (
              <View className="p-4 gap-3">
                <View className="flex-row items-center gap-2">
                  <Star className="w-4 h-4" color="#6b7280" />
                  <Text className="text-sm font-semibold text-gray-600">Popular Destinations</Text>
                </View>
                <View className="gap-2">
                  {popularDestinations.map((dest, idx) => (
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

            {/* Fallback local search results (when Google API fails/unavailable) */}
            {searchQuery && predictions.length === 0 && !isLoading && filteredDestinations.length > 0 && (
              <View className="p-4 gap-3">
                <View className="flex-row items-center gap-2">
                  <Search className="w-4 h-4" color="#6b7280" />
                  <Text className="text-sm font-semibold text-gray-600">Local Results</Text>
                </View>
                <View className="gap-2">
                  {filteredDestinations.map((dest, idx) => (
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

            {/* No Results */}
            {searchQuery && predictions.length === 0 && !isLoading && filteredDestinations.length === 0 && (
              <View className="items-center py-8">
                <Text className="text-gray-500">No destinations found</Text>
                <Text className="text-sm text-gray-400">Try a different search</Text>
              </View>
            )}
          </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}