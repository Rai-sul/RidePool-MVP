import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ArrowLeft, Download, Filter, Search } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';

type AllTransactionsProps = {
  onBack: () => void;
};

const allTransactions = [
  { id: '1', type: 'Trip Payment', amount: -185, date: 'Oct 23, 2025', time: '2:45 PM', status: 'Completed' },
  { id: '2', type: 'Trip Payment', amount: -120, date: 'Oct 22, 2025', time: '8:30 AM', status: 'Completed' },
  { id: '3', type: 'Refund', amount: 50, date: 'Oct 21, 2025', time: '4:20 PM', status: 'Completed' },
  { id: '4', type: 'Trip Payment', amount: -95, date: 'Oct 21, 2025', time: '6:15 PM', status: 'Completed' },
  { id: '5', type: 'Wallet Top-up', amount: 500, date: 'Oct 20, 2025', time: '10:00 AM', status: 'Completed' },
  { id: '6', type: 'Trip Payment', amount: -150, date: 'Oct 19, 2025', time: '5:30 PM', status: 'Completed' },
  { id: '7', type: 'Trip Payment', amount: -200, date: 'Oct 18, 2025', time: '9:15 AM', status: 'Completed' },
  { id: '8', type: 'Promo Credit', amount: 100, date: 'Oct 17, 2025', time: '12:00 PM', status: 'Completed' },
  { id: '9', type: 'Trip Payment', amount: -175, date: 'Oct 16, 2025', time: '7:45 PM', status: 'Completed' },
  { id: '10', type: 'Trip Payment', amount: -130, date: 'Oct 15, 2025', time: '8:00 AM', status: 'Completed' },
];

export default function AllTransactions({ onBack }: AllTransactionsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = allTransactions.filter((transaction) =>
    transaction.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpent = allTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalEarned = allTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">


      {/* Content */}
      <View className="p-6 space-y-4">
        {/* Summary Cards */}
        <View className="flex flex-row gap-3">
          <View className="rounded-2xl p-4 flex-1">
            <Text className="text-sm text-gray-500 mb-1">Total Spent</Text>
            <Text className="text-2xl text-red-600">-{totalSpent} taka</Text>
          </View>
          <View className="rounded-2xl p-4 flex-1">
            <Text className="text-sm text-gray-500 mb-1">Total Earned</Text>
            <Text className="text-2xl text-green-600">+{totalEarned} taka</Text>
          </View>
        </View>

        {/* Actions */}
        <View className="flex flex-row gap-2 px-6">
          <Button variant="outline" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="w-5 h-5" />
          </Button>
        </View>

        {/* Transactions List */}
        <View className="rounded-2xl p-5 space-y-3">
          <Text>Transaction History</Text>
          <Separator />
          
          {filteredTransactions.length === 0 ? (
            <Text className="text-center text-gray-500 py-8">No transactions found</Text>
          ) : (
            <View className="space-y-3">
              {filteredTransactions.map((transaction, index) => (
                <View key={transaction.id}>
                  {index > 0 && <Separator />}
                  <View className="flex flex-row items-center justify-between py-2">
                    <View className="flex-1">
                      <View className="flex flex-row items-center gap-2">
                        <Text className="text-sm">{transaction.type}</Text>
                        <View className="bg-green-100 px-2 py-0.5 rounded-full">
                          <Text className="text-xs text-green-700">
                            {transaction.status}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-gray-500 mt-1">
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
          )}
        </View>
      </View>
    </ScrollView>
  );
}