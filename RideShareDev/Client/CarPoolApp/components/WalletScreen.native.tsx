import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, CreditCard, Plus, ChevronRight, Gift, History, Taka } from './Icons';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import type { UserProfile } from '../contexts/GlobalContext';
import LinearGradient from './LinearGradient';

type WalletScreenProps = {
  userProfile: UserProfile | null;
  onNavigate: (page: string) => void;
};

const paymentMethods = [
  { id: '1', type: 'Cash', icon: Taka, primary: true },
  { id: '2', type: 'Credit Card', last4: '4242', icon: CreditCard },
  { id: '3', type: 'Debit Card', last4: '8888', icon: CreditCard },
];

const transactions = [
  { id: '1', type: 'Trip Payment', amount: -185, date: 'Oct 23, 2025', time: '2:45 PM' },
  { id: '2', type: 'Trip Payment', amount: -120, date: 'Oct 22, 2025', time: '8:30 AM', status: 'Completed' },
  { id: '3', type: 'Refund', amount: 50, date: 'Oct 21, 2025', time: '4:20 PM' },
  { id: '4', type: 'Trip Payment', amount: -95, date: 'Oct 21, 2025', time: '6:15 PM' },
];

export default function WalletScreen({ userProfile, onNavigate }: WalletScreenProps) {
  const isFemale = userProfile?.gender === 'female';
  const balanceGradientColors = isFemale 
    ? ['#ec4899', '#e11d48'] 
    : ['#2563eb', '#06b6d4'];
  const buttonTextColor = isFemale ? 'text-pink-600' : 'text-blue-600';

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null); 

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
    <ScrollView className="h-full w-full bg-gray-50 flex-1" contentContainerStyle={{ paddingBottom: 64 }}>
      
      {/* Balance Card - Full Width */}
      <LinearGradient
        colors={balanceGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-6 pb-8"
      >
        <View className="mb-2">
          <View className="flex flex-row items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-white" />
            <Text className="text-white text-lg font-medium">Available Balance</Text>
          </View>
          <Text className="text-4xl text-white font-bold mb-6">0 taka</Text>
          <Button 
            onPress={() => onNavigate('add-money')}
            className={`w-full flex-row bg-white hover:bg-gray-100`}
          >
            <Plus className="w-5 h-5 mr-2" />
            <Text className="text-gray-900 font-medium">Add Money</Text>
          </Button>
        </View>
      </LinearGradient>

      <View className="p-6 space-y-6">

        <View className="rounded-2xl p-5 space-y-4 overflow-hidden">
          <View className="flex flex-row items-center justify-between">
            <Text>Payment Methods</Text>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 flex-row"
              onPress={() => onNavigate('payment-methods')}
            >
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </View>

          <View className="space-y-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => onNavigate('payment-methods')}
                  className="flex flex-row items-center justify-between p-4 border rounded-xl mb-2"
                >
                  <View className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selectedMethod === method.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Icon className={`w-5 h-5 ${selectedMethod === method.id ? 'text-blue-600' : 'text-gray-600'}`} />
                  </View>
                  <View className="flex-1">
                    <Text>{method.type}</Text>
                    {method.last4 && (
                      <Text className="text-sm text-gray-500">•••• {method.last4}</Text>
                    )}
                    {method.primary && (
                      <Text className="text-xs text-blue-600">Default</Text>
                    )}
                  </View>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Promo Code */}
        <TouchableOpacity 
          onPress={() => onNavigate('promo-code')}
          className="rounded-2xl p-5 overflow-hidden"
        >
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-green-600" />
              </View>
              <View>
                <Text>Promo Code</Text>
                <Text className="text-sm text-gray-500">Add a promo code</Text>
              </View>
            </View>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </View>
        </TouchableOpacity>

        {/* Transaction History */}
        <View className="rounded-2xl p-5 space-y-4 overflow-hidden">
          <View className="flex flex-row items-center gap-2">
            <History className="w-5 h-5 flex-shrink-0" />
            <Text>Transaction History</Text>
          </View>

          <View className="space-y-3">
            {transactions.map((transaction, index) => (
              <View key={transaction.id}>
                {index > 0 && <Separator />}
                <View className="flex flex-row items-center justify-between py-2">
                  <View>
                    <Text className="text-sm">{transaction.type}</Text>
                    <Text className="text-xs text-gray-500">
                      {transaction.date} • {transaction.time}
                    </Text>
                  </View>
                  <Text
                    className={`${
                      transaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                    }`}
                  >
                    {transaction.amount > 0 ? '+' : ''}
                    {transaction.amount} taka
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Button 
            variant="outline" 
            className="w-full"
            onPress={() => onNavigate('all-transactions')}
          >
            View All Transactions
          </Button>
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}