import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Wallet, CreditCard, Smartphone, Building } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import LinearGradient from './LinearGradient';
import type { UserProfile } from '../contexts/GlobalContext'; // Assuming UserProfile is defined in GlobalContext

type AddMoneyProps = {
  onBack: () => void;
  userProfile: UserProfile | null; // Add userProfile to props
};

const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

const paymentOptions = [
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, description: 'Add using your card' },
  { id: 'mobile', name: 'Mobile Banking', icon: Smartphone, description: 'bKash, Nagad, Rocket' },
  { id: 'bank', name: 'Bank Transfer', icon: Building, description: 'Direct bank transfer' },
];

export default function AddMoney({ onBack, userProfile }: AddMoneyProps) {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const isFemale = userProfile?.gender === 'female';
  const balanceGradientColors = isFemale 
    ? ['#ec4899', '#e11d48'] 
    : ['#2563eb', '#06b6d4'];
  const buttonBgColor = isFemale ? 'bg-pink-600' : 'bg-blue-600';

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleAddMoney = () => {
    if (amount && selectedMethod) {
      // Handle add money logic
      alert(`Adding ${amount} taka via ${selectedMethod}`);
    }
  };

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">


      {/* Content */}
      <View className="p-6 space-y-6">
        {/* Current Balance */}
        <LinearGradient
          colors={balanceGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-2xl p-6 overflow-hidden"
        >
          <View className="flex flex-row items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-white" />
            <Text className="text-sm text-white opacity-90">Current Balance</Text>
          </View>
          <Text className="text-4xl text-white">0 taka</Text>
        </LinearGradient>

        <View className="rounded-2xl p-5 space-y-4 mb-4 overflow-hidden">
          <Text>Enter Amount</Text>
          <View className="relative mb-4">
            <Input
              keyboardType="number-pad"
              placeholder="0"
              value={amount}
              onChangeText={setAmount}
              className="h-16 text-2xl pr-16"
            />
            <Text className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">taka</Text>
          </View>

          <View className="flex-row flex-wrap justify-between gap-2">
            {quickAmounts.slice(0, 3).map((value) => (
              <Button
                key={value}
                variant="outline"
                onPress={() => handleQuickAmount(value)}
                className={`flex-1 h-12 flex-row ${amount === value.toString() ? 'border-blue-600 bg-blue-50' : ''}`}
              >
                {value}
              </Button>
            ))}
          </View>
          <View className="flex-row flex-wrap justify-between gap-2 mt-2">
            {quickAmounts.slice(3, 5).map((value) => (
              <Button
                key={value}
                variant="outline"
                onPress={() => handleQuickAmount(value)}
                className={`flex-1 h-12 flex-row ${amount === value.toString() ? 'border-blue-600 bg-blue-50' : ''}`}
              >
                {value}
              </Button>
            ))}
          </View>
        </View>

        {/* Payment Method */}
        <View className="rounded-2xl p-5 space-y-4 mb-4 overflow-hidden">
          <Text>Select Payment Method</Text>
          <View className="space-y-2">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => setSelectedMethod(option.id)}
                  className={`w-full flex flex-row items-center gap-3 p-4 border-2 rounded-xl mb-2 ${
                    selectedMethod === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <View className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedMethod === option.id ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      selectedMethod === option.id ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </View>
                  <View className="flex-1">
                    <Text>{option.name}</Text>
                    <Text className="text-sm text-gray-500">{option.description}</Text>
                  </View>
                  {selectedMethod === option.id && (
                    <View className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <View className="w-2 h-2 bg-white rounded-full"></View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Add Money Button */}
        <Button
          onPress={handleAddMoney}
          disabled={!amount || !selectedMethod}
          className={`w-full h-14 flex-row ${buttonBgColor} text-white`}
        >
          Add {amount || '0'} taka
        </Button>
      </View>
    </ScrollView>
  );
}