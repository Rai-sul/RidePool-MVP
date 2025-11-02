import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native-web';
import LinearGradient from './LinearGradient';
import { MapPin, Tag, Users, Search, ArrowRight, Star, ChevronRight } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import DestinationSearch from './DestinationSearch';
import type { UserProfile, Destination } from '../App';

type LandingPageProps = {
  userProfile: UserProfile | null;
  onDestinationSelect: (destination: Destination, rideType?: 'female-only' | 'regular') => void;
  onProfileClick: () => void;
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

import useEmblaCarousel from 'embla-carousel-react';

export default function LandingPage({ userProfile, onDestinationSelect, onProfileClick }: LandingPageProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'start' });
  const [emblaRefFriends] = useEmblaCarousel();
  const initials = userProfile ? `${userProfile.firstName[0]}${userProfile.lastName[0]}` : 'U';
  const isFemale = userProfile?.gender === 'female';

  const accentColors = isFemale ? ['#db2777', '#f43f5e'] : ['#1f2937', '#374151'];

  return (
    <View className="flex-1 bg-white">
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
              <TouchableOpacity className="flex-row items-center gap-1" activeOpacity={0.7}>
                <Text className="text-sm text-gray-500">See All</Text>
                <ChevronRight className="w-4 h-4" color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="overflow-hidden" ref={emblaRefFriends}>
              <View className="flex-row">
                {closeFriends.filter(friend => friend.lastSeen === 'Online').map((friend, index) => (
                  <View key={index} className="flex-shrink-0 w-40 pr-3">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      className="flex-row items-center gap-3 rounded-xl p-4"
                    >
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
                        <Text className="text-lg font-medium whitespace-nowrap overflow-hidden text-ellipsis">{friend.name}</Text>
                        <Text className="text-sm text-gray-500">{friend.lastSeen}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Offers & Promos */}
          <View className="px-6 pb-6 gap-4">
            <View className="flex-row items-center gap-2">
              <Tag className="w-5 h-5" color="#000" />
              <Text className="text-lg font-semibold">Offers & Promos</Text>
            </View>

            <View className="overflow-hidden" ref={emblaRef}>
              <View className="flex-row">
                {promos.map((promo) => (
                  <View key={promo.id} className="flex-shrink-0 w-full pr-3">
                    <TouchableOpacity activeOpacity={0.9}>
                      <View className="rounded-xl p-4 bg-gray-100">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-3">
                            <Text className="text-3xl">{promo.icon}</Text>
                            <View>
                                                          <Text className="text-gray-800 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{promo.title}</Text>
                                                            <Text className="text-gray-600 text-sm mt-1 whitespace-nowrap overflow-hidden text-ellipsis">{promo.description}</Text>
                                                          </View>
                                                        </View>
                                                      </View>
                                                    </View>
                                                  </TouchableOpacity>
                                                </View>
                                              ))}
                                            </View>
                                          </View>
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
                                                    <Text className="text-sm text-gray-500">•</Text>
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
                                                    <Text className="text-sm text-gray-500">•</Text>
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
                                  </View>
                                );
                              }
