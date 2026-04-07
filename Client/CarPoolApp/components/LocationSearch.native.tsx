import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { MapPin, Search, Clock, Navigation, X } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { Location } from '../contexts/GlobalContext';
import * as ExpoLocation from 'expo-location';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

type LocationSearchProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: Location) => void;
  title?: string;
  placeholder?: string;
  type: 'pickup' | 'destination';
};

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const recentLocations = [
  { name: 'Gulshan Office Complex', address: 'Gulshan 2, Dhaka 1212', latitude: 23.7925, longitude: 90.4078 },
  { name: 'Bashundhara City', address: 'Panthapath, Dhaka 1215', latitude: 23.7506, longitude: 90.3902 },
  { name: 'Uttara Sector 7', address: 'Uttara, Dhaka 1230', latitude: 23.8759, longitude: 90.3795 },
];

export default function LocationSearch({ 
  isOpen, 
  onClose, 
  onSelectLocation, 
  title = 'Search Location',
  placeholder = 'Search for a location...',
  type 
}: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search function
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

  const handleSelect = (location: Location) => {
    onSelectLocation(location);
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

      // Reverse geocode to get address and place name
      if (GOOGLE_MAPS_API_KEY) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          const result = data.results?.[0];
          const address = result?.formatted_address || 'Your current position';
          
          // Extract a meaningful place name from address components or formatted address
          let placeName = 'Current Location';
          if (result?.address_components) {
            // Look for establishment, point_of_interest, premise, or neighborhood
            const nameComponent = result.address_components.find((c: any) => 
              c.types.includes('establishment') || 
              c.types.includes('point_of_interest') ||
              c.types.includes('premise') ||
              c.types.includes('neighborhood') ||
              c.types.includes('sublocality_level_1') ||
              c.types.includes('sublocality')
            );
            if (nameComponent) {
              placeName = nameComponent.long_name;
            } else {
              // Fallback: use first part of formatted address
              const firstPart = address.split(',')[0]?.trim();
              if (firstPart && !/^\d/.test(firstPart)) {
                placeName = firstPart;
              }
            }
          }
          
          handleSelect({
            name: placeName,
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

  const accentColor = type === 'pickup' ? '#22c55e' : '#ef4444';
  const accentBgClass = type === 'pickup' ? 'bg-green-100' : 'bg-red-100';

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
              <View className="flex-1">
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>{title}</Text>
                <View className="relative">
                  <View className="absolute left-3 top-0 bottom-0 justify-center z-10" style={{ pointerEvents: 'none' }}>
                    <Search className="w-5 h-5" color="#9ca3af" />
                  </View>
                  <Input
                    autoFocus
                    placeholder={placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="pl-10 h-12"
                  />
                </View>
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
                <View className={`w-10 h-10 ${accentBgClass} rounded-full items-center justify-center`}>
                  {isGettingCurrentLocation ? (
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : (
                    <Navigation className="w-5 h-5" color={accentColor} />
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
                  <ActivityIndicator size="small" color={accentColor} />
                  <Text className="text-gray-500 mt-2">Searching...</Text>
                </View>
              )}

              {/* Search Results */}
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
                        <View className={`w-10 h-10 ${accentBgClass} rounded-full items-center justify-center`}>
                          <MapPin className="w-5 h-5" color={accentColor} />
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

              {/* No Results */}
              {searchQuery && !isLoading && predictions.length === 0 && (
                <View className="items-center py-8">
                  <Text className="text-gray-500">No locations found</Text>
                  <Text className="text-sm text-gray-400">Try a different search term</Text>
                </View>
              )}

              {/* Recent Locations (when no search query) */}
              {!searchQuery && recentLocations.length > 0 && (
                <View className="p-4 gap-3">
                  <View className="flex-row items-center gap-2">
                    <Clock className="w-4 h-4" color="#6b7280" />
                    <Text className="text-sm font-semibold text-gray-600">Recent</Text>
                  </View>
                  <View className="gap-2">
                    {recentLocations.map((loc, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handleSelect(loc)}
                        className="p-3 flex-row items-start gap-3 bg-gray-50 rounded-xl"
                        activeOpacity={0.7}
                      >
                        <View className={`w-10 h-10 ${accentBgClass} rounded-full items-center justify-center`}>
                          <MapPin className="w-5 h-5" color={accentColor} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-medium">{loc.name}</Text>
                          <Text className="text-sm text-gray-500">{loc.address}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Empty State */}
              {!searchQuery && recentLocations.length === 0 && (
                <View className="p-4 items-center">
                  <Text className="text-gray-400">Start typing to search for a location</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
