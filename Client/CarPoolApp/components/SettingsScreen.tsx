import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, MapPin, Volume2, Smartphone as Vibrate, Moon, Wifi } from './Icons';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

type SettingsScreenProps = {
  onBack: () => void;
  userProfile?: { gender?: string } | null;
};

// Custom Toggle Button Component
const ToggleButton = ({ enabled }: { enabled: boolean }) => {
  return (
    <View
      className={`w-5 h-5 rounded-full border ${
        enabled ? 'bg-white border-black' : 'bg-white border-black'
      } flex items-center justify-center`}
    >
      {enabled && (
        <View className="w-2 h-2 rounded-full bg-black" />
      )}
    </View>
  );
};

export default function SettingsScreen({ onBack, userProfile }: SettingsScreenProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  
  const isFemale = userProfile?.gender === 'female';
  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1" contentContainerStyle={{ paddingBottom: 64 }}>
      {/* Header */}
      {/* Removed custom header */}

      {/* Content */}
      <View className="p-6 space-y-6">
        {/* Sound & Notifications */}
        <View className="bg-white rounded-2xl p-5">
          <Text className="mb-4">Sound & Notifications</Text>
          <Separator className="mb-4" />
          
          <TouchableOpacity 
            className="flex flex-row items-center justify-between mb-4"
            onPress={() => setSoundEnabled(!soundEnabled)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-gray-600" />
              </View>
              <View>
                <Text>Sound Effects</Text>
                <Text className="text-sm text-gray-500">Enable in-app sounds</Text>
              </View>
            </View>
            <ToggleButton enabled={soundEnabled} />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex flex-row items-center justify-between"
            onPress={() => setVibrationEnabled(!vibrationEnabled)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Vibrate className="w-5 h-5 text-gray-600" />
              </View>
              <View>
                <Text>Vibration</Text>
                <Text className="text-sm text-gray-500">Haptic feedback</Text>
              </View>
            </View>
            <ToggleButton enabled={vibrationEnabled} />
          </TouchableOpacity>
        </View>

        {/* Display */}
        <View className="bg-white rounded-2xl p-5">
          <Text className="mb-4">Display</Text>
          <Separator className="mb-4" />
          
          <TouchableOpacity 
            className="flex flex-row items-center justify-between"
            onPress={() => setDarkMode(!darkMode)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Moon className="w-5 h-5 text-gray-600" />
              </View>
              <View>
                <Text>Dark Mode</Text>
                <Text className="text-sm text-gray-500">Use dark theme</Text>
              </View>
            </View>
            <ToggleButton enabled={darkMode} />
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View className="bg-white rounded-2xl p-5">
          <Text className="mb-4">Location</Text>
          <Separator className="mb-4" />
          
          <TouchableOpacity 
            className="flex flex-row items-center justify-between"
            onPress={() => setLocationEnabled(!locationEnabled)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-600" />
              </View>
              <View>
                <Text>Location Services</Text>
                <Text className="text-sm text-gray-500">Always allow</Text>
              </View>
            </View>
            <ToggleButton enabled={locationEnabled} />
          </TouchableOpacity>
        </View>

        {/* Data & Storage */}
        <View className="bg-white rounded-2xl p-5">
          <Text className="mb-4">Data & Storage</Text>
          <Separator className="mb-4" />
          
          <TouchableOpacity 
            className="flex flex-row items-center justify-between"
            onPress={() => setOfflineMode(!offlineMode)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Wifi className="w-5 h-5 text-gray-600" />
              </View>
              <View>
                <Text>Download Maps</Text>
                <Text className="text-sm text-gray-500">Only on Wi-Fi</Text>
              </View>
            </View>
            <ToggleButton enabled={offlineMode} />
          </TouchableOpacity>
        </View>

        <Button variant="destructive" className="w-full">
          Clear Cache
        </Button>
      </View>
    </ScrollView>
  );
}