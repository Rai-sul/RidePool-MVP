import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native-web';
import { User, MapPin, Settings, Shield, HelpCircle, ChevronRight, Heart, Star, Bell, Globe, LogOut } from './Icons';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import type { UserProfile } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router'; // Import useRouter
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
      { icon: Star, label: 'Your Ratings', badge: '4.8', route: 'your-ratings' },
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
  const headerGradient = isFemale 
    ? 'bg-gradient-to-br from-pink-500 to-rose-500' 
    : 'bg-gradient-to-br from-blue-600 to-cyan-500';
  const emailColor = isFemale ? 'text-pink-100' : 'text-blue-100';

  const router = useRouter(); // Initialize useRouter
  const { logout } = useAuthContext();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleMenuItemClick = (route: string) => {
    router.push(`/${route}`);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace('/');
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      {/* Header */}
      <View className={`${headerGradient} p-8`}>
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
      </View>

      {/* Stats */}
      <View className="bg-white border-b px-6 py-4">
        <View className="grid grid-cols-3 gap-4">
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
      <View className="p-4 space-y-4">
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
                    className="flex flex-row items-center justify-between p-4"
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

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white rounded-2xl p-4 flex flex-row items-center gap-3 border-2 border-red-100"
        >
          <View className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-600" />
          </View>
          <Text className="text-red-600 font-semibold">Log Out</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View className="items-center py-4 space-y-1">
          <Text className="text-sm text-gray-500">RideShare v2.4.0</Text>
          <Text className="text-xs text-gray-500">© 2025 RideShare. All rights reserved.</Text>
        </View>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-3xl p-6 mx-4 max-w-sm w-full">
            <View className="items-center mb-4">
              <View className={`w-16 h-16 ${isFemale ? 'bg-pink-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mb-3`}>
                <LogOut className={`w-8 h-8 ${isFemale ? 'text-pink-600' : 'text-blue-600'}`} />
              </View>
              <Text className="text-xl font-semibold text-gray-900 mb-2">Log Out?</Text>
              <Text className="text-center text-gray-600">
                Are you sure you want to log out of your account?
              </Text>
            </View>

            <View className="space-y-2">
              <TouchableOpacity
                onPress={confirmLogout}
                className={`${isFemale ? 'bg-pink-600' : 'bg-blue-600'} rounded-xl py-3 px-4`}
              >
                <Text className="text-white font-semibold text-center">Yes, Log Out</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={cancelLogout}
                className="bg-gray-200 rounded-xl py-3 px-4"
              >
                <Text className="text-gray-700 font-semibold text-center">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}