import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native-web';
import { ArrowLeft, Home, Briefcase, Heart, MapPin, Plus } from './Icons';
import { Button } from './ui/button';

type SavedPlacesProps = {
  onBack: () => void;
};

const savedPlaces = [
  {
    id: '1',
    icon: Home,
    label: 'Home',
    address: 'House 12, Road 5, Dhanmondi, Dhaka',
  },
  {
    id: '2',
    icon: Briefcase,
    label: 'Work',
    address: 'Level 10, Navana Tower, Gulshan 1, Dhaka',
  },
  {
    id: '3',
    icon: Heart,
    label: 'Favorite Spot',
    address: 'Cafe Mango, Banani 11, Dhaka',
  },
];

export default function SavedPlaces({ onBack }: SavedPlacesProps) {
  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      {/* Header */}
      <View className="bg-white border-b p-4 flex flex-row items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Text className="text-xl">Saved Places</Text>
      </View>

      {/* Content */}
      <View className="p-6 space-y-4">
        <View className="bg-white rounded-2xl p-5 space-y-3 my-4">
          {savedPlaces.map((place) => {
            const Icon = place.icon;
            return (
              <TouchableOpacity
                key={place.id}
                className="flex flex-row items-start gap-3 p-4 border-b last:border-b-0 rounded-lg"
              >
                <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </View>
                <View className="flex-1">
                  <Text>{place.label}</Text>
                  <Text className="text-sm text-gray-500">{place.address}</Text>
                </View>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button className="w-full h-12 my-4" variant="outline">
          Add New Place
        </Button>
      </View>
    </ScrollView>
  );
}
