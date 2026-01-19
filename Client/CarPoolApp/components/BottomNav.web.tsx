import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native-web';
import { MapPin, Receipt, Wallet, User, Users } from './Icons';
import LinearGradient from './LinearGradient';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router';

type BottomNavProps = {
  isFemale?: boolean;
};

export default function BottomNav({ isFemale = false }: BottomNavProps) {
  const { activeTab, setActiveTab } = useGlobalContext();
  const router = useRouter();

  const handleTabChange = (tab: 'home' | 'trips' | 'wallet' | 'profile' | 'friends') => {
    setActiveTab(tab);
    router.push(`/${tab}`);
  };

  const activeColor = isFemale ? '#e11d48' : '#111827';
  const inactiveColor = '#9ca3af';
  
  const leftTabs = [
    { id: 'trips' as const, icon: Receipt, label: 'Trips' },
    { id: 'friends' as const, icon: Users, label: 'Friends' },
  ];
  
  const rightTabs = [
    { id: 'wallet' as const, icon: Wallet, label: 'Wallet' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];
  
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <View className="flex-row items-center justify-between h-16 px-2">
        {/* Left Tabs */}
        <View className="flex-row items-center flex-1 justify-around">
          {leftTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabChange(tab.id)}
                className="flex-col items-center justify-center gap-1 px-4 py-2"
                activeOpacity={0.7}
              >
                <Icon
                  color={isActive ? activeColor : inactiveColor}
                  size={24}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <Text
                  className="text-xs"
                  style={{ color: isActive ? activeColor : inactiveColor }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center Home Button */}
        <TouchableOpacity
          onPress={() => handleTabChange('home')}
          className="flex-col items-center justify-center"
          activeOpacity={0.7}
        >
          {activeTab === 'home' ? (
            <LinearGradient
              colors={isFemale ? ['#ec4899', '#e11d48'] : ['#1f2937', '#374151']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="w-14 h-14 rounded-full items-center justify-center shadow-lg"
            >
              <MapPin color="#ffffff" size={24} strokeWidth={2} />
            </LinearGradient>
          ) : (
            <View className="w-14 h-14 rounded-full items-center justify-center bg-gray-100">
              <MapPin color={inactiveColor} size={24} strokeWidth={1.5} />
            </View>
          )}
          <Text
            className="text-xs mt-1"
            style={{ color: activeTab === 'home' ? activeColor : 'transparent' }}
          >
            {' '}
          </Text>
        </TouchableOpacity>

        {/* Right Tabs */}
        <View className="flex-row items-center flex-1 justify-around">
          {rightTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabChange(tab.id)}
                className="flex-col items-center justify-center gap-1 px-4 py-2"
                activeOpacity={0.7}
              >
                <Icon
                  color={isActive ? activeColor : inactiveColor}
                  size={24}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <Text
                  className="text-xs"
                  style={{ color: isActive ? activeColor : inactiveColor }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}