import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native-web';
import { ArrowLeft, Wallet, CreditCard, Smartphone, Building } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';

type AddMoneyProps = {
  onBack: () => void;
};

const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

const paymentOptions = [
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, description: 'Add using your card' },
  { id: 'mobile', name: 'Mobile Banking', icon: Smartphone, description: 'bKash, Nagad, Rocket' },
  { id: 'bank', name: 'Bank Transfer', icon: Building, description: 'Direct bank transfer' },
];

export default function AddMoney({ onBack }: AddMoneyProps) {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

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
      {/* Header */}
      <View className="bg-white border-b p-4 flex flex-row items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Text className="text-xl">Add Money</Text>
      </View>

      {/* Content */}
      <View className="p-6 space-y-6">
        {/* Current Balance */}
        <View className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6">
          <View className="flex flex-row items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-white" />
            <Text className="text-sm text-white opacity-90">Current Balance</Text>
          </View>
          <Text className="text-4xl text-white">0 taka</Text>
        </View>

        {/* Enter Amount */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <Text>Enter Amount</Text>
          <View className="relative">
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-16 text-2xl pr-16"
            />
            <Text className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">taka</Text>
          </View>

          {/* Quick Amount Buttons */}
          <View className="grid grid-cols-3 gap-2">
            {quickAmounts.map((value) => (
              <Button
                key={value}
                variant="outline"
                onClick={() => handleQuickAmount(value)}
                className={amount === value.toString() ? 'border-blue-600 bg-blue-50' : ''}
              >
                {value}
              </Button>
            ))}
          </View>
        </View>

        {/* Payment Method */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <Text>Select Payment Method</Text>
          <View className="space-y-2">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => setSelectedMethod(option.id)}
                  className={`w-full flex flex-row items-center gap-3 p-4 border-2 rounded-xl ${
                    selectedMethod === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <View className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
                    <View className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
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
          onClick={handleAddMoney}
          disabled={!amount || !selectedMethod}
          className="w-full h-14"
        >
          Add {amount || '0'} taka
        </Button>

        {/* Info */}
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Text className="text-sm text-blue-900">
            🔒 All transactions are secured with 256-bit encryption. No transaction fees applied.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
