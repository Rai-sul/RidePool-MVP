import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Animated, Keyboard, Platform, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  
  const isFemale = userProfile?.gender === 'female';
  const primaryColor = isFemale ? 'bg-pink-500' : 'bg-blue-600';
  const primaryColorHover = isFemale ? 'hover:bg-pink-600' : 'hover:bg-blue-700';

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardHeight, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? 250 : 0,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 0,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

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
      <Animated.View 
        className="p-6 space-y-4"
        style={isEditing ? { marginBottom: keyboardHeight } : {}}
      >
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <View className="space-y-6">
            <View className="flex flex-row items-center gap-3 p-4 px-2 mb-4">
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

            <View className="flex flex-row items-center gap-3 p-4 px-2 mb-4">
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

            <View className="flex flex-row items-center gap-3 p-4 px-2 mb-4">
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

            <View className="flex flex-row items-center gap-3 p-4 px-2 mb-4">
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

            <View className="flex flex-row items-center gap-3 p-4 px-2 mb-4">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Date of Birth</Text>
                {isEditing ? (
                  <>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      className="border border-gray-300 rounded-lg p-3 mt-1"
                    >
                      <Text className={dateOfBirth ? "text-gray-900" : "text-gray-400"}>
                        {dateOfBirth || 'Select Date'}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                          setShowDatePicker(Platform.OS === 'ios');
                          if (date) {
                            setSelectedDate(date);
                            const formattedDate = date.toLocaleDateString('en-GB');
                            setDateOfBirth(formattedDate);
                          }
                        }}
                        maximumDate={new Date()}
                      />
                    )}
                  </>
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
      </Animated.View>
    </ScrollView>
  );
}