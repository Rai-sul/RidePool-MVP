import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Search } from './Icons';
import { Avatar, AvatarFallback } from './ui/avatar';
import type { UserProfile } from '../contexts/GlobalContext';
import LinearGradient from './LinearGradient';

type HomeMapProps = {
  userProfile: UserProfile | null;
  onProfileClick: () => void;
  onSearchClick: () => void;
};

export default function HomeMap({ userProfile, onProfileClick, onSearchClick }: HomeMapProps) {
  const isFemale = userProfile?.gender === 'female';
  const accentGradientColors = isFemale ? ['#ec4899', '#e11d48'] : ['#1f2937', '#374151'];

  return (
    <View className="h-full w-full">
      {/* Map Placeholder */}
      <LinearGradient
        colors={['#e0e0e0', '#f0f0f0', '#e0f2f7']} // Approximate colors for from-gray-200 via-gray-100 to-blue-50
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1 items-center justify-center"
      >
        <MapPin className="w-12 h-12 text-gray-400" />
        <Text className="text-gray-500 mt-2">Map Placeholder</Text>
      </LinearGradient>

      {/* Header */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        className="absolute top-0 left-0 right-0 p-6"
      >
        <TouchableOpacity onPress={onProfileClick} className="self-end">
          <Avatar className="w-12 h-12 border-2 border-white shadow-md">
            <AvatarFallback className={`bg-gradient-to-br ${accentGradientColors} text-white`}>
              {userProfile?.firstName?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View className="absolute bottom-0 left-0 right-0 p-6">
        <TouchableOpacity
          onPress={onSearchClick}
          className="bg-white rounded-2xl shadow-lg p-5 flex flex-row items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <Search className="w-6 h-6 text-gray-500" />
          <Text className="text-lg text-gray-600">Where to?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}