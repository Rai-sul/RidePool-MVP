import { View, Text, TouchableOpacity } from 'react-native-web';
import { MapPin, Home, Briefcase, Dumbbell, Plane, Search } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useState } from 'react';
import DestinationSearch from './DestinationSearch';
import type { UserProfile, Destination } from '../App';

type HomeMapProps = {
  userProfile: UserProfile | null;
  onDestinationSelect: (destination: Destination, rideType?: 'female-only' | 'regular') => void;
};

const quickDestinations = [
  { name: 'Home', icon: Home, address: '123 Main Street, Dhaka' },
  { name: 'Work', icon: Briefcase, address: 'Gulshan Office Complex' },
  { name: 'Gym', icon: Dumbbell, address: 'Fitness Center, Banani' },
  { name: 'Airport', icon: Plane, address: 'Hazrat Shahjalal Airport' },
];

export default function HomeMap({ userProfile, onDestinationSelect }: HomeMapProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedRideType, setSelectedRideType] = useState<'female-only' | 'regular' | null>(null);
  const initials = userProfile ? `${userProfile.firstName[0]}${userProfile.lastName[0]}` : 'U';
  const isFemale = userProfile?.gender === 'female';

  const handleDestinationClick = () => {
    // For female users, they must select ride type first
    if (isFemale && !selectedRideType) {
      return; // Do nothing if ride type not selected
    }
    setIsSearchOpen(true);
  };

  const handleDestinationSelect = (destination: Destination) => {
    onDestinationSelect(destination, selectedRideType || undefined);
  };

  const handleQuickDestinationSelect = (destination: Destination) => {
    // For female users, they must select ride type first
    if (isFemale && !selectedRideType) {
      return; // Do nothing if ride type not selected
    }
    onDestinationSelect(destination, selectedRideType || undefined);
  };

  return (
    <View className="h-full w-full relative bg-gray-100">
      {/* Map Background */}
      <View className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-blue-50">
        <View className="absolute inset-0 opacity-20">
          {/* Simulated map roads */}
          <View className="absolute top-1/4 left-0 w-full h-1 bg-gray-400 rotate-12"></View>
          <View className="absolute top-1/2 left-0 w-full h-1 bg-gray-400 -rotate-6"></View>
          <View className="absolute top-3/4 left-0 w-full h-1 bg-gray-400 rotate-3"></View>
          <View className="absolute top-0 left-1/4 w-1 h-full bg-gray-400 rotate-12"></View>
          <View className="absolute top-0 left-1/2 w-1 h-full bg-gray-400 -rotate-6"></View>
          <View className="absolute top-0 left-3/4 w-1 h-full bg-gray-400 rotate-3"></View>
        </View>
        
        {/* Current location pin */}
        <View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
          <MapPin className="w-10 h-10 text-blue-600 fill-blue-600" />
        </View>
      </View>

      {/* Top Card */}
      <View className="absolute top-0 left-0 right-0 p-4 z-10">
        <View className="bg-white rounded-2xl shadow-lg p-4 space-y-3">
          <TouchableOpacity
            onPress={handleDestinationClick}
            className={`flex items-center gap-3 w-full transition-transform ${
              isFemale && !selectedRideType 
                ? 'opacity-50 cursor-not-allowed' 
                : 'active:scale-[0.98]'
            }`}
            disabled={isFemale && !selectedRideType}
          >
            <Search className="w-5 h-5 text-gray-400" />
            <Text className="flex-1 text-gray-500">
              {isFemale && !selectedRideType ? 'Select ride type first' : 'Where to?'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex items-center gap-2 w-full active:opacity-70 transition-opacity"
          >
            <MapPin className="w-4 h-4 text-blue-600" />
            <Text className="text-sm text-gray-600">Current Location</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Avatar Button */}
      <View className="absolute top-4 right-4 z-10">
        <TouchableOpacity className="active:scale-95 transition-transform">
          <Avatar className="w-12 h-12 border-2 border-white shadow-md">
            <AvatarFallback className="bg-blue-600 text-white">{initials}</AvatarFallback>
          </Avatar>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 z-10 pb-20">
        <View className="space-y-4">
          {/* Ride Type Selection for Female Users - Must select before destination */}
          {isFemale && (
            <View className="space-y-3">
              <Text className="text-gray-600">Select Ride Type</Text>
              <View className="flex gap-3">
                <Button 
                  onPress={() => setSelectedRideType('female-only')}
                  className={`flex-1 h-12 transition-all ${
                    selectedRideType === 'female-only'
                      ? 'bg-pink-500 text-white border-2 border-pink-500 hover:bg-pink-600'
                      : 'bg-pink-50 text-pink-700 border-2 border-pink-300 hover:bg-pink-100'
                  } active:scale-[0.98]`}
                >
                  RideShare with Female
                </Button>
                <Button 
                  onPress={() => setSelectedRideType('regular')}
                  variant={selectedRideType === 'regular' ? 'default' : 'outline'}
                  className={`flex-1 h-12 transition-all ${
                    selectedRideType === 'regular'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-2'
                  } active:scale-[0.98]`}
                >
                  Regular RideShare
                </Button>
              </View>
              {!selectedRideType && (
                <Text className="text-sm text-pink-600 text-center">
                  Please select a ride type to continue
                </Text>
              )}
            </View>
          )}
          
          <Text className="text-gray-600">Quick Destinations</Text>
          
          <View className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
            {quickDestinations.map((dest) => {
              const Icon = dest.icon;
              return (
                <Button
                  key={dest.name}
                  variant="outline"
                  className={`flex-shrink-0 h-auto px-6 py-3 rounded-full border-2 transition-transform ${
                    isFemale && !selectedRideType 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'active:scale-95'
                  }`}
                  onPress={() => handleQuickDestinationSelect({ name: dest.name, address: dest.address })}
                  disabled={isFemale && !selectedRideType}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {dest.name}
                </Button>
              );
            })}
          </View>
        </View>
      </View>

      {/* Destination Search Dialog */}
      <DestinationSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDestination={handleDestinationSelect}
      />
    </View>
  );
}