import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native-web';
import { ArrowLeft, Shield, Phone, Users, AlertCircle, Share2, Lock } from './Icons';
import { Button } from './ui/button';

type SafetyCenterProps = {
  onBack: () => void;
};

const safetyFeatures = [
  {
    icon: Phone,
    title: 'Emergency Contacts',
    description: 'Add trusted contacts who can track your trips',
    action: 'Manage',
  },
  {
    icon: Share2,
    title: 'Share My Trip',
    description: 'Share live location with friends and family',
    action: 'Share',
  },
  {
    icon: AlertCircle,
    title: '24/7 Safety Line',
    description: 'Call our safety team anytime',
    action: 'Call',
  },
  {
    icon: Lock,
    title: 'Verify Your Ride',
    description: 'Match driver details before you ride',
    action: 'Learn More',
  },
];

const emergencyContacts = [
  { id: '1', name: 'Mom', phone: '+880 1712-111111' },
  { id: '2', name: 'Dad', phone: '+880 1712-222222' },
];

export default function SafetyCenter({ onBack }: SafetyCenterProps) {
  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      {/* Header */}
      <View className="bg-white border-b p-4 flex flex-row items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Text className="text-xl">Safety Center</Text>
      </View>

      {/* Content */}
      <View className="p-6 space-y-4">
        {/* Emergency Button */}
        <Button
          variant="destructive"
          className="w-full h-16 bg-red-600 hover:bg-red-700"
        >
          <AlertCircle className="w-6 h-6 mr-2" />
          Emergency Alert
        </Button>

        {/* Safety Features */}
        <View className="bg-white rounded-2xl p-5 space-y-3">
          <Text>Safety Features</Text>
          {safetyFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <TouchableOpacity
                key={feature.title}
                className="flex flex-row items-center justify-between p-3 border rounded-xl"
              >
                <View className="flex flex-row items-center gap-3 flex-1">
                  <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </View>
                  <View>
                    <Text>{feature.title}</Text>
                    <Text className="text-sm text-gray-500">{feature.description}</Text>
                  </View>
                </View>
                <Button variant="ghost" size="sm">
                  {feature.action}
                </Button>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Emergency Contacts */}
        <View className="bg-white rounded-2xl p-5 space-y-3">
          <View className="flex flex-row items-center justify-between">
            <Text>Emergency Contacts</Text>
            <Button variant="ghost" size="sm">
              Add
            </Button>
          </View>
          <View className="space-y-2">
            {emergencyContacts.map((contact) => (
              <View
                key={contact.id}
                className="flex flex-row items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </View>
                  <View>
                    <Text>{contact.name}</Text>
                    <Text className="text-sm text-gray-500">{contact.phone}</Text>
                  </View>
                </View>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </View>
            ))}
          </View>
        </View>

        {/* Safety Tips */}
        <View className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <View className="flex flex-row items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <Text className="text-blue-900">Safety Tips</Text>
          </View>
          <View className="space-y-2">
            <Text className="text-sm text-blue-800">• Always verify driver details before entering the vehicle</Text>
            <Text className="text-sm text-blue-800">• Share your trip with trusted contacts</Text>
            <Text className="text-sm text-blue-800">• Sit in the back seat when riding alone</Text>
            <Text className="text-sm text-blue-800">• Trust your instincts - cancel if something feels wrong</Text>
            <Text className="text-sm text-blue-800">• Keep your phone charged and accessible</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
