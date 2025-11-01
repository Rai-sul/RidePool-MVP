import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, MapPin, Settings, Shield, HelpCircle, ChevronRight, Heart, Star, Bell, Globe } from './Icons';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import type { UserProfile } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router'; // Import useRouter
import LinearGradient from './LinearGradient';

type ProfileScreenProps = {
  userProfile: UserProfile | null;
  // onMenuItemClick: (item: string) => void; // This prop will no longer be needed
};

const menuSections = [
  {
    title: 'Personal',
    items: [
      { icon: User, label: 'Personal Info', badge: null, route: 'personal-info' },
      { icon: MapPin, label: 'Saved Places', badge: '3', route: 'saved-places' },
      { icon: Star, label: 'All Ratings', badge: '4.8', route: 'your-ratings' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Settings, label: 'Settings', badge: null, route: 'settings' },
      { icon: Bell, label: 'Notifications', badge: null, route: 'notifications' },
      { icon: Globe, label: 'Language', badge: 'English', route: 'language' },
      { icon: Heart, label: 'Gender Preference', badge: null, route: 'gender-preference' },
    ],
  },
  {
    title: 'Safety & Support',
    items: [
      { icon: Shield, label: 'Safety Center', badge: null, route: 'safety-center' },
      { icon: HelpCircle, label: 'Help & Support', badge: null, route: 'help-support' },
    ],
  },
];

export default function ProfileScreen({ userProfile }: ProfileScreenProps) { // Remove onMenuItemClick from props
  const initials = userProfile ? `${userProfile.firstName[0]}${userProfile.lastName[0]}` : 'U';
  const fullName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'User';
  const isFemale = userProfile?.gender === 'female';
  const headerGradientColors = isFemale 
    ? ['#ec4899', '#e11d48'] 
    : ['#2563eb', '#06b6d4'];
  const emailColor = isFemale ? 'text-pink-100' : 'text-blue-100';

  const router = useRouter(); // Initialize useRouter

  const handleMenuItemClick = (route: string) => {
    router.push(`/${route}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      {/* Header */}
      <LinearGradient
        colors={headerGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-8"
      >
        <View className="flex flex-row items-center gap-4">
          <Avatar className="w-20 h-20 border-4 border-white/30">
            <AvatarFallback className="bg-white/20 text-white text-2xl backdrop-blur">
              {initials}
            </AvatarFallback>
          </Avatar>
          <View>
            <Text className="text-2xl text-white">{fullName}</Text>
            <Text className={emailColor}>{userProfile?.email}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View className="bg-white border-b px-6 py-4">
        <View className="flex flex-row justify-around gap-4">
          <View className="items-center">
            <Text className="text-2xl">47</Text>
            <Text className="text-sm text-gray-500">Trips</Text>
          </View>
          <Separator orientation="vertical" className="justify-self-center h-12" />
          <View className="items-center">
            <Text className="text-2xl">4.8</Text>
            <Text className="text-sm text-gray-500">Rating</Text>
          </View>
          <Separator orientation="vertical" className="justify-self-center h-12" />
          <View className="items-center">
            <Text className="text-2xl">2.1k</Text>
            <Text className="text-sm text-gray-500">Saved</Text>
          </View>
        </View>
      </View>

      {/* Menu Sections */}
      <View className="p-4 space-y-6">
        {menuSections.map((section) => (
          <View key={section.title} className="bg-white rounded-2xl overflow-hidden">
            <View className="px-5 py-3 bg-gray-50">
              <Text className="text-sm text-gray-600">{section.title}</Text>
            </View>
            <View className="divide-y">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleMenuItemClick(item.route)} // Use item.route
                    className="flex flex-row items-center justify-between p-4 border-b border-gray-100 last:border-b-0"
                  >
                    <View className="flex flex-row items-center gap-3">
                      <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </View>
                      <Text>{item.label}</Text>
                    </View>
                    <View className="flex flex-row items-center gap-2">
                      {item.badge && (
                        <Text className="text-sm text-gray-500">{item.badge}</Text>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Special Safety Note for Female Users */}
        {userProfile?.gender === 'female' && (
          <View className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4 flex flex-row items-start gap-3">
            <Shield className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm">
                <Text className="text-pink-900">Female-only pools enabled</Text>
              </Text>
              <Text className="text-xs text-pink-700 mt-1">
                You can choose to ride only with female drivers and co-riders for added safety and comfort.
              </Text>
            </View>
          </View>
        )}

        {/* App Info */}
        <View className="items-center py-4 space-y-1">
          <Text className="text-sm text-gray-500">RideShare v2.4.0</Text>
          <Text className="text-xs text-gray-500">© 2025 RideShare. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
