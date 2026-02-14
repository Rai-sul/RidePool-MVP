import { View, Text, Modal, ScrollView, Pressable } from "react-native";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { CheckCircle2, Navigation, DollarSign, Star } from "lucide-react-native";
import type { Customer } from "../../types";

interface PassengerBillingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  passenger: Customer | null;
  earnings: number;
  distance: number;
}

export function PassengerBillingDialog({ 
  isOpen, 
  onClose, 
  passenger, 
  earnings,
  distance 
}: PassengerBillingDialogProps) {
  if (!passenger) return null;

  // Calculate fare breakdown
  const baseFare = 60;
  const distanceFare = Math.round(distance * 25); // ৳25 per km
  const platformFee = Math.round(earnings * 0.15); // 15% platform fee
  const grossEarnings = baseFare + distanceFare;
  const netEarnings = grossEarnings - platformFee;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl max-h-[90%]" onPress={(e) => e.stopPropagation()}>
          <ScrollView className="p-6">
            {/* Header */}
            <View className="mb-4">
              <Text className="text-xl font-semibold mb-2">Trip Completed</Text>
              <Text className="text-sm text-gray-600">
                Passenger billing summary for this drop-off
              </Text>
            </View>

            {/* Success Badge */}
            <View className="items-center mb-4">
              <View className="bg-green-100 rounded-full p-4">
                <CheckCircle2 size={48} color="#059669" />
              </View>
            </View>

            {/* Passenger Info */}
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 mb-4">
              <View className="flex-row items-center gap-3">
                <View className="w-14 h-14 rounded-full bg-blue-600 items-center justify-center">
                  <Text className="text-white text-xl">
                    {passenger.name.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-lg">{passenger.name}</Text>
                  <View className="flex-row items-center gap-1">
                    <Star size={12} color="#EAB308" fill="#EAB308" />
                    <Text className="text-sm text-gray-600">{passenger.rating} rating</Text>
                  </View>
                </View>
                <Badge className="bg-green-600">
                  <Text className="text-white">Completed</Text>
                </Badge>
              </View>
            </Card>

            {/* Trip Route */}
            <View className="space-y-3 mb-4">
              <View className="flex-row items-start gap-3">
                <View className="items-center">
                  <View className="w-3 h-3 rounded-full bg-green-600" />
                  <View className="w-0.5 h-8 bg-gray-300 my-1" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-0.5">PICKUP</Text>
                  <Text className="font-medium">{passenger.pickup}</Text>
                </View>
              </View>

              <View className="flex-row items-start gap-3">
                <View>
                  <View className="w-3 h-3 rounded-full bg-red-600" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-0.5">DROP-OFF</Text>
                  <Text className="font-medium">{passenger.destination}</Text>
                </View>
              </View>
            </View>

            <Separator className="my-4" />

            {/* Trip Details */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between py-1">
                <View className="flex-row items-center gap-2">
                  <Navigation size={16} color="#6B7280" />
                  <Text className="text-sm text-gray-600">Distance Covered</Text>
                </View>
                <Text className="font-semibold">{distance.toFixed(1)} km</Text>
              </View>
            </View>

            <Separator className="my-4" />

            {/* Fare Breakdown */}
            <View className="space-y-2 mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <DollarSign size={16} color="#000000" />
                <Text className="font-semibold">Fare Breakdown</Text>
              </View>
              
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-600">Base Fare</Text>
                  <Text className="text-sm text-gray-600">৳{baseFare}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-600">Distance ({distance.toFixed(1)} km × ৳25)</Text>
                  <Text className="text-sm text-gray-600">৳{distanceFare}</Text>
                </View>
                <Separator className="my-2" />
                <View className="flex-row justify-between">
                  <Text className="font-medium">Gross Earnings</Text>
                  <Text className="font-medium">৳{grossEarnings}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-red-600">Platform Fee (15%)</Text>
                  <Text className="text-xs text-red-600">- ৳{platformFee}</Text>
                </View>
              </View>
            </View>

            <Separator className="my-4" />

            {/* Net Earnings */}
            <Card className="p-4 bg-gradient-to-r from-green-600 to-green-700 mb-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm text-white opacity-90 mb-1">Your Earnings</Text>
                  <Text className="text-3xl text-white">৳{netEarnings}</Text>
                </View>
                <View className="bg-white/20 p-3 rounded-full">
                  <DollarSign size={32} color="#FFFFFF" />
                </View>
              </View>
            </Card>

            {/* Action Button */}
            <Button 
              className="w-full h-12 bg-blue-600 mb-2"
              onPress={onClose}
            >
              <Text className="text-white">Continue</Text>
            </Button>

            {/* Note */}
            <Text className="text-xs text-center text-gray-500">
              Earnings will be added to your total after completing the pool
            </Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
