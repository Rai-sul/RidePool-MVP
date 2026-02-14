import { View, Text, Modal, ScrollView, Pressable, TouchableOpacity, Alert } from "react-native";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Star, Send } from "lucide-react-native";
import { useState } from "react";
import type { Pool } from "../../types";

interface RatingFeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pool: Pool | null;
}

export function RatingFeedbackDialog({ isOpen, onClose, pool }: RatingFeedbackDialogProps) {
  const [ratings, setRatings] = useState<{ [customerId: string]: number }>({});
  const [feedback, setFeedback] = useState<{ [customerId: string]: string }>({});

  const handleRating = (customerId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [customerId]: rating }));
  };

  const handleSubmit = () => {
    Alert.alert("Success", "Ratings submitted successfully!");
    setRatings({});
    setFeedback({});
    onClose();
  };
  
  const handleClose = () => {
    setRatings({});
    setFeedback({});
    onClose();
  };

  if (!pool) return null;

  const allRated = pool.customers.every(customer => ratings[customer.id] > 0);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable className="flex-1 bg-black/50" onPress={handleClose}>
        <Pressable 
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90%]"
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView className="p-6">
            {/* Header */}
            <View className="mb-4">
              <Text className="text-xl font-semibold mb-2">Rate Your Ride</Text>
              <Text className="text-sm text-gray-600">Provide feedback and ratings for your passengers.</Text>
            </View>

            {/* Earnings Summary */}
            <Card className="p-4 bg-gradient-to-r from-green-600 to-green-700 mb-4">
              <View className="items-center">
                <Text className="text-sm text-white opacity-90 mb-1">Total Earned</Text>
                <Text className="text-4xl text-white mb-2">৳{pool.totalEarnings}</Text>
                <Text className="text-sm text-white opacity-90">{pool.customers.length} passengers • {pool.distance}km</Text>
              </View>
            </Card>

            {/* Rate Each Passenger */}
            <View className="space-y-4 mt-4">
              <Text className="font-semibold">Rate Passengers</Text>
              {pool.customers.map(customer => (
                <Card key={customer.id} className="p-4">
                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center">
                      <Text className="text-white">
                        {customer.name.charAt(0)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold">{customer.name}</Text>
                      <Text className="text-xs text-gray-600">{customer.pickup} → {customer.destination}</Text>
                    </View>
                  </View>

                  {/* Star Rating */}
                  <View className="flex-row gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => handleRating(customer.id, star)}
                        activeOpacity={0.7}
                      >
                        <Star
                          size={32}
                          color={(ratings[customer.id] || 0) >= star ? '#EAB308' : '#D1D5DB'}
                          fill={(ratings[customer.id] || 0) >= star ? '#EAB308' : 'transparent'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Optional Feedback */}
                  {ratings[customer.id] > 0 && (
                    <Textarea
                      placeholder="Add feedback (optional)"
                      value={feedback[customer.id] || ''}
                      onChangeText={(text) => setFeedback(prev => ({ ...prev, [customer.id]: text }))}
                      className="mt-2"
                      numberOfLines={2}
                    />
                  )}
                </Card>
              ))}
            </View>

            {/* Submit Button */}
            <Button
              className="w-full h-12 bg-blue-600 mt-4"
              onPress={handleSubmit}
              disabled={!allRated}
            >
              <View className="flex-row items-center">
                <Send size={16} color="#FFFFFF" />
                <Text className="text-white ml-2">Submit Ratings</Text>
              </View>
            </Button>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
