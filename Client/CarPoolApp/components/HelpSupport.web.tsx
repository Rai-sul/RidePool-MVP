import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native-web';
import { ArrowLeft, HelpCircle, Phone, Mail, ChevronRight, FileText, MessageCircle } from './Icons';
import { Button } from './ui/button';

type HelpSupportProps = {
  onBack: () => void;
  onChatPress?: () => void;
};

const helpTopics = [
  { icon: FileText, title: 'Trip Issues', items: ['Cancel a trip', 'Report a problem', 'Lost items'] },
  { icon: FileText, title: 'Payment & Billing', items: ['Payment methods', 'Refunds', 'Promo codes'] },
  { icon: FileText, title: 'Account', items: ['Update profile', 'Verify account', 'Delete account'] },
  { icon: FileText, title: 'Privacy', items: ['Privacy settings', 'Account data', 'Notification controls'] },
];

export default function HelpSupport({ onBack, onChatPress }: HelpSupportProps) {
  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      {/* Header */}
      <View className="bg-white border-b p-4 flex flex-row items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Text className="text-xl">Help & Support</Text>
      </View>

      {/* Content */}
      <View className="p-6 space-y-4">
        {/* Quick Actions */}
        <View className="grid grid-cols-3 gap-3">
          <TouchableOpacity 
            className="bg-white rounded-2xl p-4 items-center active:scale-95"
            onPress={onChatPress}
          >
            <View className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </View>
            <Text className="text-sm">Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white rounded-2xl p-4 items-center active:scale-95">
            <View className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Phone className="w-6 h-6 text-green-600" />
            </View>
            <Text className="text-sm">Call</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white rounded-2xl p-4 items-center active:scale-95">
            <View className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Mail className="w-6 h-6 text-purple-600" />
            </View>
            <Text className="text-sm">Email</Text>
          </TouchableOpacity>
        </View>

        {/* Help Topics */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <Text>Browse Help Topics</Text>
          {helpTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <View key={topic.title}>
                <View className="flex flex-row items-center gap-3 mb-2">
                  <View className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </View>
                  <Text>{topic.title}</Text>
                </View>
                <View className="ml-11 space-y-1">
                  {topic.items.map((item) => (
                    <TouchableOpacity
                      key={item}
                      className="flex flex-row items-center justify-between p-2 rounded-lg"
                    >
                      <Text className="text-sm text-gray-600">{item}</Text>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* FAQ */}
        <View className="bg-white rounded-2xl p-5 space-y-3">
          <Text>Frequently Asked Questions</Text>
          <View className="space-y-2">
            <TouchableOpacity className="p-3 bg-gray-50 rounded-xl">
              <Text className="text-sm">How do I cancel a ride?</Text>
            </TouchableOpacity>
            <TouchableOpacity className="p-3 bg-gray-50 rounded-xl">
              <Text className="text-sm">What is the cancellation policy?</Text>
            </TouchableOpacity>
            <TouchableOpacity className="p-3 bg-gray-50 rounded-xl">
              <Text className="text-sm">How do I add a payment method?</Text>
            </TouchableOpacity>
            <TouchableOpacity className="p-3 bg-gray-50 rounded-xl">
              <Text className="text-sm">How are pool mates selected?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Info */}
        <View className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <Text className="text-blue-900 mb-3">Contact Information</Text>
          <View className="space-y-2">
            <Text className="text-sm text-blue-800">📞 Hotline: +880 9612-345678</Text>
            <Text className="text-sm text-blue-800">📧 Email: support@rideshare.com</Text>
            <Text className="text-sm text-blue-800">🕐 Available: 24/7</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
