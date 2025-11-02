import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Bell, MessageSquare, Car, Wallet } from './Icons';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

type NotificationsScreenProps = {
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

export default function NotificationsScreen({ onBack, userProfile }: NotificationsScreenProps) {
  const [allNotifications, setAllNotifications] = useState(true);
  const [driverMatched, setDriverMatched] = useState(true);
  const [driverArriving, setDriverArriving] = useState(true);
  const [rideCompleted, setRideCompleted] = useState(true);
  const [messages, setMessages] = useState(true);
  const [paymentUpdates, setPaymentUpdates] = useState(true);
  const [promotions, setPromotions] = useState(true);
  
  const isFemale = userProfile?.gender === 'female';
  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1" contentContainerStyle={{ paddingBottom: 64 }}>
      {/* Header */}
      {/* Removed custom header */}

      {/* Content */}
      <View className="p-6 space-y-6">
        {/* Push Notifications */}
        <View className="bg-white rounded-2xl p-5">
          <Text className="mb-4">Push Notifications</Text>
          <Separator className="mb-4" />
          
          <TouchableOpacity 
            className="flex flex-row items-center justify-between"
            onPress={() => setAllNotifications(!allNotifications)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-600" />
              </View>
              <View>
                <Text>All Notifications</Text>
                <Text className="text-sm text-gray-500">Enable all notifications</Text>
              </View>
            </View>
            <ToggleButton enabled={allNotifications} />
          </TouchableOpacity>
        </View>

        {/* Ride Updates */}
        <View className="bg-white rounded-2xl p-5">
          <Text className="mb-4">Ride Updates</Text>
          <Separator className="mb-4" />
          
          <TouchableOpacity 
            className="flex flex-row items-center justify-between mb-4"
            onPress={() => setDriverMatched(!driverMatched)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </View>
              <View>
                <Text>Driver Matched</Text>
                <Text className="text-sm text-gray-500">When a driver accepts</Text>
              </View>
            </View>
            <ToggleButton enabled={driverMatched} />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex flex-row items-center justify-between mb-4"
            onPress={() => setDriverArriving(!driverArriving)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </View>
              <View>
                <Text>Driver Arriving</Text>
                <Text className="text-sm text-gray-500">When driver is near</Text>
              </View>
            </View>
            <ToggleButton enabled={driverArriving} />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex flex-row items-center justify-between"
            onPress={() => setRideCompleted(!rideCompleted)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </View>
              <View>
                <Text>Ride Completed</Text>
                <Text className="text-sm text-gray-500">Trip completion alerts</Text>
              </View>
            </View>
            <ToggleButton enabled={rideCompleted} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <View className="bg-white rounded-2xl p-5">
          <Text className="mb-4">Messages</Text>
          <Separator className="mb-4" />
          
          <TouchableOpacity 
            className="flex flex-row items-center justify-between"
            onPress={() => setMessages(!messages)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </View>
              <View>
                <Text>Chat Messages</Text>
                <Text className="text-sm text-gray-500">Messages from driver</Text>
              </View>
            </View>
            <ToggleButton enabled={messages} />
          </TouchableOpacity>
        </View>

        {/* Payments & Promos */}
        <View className="bg-white rounded-2xl p-5">
          <Text className="mb-4">Payments & Promos</Text>
          <Separator className="mb-4" />
          
          <TouchableOpacity 
            className="flex flex-row items-center justify-between mb-4"
            onPress={() => setPaymentUpdates(!paymentUpdates)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </View>
              <View>
                <Text>Payment Updates</Text>
                <Text className="text-sm text-gray-500">Receipt and refunds</Text>
              </View>
            </View>
            <ToggleButton enabled={paymentUpdates} />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex flex-row items-center justify-between"
            onPress={() => setPromotions(!promotions)}
            activeOpacity={0.7}
          >
            <View className="flex flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </View>
              <View>
                <Text>Promotions</Text>
                <Text className="text-sm text-gray-500">Special offers & discounts</Text>
              </View>
            </View>
            <ToggleButton enabled={promotions} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}