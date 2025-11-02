import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native-web';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { UserProfile } from '../App';

type ProfileSetupProps = {
  onComplete: (profile: UserProfile) => void;
};

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const handleSubmit = () => {
    if (firstName && lastName && email) {
      onComplete({ firstName, lastName, email, gender });
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 p-6">
        <View className="max-w-md mx-auto gap-6 pt-8">
          <View className="gap-2">
            <Text className="text-3xl font-bold">Complete your profile</Text>
            <Text className="text-gray-600">We need a few details to get you started</Text>
          </View>

          <View className="gap-5">
            <View className="gap-2">
              <Label>First Name</Label>
              <Input
                placeholder="Enter your first name"
                value={firstName}
                onChangeText={setFirstName}
                className="h-12"
              />
            </View>

            <View className="gap-2">
              <Label>Last Name</Label>
              <Input
                placeholder="Enter your last name"
                value={lastName}
                onChangeText={setLastName}
                className="h-12"
              />
            </View>

            <View className="gap-2">
              <Label>Email</Label>
              <Input
                placeholder="your.email@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                className="h-12"
              />
            </View>

            <View className="gap-2">
              <Label>Gender</Label>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setGender('male')}
                  className={`flex-1 h-12 items-center justify-center rounded-lg border-2 ${
                    gender === 'male' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className={gender === 'male' ? 'text-blue-600 font-semibold' : 'text-gray-700'}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setGender('female')}
                  className={`flex-1 h-12 items-center justify-center rounded-lg border-2 ${
                    gender === 'female' ? 'border-pink-600 bg-pink-50' : 'border-gray-300 bg-white'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className={gender === 'female' ? 'text-pink-600 font-semibold' : 'text-gray-700'}>
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
              <Text className="text-sm text-gray-500">Used for pool matching preferences</Text>
            </View>

            <Button 
              onPress={handleSubmit}
              className={`w-full h-12 mt-8 ${gender === 'female' ? 'bg-pink-500' : 'bg-blue-600'}`}
            >
              <Text className="text-white font-semibold">Get Started</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
