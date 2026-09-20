import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, MapPin, Settings, HelpCircle, ChevronRight, Heart, Star, Bell, LogOut, Copy, Users } from './Icons';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import type { UserProfile } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router';
import LinearGradient from './LinearGradient';
import { useAuthContext } from '../contexts/AuthContext';

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
      { icon: Users, label: 'Priyo Sathi (Friends)', badge: 'New', route: 'friends' },
      { icon: Star, label: 'All Ratings', badge: '4.8', route: 'your-ratings' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Settings, label: 'Settings', badge: null, route: 'settings' },
      { icon: Bell, label: 'Notifications', badge: null, route: 'notifications' },
      { icon: Heart, label: 'Gender Preference', badge: null, route: 'gender-preference' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help & Support', badge: null, route: 'help-support' },
    ],
  },
];

export default function ProfileScreen({ userProfile }: ProfileScreenProps) {
  const initials = userProfile ? `${userProfile.firstName[0]}${userProfile.lastName[0]}` : 'U';
  const fullName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'User';
  const isFemale = userProfile?.gender === 'female';
  const headerGradientColors: [string, string] = isFemale 
    ? ['#ec4899', '#e11d48'] 
    : ['#2563eb', '#06b6d4'];
  const emailColor = isFemale ? 'text-pink-100' : 'text-blue-100';

  const router = useRouter();
  const { logout, user } = useAuthContext();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Get user ID - prefer from userProfile (set from auth), fallback to auth user directly
  const userId = userProfile?.id || user?.id || '';

  const handleCopyUserId = async () => {
    if (userId) {
      try {
        // Use React Native Share as fallback since expo-clipboard needs native build
        await Share.share({
          message: userId,
          title: 'Your Priyo Sathi ID',
        });
      } catch (err) {
        // If share fails, show alert with the ID
        Alert.alert('Your ID', userId, [{ text: 'OK' }]);
      }
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleMenuItemClick = (route: string) => {
    router.push(`/${route}` as any);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    // Navigate to welcome/landing screen
    router.replace('/');
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
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
          <View className="flex-1">
            <Text className="text-2xl text-white">{fullName}</Text>
            <Text className={emailColor}>{userProfile?.email}</Text>
          </View>
        </View>

        {/* User ID Section for Priyo Sathi - Always show */}
        <TouchableOpacity 
          onPress={handleCopyUserId}
          disabled={!userId}
          className="mt-4 bg-white/20 rounded-xl p-3 flex-row items-center justify-between"
          activeOpacity={0.7}
        >
          <View className="flex-1">
            <Text className="text-white/70 text-xs mb-1">Your ID (for Priyo Sathi)</Text>
            {userId ? (
              <Text className="text-white text-sm font-mono" numberOfLines={1}>
                {userId.slice(0, 8)}...{userId.slice(-4)}
              </Text>
            ) : (
              <Text className="text-white/50 text-sm">Loading...</Text>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            {copiedId ? (
              <Text className="text-green-300 text-xs">Shared!</Text>
            ) : userId ? (
              <>
                <Copy className="w-4 h-4 text-white/70" />
                <Text className="text-white/70 text-xs">Tap to share</Text>
              </>
            ) : null}
          </View>
        </TouchableOpacity>
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

        {/* Gender preference note for female users */}
        {userProfile?.gender === 'female' && (
          <View className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4 flex flex-row items-start gap-3">
            <Heart className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm">
                <Text className="text-pink-900">Female-only pools enabled</Text>
              </Text>
              <Text className="text-xs text-pink-700 mt-1">
                You can choose to ride only with female drivers and co-riders for comfort and preference.
              </Text>
            </View>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white rounded-2xl overflow-hidden mx-0 mb-4"
        >
          <View className="flex flex-row items-center justify-center p-4 gap-3">
            <LogOut className="w-5 h-5 text-red-600" />
            <Text className="text-red-600 font-semibold">Log Out</Text>
          </View>
        </TouchableOpacity>

        {/* App Info */}
        <View className="items-center py-4 space-y-1">
          <Text className="text-sm text-gray-500">RideShare v2.4.0</Text>
          <Text className="text-xs text-gray-500">© 2025 RideShare. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>

    {/* Logout Confirmation Modal */}
    <Modal
      visible={showLogoutModal}
      transparent={true}
      animationType="fade"
      onRequestClose={cancelLogout}
    >
      <View className="flex-1 bg-black/50 items-center justify-center p-6">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
          <View className="items-center mb-4">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${
              isFemale ? 'bg-pink-100' : 'bg-blue-100'
            }`}>
              <LogOut className={`w-8 h-8 ${isFemale ? 'text-pink-600' : 'text-blue-600'}`} />
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-2">Log Out?</Text>
            <Text className="text-center text-gray-600">
              Are you sure you want to log out of your account?
            </Text>
          </View>
          
          <View className="gap-3 mt-2">
            <Button
              onPress={confirmLogout}
              className="w-full h-12 bg-red-600"
            >
              <Text className="text-white font-semibold">Yes, Log Out</Text>
            </Button>
            <Button
              onPress={cancelLogout}
              variant="outline"
              className={`w-full h-12 ${
                isFemale ? 'border-pink-600' : 'border-blue-600'
              }`}
            >
              <Text className={isFemale ? 'text-pink-600 font-semibold' : 'text-blue-600 font-semibold'}>
                Cancel
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  );
}
