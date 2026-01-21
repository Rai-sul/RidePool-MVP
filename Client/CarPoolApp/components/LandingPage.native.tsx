import React, { useState, lazy, Suspense } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from './LinearGradient';
import { MapPin, Tag, Users, Search, ArrowRight, Star, ChevronRight } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import DestinationSearch from './DestinationSearch';
import type { UserProfile, Destination } from '../contexts/GlobalContext';

// Lazy load map component to avoid issues on initial load
const NativeMap = lazy(() => import('./NativeMap'));

type LandingPageProps = {
  userProfile: UserProfile | null;
  onDestinationSelect: (destination: Destination, rideType?: 'female-only' | 'regular') => void;
  onProfileClick: () => void;
  onFriendsClick?: () => void;
};

const closeFriends = [
  { name: 'Raisul', initial: 'R', color: ['#3b82f6', '#06b6d4'], lastSeen: 'Online' },
  { name: 'Fatima', initial: 'F', color: ['#ec4899', '#fb7185'], lastSeen: '2h ago' },
  { name: 'Ahmed', initial: 'A', color: ['#8b5cf6', '#6366f1'], lastSeen: 'Online' },
  { name: 'Sarah', initial: 'S', color: ['#10b981', '#34d399'], lastSeen: '1h ago' },
  { name: 'Ali', initial: 'A', color: ['#f97316', '#fbbf24'], lastSeen: 'Online' },
];

const promos = [
  {
    id: 1,
    title: '50% OFF First Ride',
    description: 'Use code: FIRST50',
    colors: ['#2563eb', '#06b6d4'],
    icon: '🎉',
  },
  {
    id: 2,
    title: 'Refer & Earn ৳500',
    description: 'Share with friends',
    colors: ['#db2777', '#f43f5e'],
    icon: '💰',
  },
  {
    id: 3,
    title: 'Pool Rides - Save More',
    description: 'Save up to ৳200 per ride',
    colors: ['#9333ea', '#6366f1'],
    icon: '🚗',
  },
];

