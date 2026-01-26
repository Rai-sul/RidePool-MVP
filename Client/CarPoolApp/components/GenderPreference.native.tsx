import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Users, Shield } from './Icons';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import type { UserProfile } from '../contexts/GlobalContext';

type GenderPreferenceProps = {
  userProfile: UserProfile | null;
  onBack: () => void;
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

export default function GenderPreference({ userProfile, onBack }: GenderPreferenceProps) {
  const isFemale = userProfile?.gender === 'female';
  
  const [femaleOnlyPools, setFemaleOnlyPools] = useState(isFemale);
  const [femaleCoRiders, setFemaleCoRiders] = useState(isFemale);
  const [quietRides, setQuietRides] = useState(false);
  const [verifiedRiders, setVerifiedRiders] = useState(true);

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1" contentContainerStyle={{ paddingBottom: 64 }}>
      {/* Header */}
      {/* Removed custom header */}

      {/* Content */}
      <View className="p-6 space-y-6">
        {/* Safety Info */}
        {isFemale && (
          <View className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4 flex flex-row items-start gap-3">
            <Shield className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm">
                <Text className="text-pink-900">Your Safety Matters</Text>
              </Text>
              <Text className="text-xs text-pink-700 mt-1">
                As a female rider, you have the option to ride exclusively with female drivers and co-riders for enhanced safety and comfort.
              </Text>
            </View>
          </View>
        )}

        {/* Preferences */}
        <View className="bg-white rounded-2xl p-5">
          <Text className="mb-4">Pool Preferences</Text>
          <Separator className="mb-4" />
          
          <TouchableOpacity 
            className="flex flex-row items-center justify-between mb-4"
            onPress={() => setFemaleOnlyPools(!femaleOnlyPools)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" />
              </View>
              <View>
                <Text>Female-Only Pools</Text>
                <Text className="text-sm text-gray-500">Ride with female drivers only</Text>
              </View>
            </View>
            <ToggleButton enabled={femaleOnlyPools} />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex flex-row items-center justify-between"
            onPress={() => setFemaleCoRiders(!femaleCoRiders)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </View>
              <View>
                <Text>Female Co-Riders Only</Text>
                <Text className="text-sm text-gray-500">Share rides with females only</Text>
              </View>
            </View>
            <ToggleButton enabled={femaleCoRiders} />
          </TouchableOpacity>
        </View>

        {/* General Preferences */}
        <View className="bg-white rounded-2xl p-5">
          <Text className="mb-4">General Preferences</Text>
          <Separator className="mb-4" />
          
          <TouchableOpacity 
            className="flex flex-row items-center justify-between mb-4"
            onPress={() => setQuietRides(!quietRides)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </View>
              <View>
                <Text>Quiet Rides</Text>
                <Text className="text-sm text-gray-500">Prefer minimal conversation</Text>
              </View>
            </View>
            <ToggleButton enabled={quietRides} />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex flex-row items-center justify-between"
            onPress={() => setVerifiedRiders(!verifiedRiders)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </View>
              <View>
                <Text>Verified Riders Only</Text>
                <Text className="text-sm text-gray-500">Higher safety standard</Text>
              </View>
            </View>
            <ToggleButton enabled={verifiedRiders} />
          </TouchableOpacity>
        </View>

        <View className="bg-gray-100 rounded-xl p-4">
          <Text className="text-sm text-gray-600">
            Note: Enabling gender-specific preferences may increase wait times but provides enhanced safety and comfort.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}