import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native-web';
import { MapPin, Search, Clock, Star, X } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { Destination } from '../contexts/GlobalContext';

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

export default function DestinationSearch({ isOpen, onClose, onSelectDestination }: DestinationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && window.google && window.google.maps && window.google.maps.places) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      if (mapRef.current) {
        const dummyMap = new google.maps.Map(mapRef.current, {
          center: { lat: 23.8103, lng: 90.4125 },
          zoom: 10,
        });
        placesService.current = new google.maps.places.PlacesService(dummyMap);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !autocompleteService.current) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    
    autocompleteService.current.getPlacePredictions(
      {
        input: searchQuery,
        componentRestrictions: { country: 'bd' },
        types: ['geocode', 'establishment'],
      },
      (results, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
        } else {
          setPredictions([]);
        }
      }
    );
  }, [searchQuery]);

  const handleSelect = (destination: Destination) => {
    onSelectDestination(destination);
    onClose();
    setSearchQuery('');
    setPredictions([]);
  };

  const handlePlaceSelect = (prediction: PlacePrediction) => {
    if (!placesService.current) {
      handleSelect({
        name: prediction.structured_formatting.main_text,
        address: prediction.structured_formatting.secondary_text,
        latitude: 23.8103,
        longitude: 90.4125,
      });
      return;
    }

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['geometry', 'name', 'formatted_address'],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry?.location) {
          handleSelect({
            name: place.name || prediction.structured_formatting.main_text,
            address: place.formatted_address || prediction.structured_formatting.secondary_text,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          });
        } else {
          handleSelect({
            name: prediction.structured_formatting.main_text,
            address: prediction.structured_formatting.secondary_text,
            latitude: 23.8103,
            longitude: 90.4125,
          });
        }
      }
    );
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleSelect({
            name: 'Current Location',
            address: 'Your current position',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          handleSelect({
            name: 'Current Location',
            address: 'Dhaka, Bangladesh',
            latitude: 23.8103,
            longitude: 90.4125,
          });
        }
      );
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={true} onRequestClose={onClose}>
      <div ref={mapRef} style={{ display: 'none' }} />
      <View className="flex-1 bg-black/50">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View className="bg-white rounded-t-3xl max-h-[90%]">
          <View className="flex-row items-center gap-3 p-4 border-b border-gray-200">
            <Button variant="ghost" size="icon" onPress={onClose} className="rounded-full h-10 w-10">
              <X className="w-5 h-5" color="#000" />
            </Button>
            <View className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5" color="#9ca3af" />
              <Input autoFocus placeholder="Search for a destination..." value={searchQuery} onChangeText={setSearchQuery} className="pl-10 h-12" />
            </View>
          </View>

          <View className="border-b border-gray-200">
            <TouchableOpacity onPress={getCurrentLocation} className="p-4 flex-row items-center gap-3" activeOpacity={0.7}>
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                <MapPin className="w-5 h-5" color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="font-medium">Use Current Location</Text>
                <Text className="text-sm text-gray-500">Via GPS</Text>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            {isLoading && (
              <View className="p-4 items-center">
                <Text className="text-gray-500">Searching...</Text>
              </View>
            )}

            {predictions.length > 0 && (
              <View className="p-4 gap-3">
                <View className="flex-row items-center gap-2">
                  <Search className="w-4 h-4" color="#6b7280" />
                  <Text className="text-sm font-semibold text-gray-600">Search Results</Text>
                </View>
                <View className="gap-2">
                  {predictions.map((prediction) => (
                    <TouchableOpacity key={prediction.place_id} onPress={() => handlePlaceSelect(prediction)} className="p-3 flex-row items-start gap-3 bg-gray-50 rounded-xl" activeOpacity={0.7}>
                      <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
                        <MapPin className="w-5 h-5" color="#22c55e" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-medium">{prediction.structured_formatting.main_text}</Text>
                        <Text className="text-sm text-gray-500">{prediction.structured_formatting.secondary_text}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {!searchQuery && recentDestinations.length > 0 && (
              <View className="p-4 gap-3">
                <View className="flex-row items-center gap-2">
                  <Clock className="w-4 h-4" color="#6b7280" />
                  <Text className="text-sm font-semibold text-gray-600">Recent</Text>
                </View>
                <View className="gap-2">
                  {recentDestinations.map((dest, idx) => (
                    <TouchableOpacity key={idx} onPress={() => handleSelect(dest)} className="p-3 flex-row items-start gap-3 bg-gray-50 rounded-xl" activeOpacity={0.7}>
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

            {searchQuery && !isLoading && predictions.length === 0 && (
              <View className="items-center py-8">
                <Text className="text-gray-500">No destinations found</Text>
                <Text className="text-sm text-gray-400">Try a different search term</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