export default function LandingPage({ userProfile, onDestinationSelect, onProfileClick, onFriendsClick }: LandingPageProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const initials = userProfile ? `${userProfile.firstName[0]}${userProfile.lastName[0]}` : 'U';
  const isFemale = userProfile?.gender === 'female';

  const accentColors = isFemale ? ['#db2777', '#f43f5e'] : ['#1f2937', '#374151'];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <LinearGradient
        colors={accentColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-6 pb-8"
      >
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-sm text-white opacity-90">Welcome back,</Text>
            <Text className="text-2xl text-white font-bold mt-1">{userProfile?.firstName || 'User'}</Text>
          </View>
          <TouchableOpacity 
            onPress={onProfileClick}
            activeOpacity={0.7}
          >
            <Avatar className="w-12 h-12 border-2 border-white">
              <AvatarFallback className={`${isFemale ? 'bg-gradient-to-br from-rose-500 to-pink-400' : 'bg-gradient-to-br from-blue-600 to-cyan-500'}`}>
                <Text className="text-white font-semibold">{initials}</Text>
              </AvatarFallback>
            </Avatar>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          onPress={() => setIsSearchOpen(true)}
          className="rounded-xl overflow-hidden shadow-lg"
          activeOpacity={0.9}
        >
          <View className="bg-white/90 p-4">
            <View className="flex-row items-center gap-3">
              <View className="gap-2">
                <View className={`w-3 h-3 rounded-full ${isFemale ? 'bg-rose-500' : 'bg-gray-800'}`} />
                <View className="w-px h-4 bg-gray-300" />
                <MapPin className={`w-4 h-4 ${isFemale ? 'text-rose-500' : 'text-gray-800'}`} />
              </View>
              <View className="flex-1 gap-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm text-gray-500">From</Text>
                  <View className="flex-1 border-b border-gray-200" />
                </View>
                <Text className="text-gray-900">Current Location</Text>
                <View className="flex-row items-center gap-2 mt-3">
                  <Text className="text-sm text-gray-500">To</Text>
                  <View className="flex-1 border-b border-gray-200" />
                </View>
                <Text className="text-gray-400">Where to?</Text>
              </View>
              <Search className="w-5 h-5 text-gray-400" />
            </View>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Map Preview Section */}
      <View style={mapStyles.mapContainer}>
        <Suspense fallback={
          <View style={mapStyles.mapPlaceholder}>
            <Text style={mapStyles.loadingText}>Loading map...</Text>
          </View>
        }>
          <NativeMap style={mapStyles.map} />
        </Suspense>
        <View style={mapStyles.mapOverlay}>
          <TouchableOpacity 
            onPress={() => setIsSearchOpen(true)}
            style={mapStyles.mapSearchButton}
          >
            <Search style={{ width: 20, height: 20, color: '#6b7280' }} />
            <Text style={mapStyles.mapSearchText}>Where to?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="pb-20">
          {/* Priyo Sathi (Close Friends) */}
          <View className="p-6 gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Users className="w-5 h-5" color="#000" />
                <Text className="text-lg font-semibold">Priyo Sathi</Text>
              </View>
              <TouchableOpacity 
                className="flex-row items-center gap-1" 
                activeOpacity={0.7}
                onPress={onFriendsClick}
              >
                <Text className="text-sm text-blue-600 font-medium">See All</Text>
                <ChevronRight className="w-4 h-4" color="#2563eb" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
              <View className="flex-row gap-3">
                {closeFriends.filter(friend => friend.lastSeen === 'Online').map((friend, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    className="w-40 mr-3"
                  >
                    <View className="rounded-xl p-4 flex-row items-center gap-3">
                      <View className="relative">
                        <View
                          className="w-16 h-16 rounded-full items-center justify-center bg-gray-300 border-2 border-white shadow-md"
                        >
                          <Text className="text-gray-800 text-lg font-semibold">{friend.initial}</Text>
                        </View>
                        {friend.lastSeen === 'Online' && (
                          <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-medium" numberOfLines={1} ellipsizeMode="tail">{friend.name}</Text>
                        <Text className="text-sm text-gray-500">{friend.lastSeen}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Offers & Promos */}
          <View className="px-6 pb-6 gap-4">
            <View className="flex-row items-center gap-2">
              <Tag className="w-5 h-5" color="#000" />
              <Text className="text-lg font-semibold">Offers & Promos</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled className="-mx-6 px-6">
              <View className="flex-row gap-3">
                {promos.map((promo) => (
                  <TouchableOpacity key={promo.id} activeOpacity={0.9} style={{ width: Dimensions.get('window').width - 48 }}>
                    <View className="rounded-xl p-4 bg-gray-100">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                          <Text className="text-3xl">{promo.icon}</Text>
                          <View>
                            <Text className="text-gray-800 font-semibold" numberOfLines={1} ellipsizeMode="tail">{promo.title}</Text>
                            <Text className="text-gray-600 text-sm mt-1" numberOfLines={1} ellipsizeMode="tail">{promo.description}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Recent Rides */}
          <View className="px-6 pb-6 gap-4">
            <Text className="text-lg font-semibold">Recent Rides</Text>
            
            <View className="gap-3">
              <TouchableOpacity className="bg-gray-50 rounded-xl p-4" activeOpacity={0.9}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                      <MapPin className={`w-4 h-4 ${isFemale ? 'text-rose-500' : 'text-gray-800'}`} />
                      <Text className="font-medium">Gulshan Office Complex</Text>
                    </View>
                    <View className="flex-row items-center gap-4">
                      <Text className="text-sm text-gray-500">3 days ago</Text>
                      <Text className="text-gray-500">•</Text>
                      <Text className="text-sm text-gray-500">৳185</Text>
                    </View>
                  </View>
                  <ChevronRight className="w-5 h-5" color="#9ca3af" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="bg-gray-50 rounded-xl p-4" activeOpacity={0.9}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                      <MapPin className={`w-4 h-4 ${isFemale ? 'text-rose-500' : 'text-gray-800'}`} />
                      <Text className="font-medium">Bashundhara City</Text>
                    </View>
                    <View className="flex-row items-center gap-4">
                      <Text className="text-sm text-gray-500">5 days ago</Text>
                      <Text className="text-gray-500">•</Text>
                      <Text className="text-sm text-gray-500">৳210</Text>
                    </View>
                  </View>
                  <ChevronRight className="w-5 h-5" color="#9ca3af" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Destination Search Modal */}
      <DestinationSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDestination={onDestinationSelect}
      />
    </SafeAreaView>
  );
}

const mapStyles = StyleSheet.create({
  mapContainer: {
    height: 200,
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  mapSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapSearchText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});
