import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native-web';
import { Wallet, CreditCard, Plus, ChevronRight, Gift, History, Taka } from './Icons';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import type { UserProfile } from '../App';

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
  { id: '2', type: 'Trip Payment', amount: -120, date: 'Oct 22, 2025', time: '8:30 AM' },
  { id: '3', type: 'Refund', amount: 50, date: 'Oct 21, 2025', time: '4:20 PM' },
  { id: '4', type: 'Trip Payment', amount: -95, date: 'Oct 21, 2025', time: '6:15 PM' },
];

export default function WalletScreen({ userProfile, onNavigate }: WalletScreenProps) {
  const isFemale = userProfile?.gender === 'female';
  const balanceGradient = isFemale 
    ? 'bg-gradient-to-br from-pink-500 to-rose-500' 
    : 'bg-gradient-to-br from-blue-600 to-cyan-500';
  const buttonTextColor = isFemale ? 'text-pink-600' : 'text-blue-600';

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      <View className="p-6 bg-white border-b">
        <Text className="text-2xl">Wallet</Text>
      </View>

      <View className="p-6 space-y-6">
        {/* Balance Card */}
        <Card className={`${balanceGradient} text-white border-0`}>
          <CardHeader>
            <CardTitle className="flex flex-row items-center gap-2 text-white">
              <Wallet className="w-5 h-5" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <View className="space-y-4">
              <Text className="text-4xl text-white">0 taka</Text>
              <Button 
                onClick={() => onNavigate('add-money')}
                className={`w-full bg-white ${buttonTextColor} hover:bg-gray-100`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Money
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <View className="flex flex-row items-center justify-between">
            <Text>Payment Methods</Text>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={() => onNavigate('payment-methods')}
            >
              <Plus className="w-4 h-4" />
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
                  className="flex flex-row items-center justify-between p-4 border rounded-xl"
                >
                  <View className="flex flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </View>
                    <View>
                      <Text>{method.type}</Text>
                      {method.last4 && (
                        <Text className="text-sm text-gray-500">•••• {method.last4}</Text>
                      )}
                      {method.primary && (
                        <Text className="text-xs text-blue-600">Default</Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Promo Code */}
        <TouchableOpacity 
          onPress={() => onNavigate('promo-code')}
          className="bg-white rounded-2xl p-5"
        >
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Gift className="w-5 h-5 text-green-600" />
              </View>
              <View>
                <Text>Promo Code</Text>
                <Text className="text-sm text-gray-500">Add a promo code</Text>
              </View>
            </View>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </View>
        </TouchableOpacity>

        {/* Transaction History */}
        <View className="bg-white rounded-2xl p-5 space-y-4">
          <View className="flex flex-row items-center gap-2">
            <History className="w-5 h-5" />
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
            onClick={() => onNavigate('all-transactions')}
          >
            View All Transactions
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
