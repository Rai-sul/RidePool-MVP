import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Star, UserPlus } from './Icons';
import { Button } from './ui/button';
import type { UserProfile } from '../contexts/GlobalContext';

type RatingModalProps = {
  visible: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
};

export default function RatingModal({ visible, onClose, userProfile }: RatingModalProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [coRiderRatings, setCoRiderRatings] = useState<{ [key: number]: number }>({});
  
  const isFemale = userProfile?.gender === 'female';
  const accentBg = isFemale ? 'bg-pink-500' : 'bg-blue-600';

  const driver = {
    name: 'Ahmed Khan',
    initial: 'A',
  };

  const coRiders = [
    { id: 1, name: 'Fatima Ali', initial: 'F' },
    { id: 2, name: 'Sarah Ahmed', initial: 'S' },
  ];

  const handleSubmit = () => {
    // Submit ratings
    onClose();
  };

  const renderStars = (rating: number, onRate: (rate: number) => void) => {
    return (
      <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRate(star)}
            activeOpacity={0.7}
          >
            <Star
              className="w-8 h-8"
              fill={star <= rating ? '#fbbf24' : 'none'}
              color={star <= rating ? '#fbbf24' : '#d1d5db'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <TouchableOpacity 
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="bg-white rounded-t-3xl h-[90%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-200">
            <Text className="text-xl font-semibold">Rate Your Experience</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center"
            >
              <X className="w-6 h-6 text-gray-500" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Overall Experience */}
            <View className="p-6 border-b border-gray-100">
              <Text className="font-semibold mb-4">Overall Experience</Text>
              <View className="items-center gap-3">
                {renderStars(overallRating, setOverallRating)}
                <Text className="text-sm text-gray-500">
                  {overallRating === 0
                    ? 'Tap to rate'
                    : overallRating === 5
                    ? 'Excellent!'
                    : overallRating >= 4
                    ? 'Great!'
                    : overallRating >= 3
                    ? 'Good'
                    : 'Could be better'}
                </Text>
              </View>
            </View>

            {/* Driver Rating */}
            <View className="p-6 border-b border-gray-100">
              <Text className="font-semibold mb-4">Rate Your Driver</Text>
              <View className="flex-row items-center gap-4 mb-4">
                <View className="w-12 h-12 rounded-full items-center justify-center bg-gray-300 border-2 border-white shadow-sm">
                  <Text className="text-gray-800 text-lg font-semibold">{driver.initial}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-medium">{driver.name}</Text>
                  <Text className="text-sm text-gray-500">Your Driver</Text>
                </View>
              </View>
              <View className="items-center">
                {renderStars(driverRating, setDriverRating)}
              </View>
            </View>

            {/* Co-Riders Rating */}
            {coRiders.length > 0 && (
              <View className="p-6">
                <Text className="font-semibold mb-4">Rate Co-Riders</Text>
                <View className="gap-4">
                  {coRiders.map((rider) => (
                    <View key={rider.id} className="bg-gray-50 rounded-2xl p-4">
                      <View className="flex-row items-center gap-3 mb-3">
                        <View className="w-10 h-10 rounded-full items-center justify-center bg-gray-300 border-2 border-white">
                          <Text className="text-gray-800 font-semibold">{rider.initial}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-medium">{rider.name}</Text>
                          <Text className="text-xs text-gray-500">Co-rider</Text>
                        </View>
                        <TouchableOpacity
                          className="items-center justify-center"
                          activeOpacity={0.7}
                        >
                          <UserPlus className="w-5 h-5 text-gray-600" />
                        </TouchableOpacity>
                      </View>
                      <View className="items-center">
                        {renderStars(
                          coRiderRatings[rider.id] || 0,
                          (rating) =>
                            setCoRiderRatings({ ...coRiderRatings, [rider.id]: rating })
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <View className="p-6 border-t border-gray-200">
            <Button
              onPress={handleSubmit}
              className={`w-full h-14 ${accentBg}`}
              disabled={overallRating === 0}
            >
              <Text className="text-white font-semibold text-base">Submit Ratings</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
