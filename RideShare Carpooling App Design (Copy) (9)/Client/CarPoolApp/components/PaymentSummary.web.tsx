import React from 'react';
import { View, Text, ScrollView } from 'react-native-web';
import { Receipt, CreditCard, Taka } from './Icons';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import type { Destination, UserProfile } from '../App';

type PaymentSummaryProps = {
  destination: Destination | null;
  userProfile: UserProfile | null;
  onDone: () => void;
};

export default function PaymentSummary({ destination, userProfile, onDone }: PaymentSummaryProps) {
  const tipAmounts = [20, 30, 50];
  const isFemale = userProfile?.gender === 'female';

  return (
    <View className="h-full w-full bg-white flex flex-col">
      <ScrollView className="flex-1 p-6">
        <View className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <View className="items-center space-y-2">
            <View className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Receipt className="w-8 h-8 text-green-600" />
            </View>
            <Text className="text-2xl">Trip Complete!</Text>
            <Text className="text-gray-500">Thank you for riding with us</Text>
          </View>

          {/* Trip Details */}
          <View className="bg-gray-50 rounded-2xl p-5 space-y-3">
            <View className="flex flex-row justify-between">
              <Text className="text-sm text-gray-600">Route</Text>
              <Text className="text-sm text-right">{destination?.name || 'Your destination'}</Text>
            </View>
            <View className="flex flex-row justify-between">
              <Text className="text-sm text-gray-600">Date</Text>
              <Text className="text-sm">Oct 23, 2025</Text>
            </View>
            <View className="flex flex-row justify-between">
              <Text className="text-sm text-gray-600">Time</Text>
              <Text className="text-sm">2:45 PM</Text>
            </View>
          </View>

          {/* Fare Breakdown */}
          <View className="space-y-4">
            <View className="flex flex-row items-center gap-2">
              <Taka className="w-5 h-5" />
              <Text>Fare Breakdown</Text>
            </View>

            <View className="space-y-3">
              <View className="flex flex-row justify-between">
                <Text className="text-gray-600">Base Fare</Text>
                <Text>200 taka</Text>
              </View>
              <View className="flex flex-row justify-between">
                <Text className="text-green-600">Pool Discount</Text>
                <Text className="text-green-600">-50 taka</Text>
              </View>
              <View className="flex flex-row justify-between">
                <Text className="text-gray-600">Taxes & Fee</Text>
                <Text>35 taka</Text>
              </View>
              
              <Separator />
              
              <View className="flex flex-row justify-between">
                <Text className="text-xl">Total Paid</Text>
                <Text className="text-xl">185 taka</Text>
              </View>
            </View>
          </View>

          {/* Payment Method */}
          <View className="flex flex-row items-center justify-between p-4 bg-gray-50 rounded-xl">
            <View className="flex flex-row items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <Text>Cash</Text>
            </View>
            <Text className="text-gray-600">185 taka</Text>
          </View>

          {/* Add Tip */}
          <View className="space-y-3">
            <Text className="text-sm text-gray-600">Add Tip (Optional)</Text>
            <View className="flex flex-row gap-3">
              {tipAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  className="flex-1 h-12 active:scale-95 transition-transform"
                >
                  {amount}tk
                </Button>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View className="p-6 border-t">
        <Button
          onClick={onDone}
          className={`w-full h-14 ${isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'} active:scale-[0.98] transition-transform`}
        >
          Done
        </Button>
      </View>
    </View>
  );
}
