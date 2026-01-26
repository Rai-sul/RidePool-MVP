import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ArrowLeft, Star, TrendingUp } from './Icons';
import { Button } from './ui/button';
import LinearGradient from './LinearGradient'; // Import LinearGradient

type YourRatingsProps = {
  onBack: () => void;
};

const ratings = [
  { period: 'Overall', rating: 4.8, total: 47 },
  { period: 'Last 30 days', rating: 4.9, total: 12 },
  { period: 'Last 7 days', rating: 5.0, total: 3 },
];

const recentFeedback = [
  { id: '1', rider: 'Ahmed K.', rating: 5, comment: 'Great co-rider! Very friendly and punctual.', date: 'Oct 23, 2025' },
  { id: '2', rider: 'Sarah M.', rating: 5, comment: 'Pleasant journey, respectful and quiet.', date: 'Oct 22, 2025' },
  { id: '3', rider: 'Karim R.', rating: 4, comment: 'Good experience overall.', date: 'Oct 21, 2025' },
];

export default function YourRatings({ onBack }: YourRatingsProps) {
  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1" contentContainerStyle={{ paddingBottom: 64 }}>
      {/* Header */}
      {/* Removed custom header */}

      {/* Content */}
      <View className="p-6 space-y-4">
        {/* Rating Cards */}
        <View className="flex-row justify-around gap-3">
          {ratings.map((item) => (
            <View key={item.period} className="bg-white rounded-2xl p-4 items-center flex-1">
              <View className="flex flex-row items-center justify-center gap-1 mb-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Text className="text-2xl">{item.rating}</Text>
              </View>
              <Text className="text-xs text-gray-500">{item.period}</Text>
              <Text className="text-xs text-gray-400">{item.total} trips</Text>
            </View>
          ))}
        </View>

        {/* Stats */}
        <LinearGradient
          colors={['#2563eb', '#06b6d4']} // Approximate colors for from-blue-600 to-cyan-500
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-2xl p-5"
        >
          <View className="flex flex-row items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-white" />
            <Text className="text-white">Performance</Text>
          </View>
          <View className="flex-row justify-around gap-4">
            <View className="items-center">
              <Text className="text-2xl text-white">96%</Text>
              <Text className="text-sm text-blue-100">Acceptance Rate</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl text-white">98%</Text>
              <Text className="text-sm text-blue-100">On-Time Rate</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Recent Feedback */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <Text>Recent Feedback</Text>
          <View className="space-y-3">
            {recentFeedback.map((feedback) => (
              <View key={feedback.id} className="p-3 bg-gray-50 rounded-xl">
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text>{feedback.rider}</Text>
                  <View className="flex flex-row gap-0.5">
                    {Array.from({ length: feedback.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </View>
                </View>
                <Text className="text-sm text-gray-600 mb-1">"{feedback.comment}"</Text>
                <Text className="text-xs text-gray-400">{feedback.date}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}