import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ArrowLeft, User, Mail, Phone, Calendar } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';

import type { UserProfile } from '../contexts/GlobalContext';

type PersonalInfoProps = {
  userProfile: UserProfile | null;
  onBack: () => void;
};

export default function PersonalInfo({ userProfile, onBack }: PersonalInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName, setLastName] = useState(userProfile?.lastName || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(userProfile?.dateOfBirth || '');
  
  const isFemale = userProfile?.gender === 'female';
  const primaryColor = isFemale ? 'bg-pink-500' : 'bg-blue-600';
  const primaryColorHover = isFemale ? 'hover:bg-pink-600' : 'hover:bg-blue-700';

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset to original values if canceling
      setFirstName(userProfile?.firstName || '');
      setLastName(userProfile?.lastName || '');
      setEmail(userProfile?.email || '');
      setPhone(userProfile?.phone || '');
      setDateOfBirth(userProfile?.dateOfBirth || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    // Here you would save to context/API
    setIsEditing(false);
  };

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1" contentContainerStyle={{ paddingBottom: 64 }}>
      {/* Header */}
      {/* Removed custom header */}

      {/* Content */}
      <View className="p-6 space-y-4">
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <View className="space-y-6">
            <View className="flex flex-row items-center gap-3 p-4 px-2">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">First Name</Text>
                {isEditing ? (
                  <Input
                    placeholder="First Name"
                    value={firstName}
                    onChangeText={setFirstName}
                    className="mt-1"
                  />
                ) : (
                  <Text className="font-medium text-base">{firstName || 'Not set'}</Text>
                )}
              </View>
            </View>

            <View className="flex flex-row items-center gap-3 p-4 px-2">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Last Name</Text>
                {isEditing ? (
                  <Input
                    placeholder="Last Name"
                    value={lastName}
                    onChangeText={setLastName}
                    className="mt-1"
                  />
                ) : (
                  <Text className="font-medium text-base">{lastName || 'Not set'}</Text>
                )}
              </View>
            </View>

            <View className="flex flex-row items-center gap-3 p-4 px-2">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Email</Text>
                {isEditing ? (
                  <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    className="mt-1"
                  />
                ) : (
                  <Text className="font-medium text-base">{email || 'Not set'}</Text>
                )}
              </View>
            </View>

            <View className="flex flex-row items-center gap-3 p-4 px-2">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Phone Number</Text>
                {isEditing ? (
                  <Input
                    placeholder="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    className="mt-1"
                  />
                ) : (
                  <Text className="font-medium text-base">{phone || 'Not set'}</Text>
                )}
              </View>
            </View>

            <View className="flex flex-row items-center gap-3 p-4 px-2">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Date of Birth</Text>
                {isEditing ? (
                  <Input
                    placeholder="Date of Birth"
                    value={dateOfBirth}
                    onChangeText={setDateOfBirth}
                    className="mt-1"
                  />
                ) : (
                  <Text className="font-medium text-base">{dateOfBirth || 'Not set'}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {isEditing ? (
          <View className="flex-row gap-4 mt-2">
            <Button variant="outline" className="flex-1 h-12" onPress={handleEditToggle}>
              <Text className="font-medium">Cancel</Text>
            </Button>
            <Button className={`flex-1 h-12 ${primaryColor} ${primaryColorHover}`} onPress={handleSave}>
              <Text className="text-white font-medium">Save Changes</Text>
            </Button>
          </View>
        ) : (
          <Button className={`w-full h-12 ${primaryColor} ${primaryColorHover}`} onPress={handleEditToggle}>
            <Text className="text-white font-medium">Edit Personal Info</Text>
          </Button>
        )}
      </View>
    </ScrollView>
  );
}