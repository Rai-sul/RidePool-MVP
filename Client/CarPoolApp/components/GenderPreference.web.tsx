import React from 'react';
import { View, Text, ScrollView } from 'react-native-web';
import { ArrowLeft, Users, Shield } from './Icons';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import type { UserProfile } from '../App';

type GenderPreferenceProps = {
  userProfile: UserProfile | null;
  onBack: () => void;
};

export default function GenderPreference({ userProfile, onBack }: GenderPreferenceProps) {
  const isFemale = userProfile?.gender === 'female';

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      {/* Header */}
      <View className="bg-white border-b p-4 flex flex-row items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Text className="text-xl">Gender Preference</Text>
      </View>

      {/* Content */}
      <View className="p-6 space-y-4">
        {/* Preference Info */}
        {isFemale && (
          <View className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4 flex flex-row items-start gap-3">
            <Shield className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
            <View className="flex-1">
              <Text className="text-sm">
                <Text className="text-pink-900">Your Preference Matters</Text>
              </Text>
              <Text className="text-xs text-pink-700 mt-1">
                As a female rider, you have the option to ride exclusively with female drivers and co-riders for added comfort.
              </Text>
            </View>
          </View>
        )}

        {/* Preferences */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <Text>Pool Preferences</Text>
          <Separator />
          
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" />
              </View>
              <View>
                <Text>Female-Only Pools</Text>
                <Text className="text-sm text-gray-500">Ride with female drivers only</Text>
              </View>
            </View>
            <Switch defaultChecked={isFemale} />
          </View>

          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </View>
              <View>
                <Text>Female Co-Riders Only</Text>
                <Text className="text-sm text-gray-500">Share rides with females only</Text>
              </View>
            </View>
            <Switch defaultChecked={isFemale} />
          </View>
        </View>

        {/* General Preferences */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <Text>General Preferences</Text>
          <Separator />
          
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </View>
              <View>
                <Text>Quiet Rides</Text>
                <Text className="text-sm text-gray-500">Prefer minimal conversation</Text>
              </View>
            </View>
            <Switch />
          </View>

          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </View>
              <View>
                <Text>Verified Riders Only</Text>
                <Text className="text-sm text-gray-500">Female-only matching</Text>
              </View>
            </View>
            <Switch defaultChecked />
          </View>
        </View>

        <View className="bg-gray-100 rounded-xl p-4">
          <Text className="text-sm text-gray-600">
            Note: Enabling gender-specific preferences may increase wait times but provides added comfort.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
