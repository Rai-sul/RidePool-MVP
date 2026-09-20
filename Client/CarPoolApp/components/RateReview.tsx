import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Star, X } from './Icons';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import type { Pool, UserProfile } from '../contexts/GlobalContext';
import LinearGradient from './LinearGradient';

type RateReviewProps = {
  pool: Pool | null;
  userProfile: UserProfile | null;
  onComplete: () => void;
};

const tags = ['Safe Driver', 'Friendly', 'Smooth Ride', 'Clean Car', 'On Time', 'Great Music'];

export default function RateReview({ pool, userProfile, onComplete }: RateReviewProps) {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const isFemale = userProfile?.gender === 'female';

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (!pool) return null;

  return (
    <View className="absolute inset-0 bg-black/50 flex items-end z-50">
      <ScrollView className="w-full bg-white rounded-t-3xl p-6 space-y-6 max-h-[90vh]">
        {/* Close button */}
        <View className="flex flex-row justify-between items-center">
          <Text className="text-xl">Rate Your Trip</Text>
          <Button
            variant="ghost"
            size="icon"
            onPress={onComplete}
            className="rounded-full active:scale-95 transition-transform"
          >
            <X className="w-5 h-5" />
          </Button>
        </View>

        {/* Driver Info */}
        <View className="flex flex-col items-center gap-3">
          <Avatar className="w-20 h-20 border-2 border-blue-200">
            <LinearGradient
              colors={['#2563eb', '#06b6d4']} // Approximate colors for from-blue-500 to-cyan-400
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="w-full h-full items-center justify-center"
            >
              <Text className="text-white text-2xl">
                {pool.photo ?? pool.driver?.id?.charAt(0).toUpperCase() ?? 'D'}
              </Text>
            </LinearGradient>
          </Avatar>
          <View className="items-center">
            <Text className="text-lg">How was your trip with {pool.driverName ?? 'Driver'}?</Text>
            <Text className="text-sm text-gray-500">{pool.carModel ?? pool.vehicles?.model ?? pool.vehicle_type}</Text>
          </View>
        </View>

        {/* Star Rating */}
        <View className="flex flex-row justify-center gap-3 py-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              className="transition-transform"
            >
              <Star
                className={`w-12 h-12 transition-colors ${
                  star <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Tags */}
        <View className="space-y-3">
          <Text className="text-sm text-gray-600">What did you like?</Text>
          <View className="flex flex-row flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className={`cursor-pointer px-4 py-2 text-sm ${
                  selectedTags.includes(tag)
                    ? isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'
                    : 'hover:bg-gray-100'
                }`}
                onPress={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </View>
        </View>

        {/* Additional Comments */}
        <View className="space-y-2">
          <Text className="text-sm text-gray-600">Additional comments (optional)</Text>
          <TextInput
            className="w-full p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            multiline
            numberOfLines={3}
            placeholder="Share more about your experience..."
          />
        </View>

        {/* Submit Button */}
        <Button
          onPress={onComplete}
          disabled={rating === 0}
          className={`w-full h-12 ${isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-300 active:scale-[0.98] transition-transform`}
        >
          Submit Rating
        </Button>
      </ScrollView>
    </View>
  );
}