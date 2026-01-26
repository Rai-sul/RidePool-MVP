import React from 'react';
import { View, Text, ScrollView } from 'react-native-web';
import { ArrowLeft, User, Mail, Phone, Calendar } from './Icons';
import { Button } from './ui/button';
import type { UserProfile } from '../App';

type PersonalInfoProps = {
  userProfile: UserProfile | null;
  onBack: () => void;
};

export default function PersonalInfo({ userProfile, onBack }: PersonalInfoProps) {
  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      {/* Header */}
      <View className="bg-white border-b p-4 flex flex-row items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Text className="text-xl">Personal Info</Text>
      </View>

      {/* Content */}
      <View className="p-6 space-y-4">
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <View className="space-y-4">
            <View className="flex flex-row items-center gap-3 p-4 border-b">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500">First Name</Text>
                <Text>{userProfile?.firstName || 'Not set'}</Text>
              </View>
            </View>

            <View className="flex flex-row items-center gap-3 p-4 border-b">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500">Last Name</Text>
                <Text>{userProfile?.lastName || 'Not set'}</Text>
              </View>
            </View>

            <View className="flex flex-row items-center gap-3 p-4 border-b">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500">Email</Text>
                <Text>{userProfile?.email || 'Not set'}</Text>
              </View>
            </View>

            <View className="flex flex-row items-center gap-3 p-4 border-b">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500">Phone Number</Text>
                <Text>+880 1712-345678</Text>
              </View>
            </View>

            <View className="flex flex-row items-center gap-3 p-4">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500">Date of Birth</Text>
                <Text>January 15, 1995</Text>
              </View>
            </View>
          </View>
        </View>

        <Button className="w-full">Edit Personal Info</Button>
      </View>
    </ScrollView>
  );
}
