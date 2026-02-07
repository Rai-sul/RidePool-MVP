import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Users, X, Check } from './Icons';
import LinearGradient from './LinearGradient';

export default function PriyoSathiRideInviteHandler() {
  const { priyoSathiInvite, clearPriyoSathiInvite } = useNotificationContext();
  const { userProfile } = useGlobalContext();
  const router = useRouter();
  
  const [joining, setJoining] = useState(false);

  const isFemale = userProfile?.gender === 'female';
  const accentGradient: [string, string] = isFemale ? ['#ec4899', '#e11d48'] : ['#2563eb', '#1d4ed8'];

  // Handle dismissing the invite
  const handleDismiss = () => {
    clearPriyoSathiInvite();
  };

  // Handle accepting the invite - navigate to home to set up their own ride
  const handleAccept = () => {
    setJoining(true);
    clearPriyoSathiInvite();
    // Navigate to home screen where they can set their destination
    // The friend's ride info is in the notification - they'll create their own ride
    router.push('/home');
    setJoining(false);
  };

  if (!priyoSathiInvite) {
    return null;
  }

  return (
    <Modal
      visible={!!priyoSathiInvite}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
          {/* Header */}
          <LinearGradient
            colors={accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-5"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
                  <Users size={24} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-white text-lg font-bold">Priyo Sathi Invite!</Text>
                  <Text className="text-white/80 text-sm">
                    {priyoSathiInvite.inviterName} wants to ride together
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleDismiss}
                className="w-8 h-8 bg-white/20 rounded-full items-center justify-center"
              >
                <X size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Content */}
          <View className="p-5">
            <View className="items-center py-4">
              <Text className="text-gray-700 font-medium text-center text-base">
                {priyoSathiInvite.inviterName} is looking for a ride.
              </Text>
              <Text className="text-gray-500 text-sm text-center mt-2">
                Would you like to ride together?
              </Text>
              
              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-6 w-full">
                <TouchableOpacity
                  onPress={handleDismiss}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl items-center"
                >
                  <Text className="text-gray-700 font-semibold">Not Now</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleAccept}
                  disabled={joining}
                  className={`flex-1 py-3 rounded-xl items-center ${
                    isFemale ? 'bg-pink-500' : 'bg-blue-600'
                  }`}
                  style={{ opacity: joining ? 0.7 : 1 }}
                >
                  {joining ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <Check size={18} color="#ffffff" />
                      <Text className="text-white font-semibold">Let's Go!</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Hint */}
              <Text className="text-xs text-gray-400 text-center mt-4">
                Set your pickup and destination on the next screen
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
