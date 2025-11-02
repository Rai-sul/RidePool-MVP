import React from 'react';
import { View, Text, ScrollView } from 'react-native-web';
import { ArrowLeft, Bell, MessageSquare, Car, Wallet } from './Icons';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

type NotificationsScreenProps = {
  onBack: () => void;
};

export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      {/* Header */}
      <View className="bg-white border-b p-4 flex flex-row items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Text className="text-xl">Notifications</Text>
      </View>

      {/* Content */}
      <View className="p-6 space-y-4">
        {/* Push Notifications */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <Text>Push Notifications</Text>
          <Separator />
          
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-600" />
              </View>
              <View>
                <Text>All Notifications</Text>
                <Text className="text-sm text-gray-500">Enable all notifications</Text>
              </View>
            </View>
            <Switch defaultChecked />
          </View>
        </View>

        {/* Ride Updates */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <Text>Ride Updates</Text>
          <Separator />
          
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </View>
              <View>
                <Text>Driver Matched</Text>
                <Text className="text-sm text-gray-500">When a driver accepts</Text>
              </View>
            </View>
            <Switch defaultChecked />
          </View>

          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </View>
              <View>
                <Text>Driver Arriving</Text>
                <Text className="text-sm text-gray-500">When driver is near</Text>
              </View>
            </View>
            <Switch defaultChecked />
          </View>

          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </View>
              <View>
                <Text>Ride Completed</Text>
                <Text className="text-sm text-gray-500">Trip completion alerts</Text>
              </View>
            </View>
            <Switch defaultChecked />
          </View>
        </View>

        {/* Messages */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <Text>Messages</Text>
          <Separator />
          
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </View>
              <View>
                <Text>Chat Messages</Text>
                <Text className="text-sm text-gray-500">Messages from driver</Text>
              </View>
            </View>
            <Switch defaultChecked />
          </View>
        </View>

        {/* Payments & Promos */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <Text>Payments & Promos</Text>
          <Separator />
          
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </View>
              <View>
                <Text>Payment Updates</Text>
                <Text className="text-sm text-gray-500">Receipt and refunds</Text>
              </View>
            </View>
            <Switch defaultChecked />
          </View>

          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </View>
              <View>
                <Text>Promotions</Text>
                <Text className="text-sm text-gray-500">Special offers & discounts</Text>
              </View>
            </View>
            <Switch defaultChecked />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
