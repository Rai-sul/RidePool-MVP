import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native-web';
import { ArrowLeft, CreditCard, Plus, Check, Trash2, DollarSign } from './Icons';
import { Button } from './ui/button';

type PaymentMethodsProps = {
  onBack: () => void;
};

const initialPaymentMethods = [
  { id: '1', type: 'Cash', icon: DollarSign, primary: true },
  { id: '2', type: 'Credit Card', last4: '4242', icon: CreditCard, primary: false },
  { id: '3', type: 'Debit Card', last4: '8888', icon: CreditCard, primary: false },
];

export default function PaymentMethods({ onBack }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods);
  const [primaryId, setPrimaryId] = useState('1');

  const handleSetPrimary = (id: string) => {
    setPrimaryId(id);
  };

  const handleDelete = (id: string) => {
    if (paymentMethods.length > 1) {
      setPaymentMethods(paymentMethods.filter(m => m.id !== id));
      if (primaryId === id) {
        setPrimaryId(paymentMethods.find(m => m.id !== id)?.id || '');
      }
    }
  };

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      {/* Header */}
      <View className="bg-white border-b p-4 flex flex-row items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Text className="text-xl">Payment Methods</Text>
      </View>

      {/* Content */}
      <View className="p-6 space-y-4">
        {/* Payment Methods List */}
        <View className="bg-white rounded-2xl p-5 space-y-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isPrimary = method.id === primaryId;
            
            return (
              <View
                key={method.id}
                className="flex flex-row items-center justify-between p-4 border rounded-xl"
              >
                <View className="flex flex-row items-center gap-3 flex-1">
                  <View className={`w-10 h-10 ${isPrimary ? 'bg-blue-100' : 'bg-gray-100'} rounded-full flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${isPrimary ? 'text-blue-600' : 'text-gray-600'}`} />
                  </View>
                  <View>
                    <Text>{method.type}</Text>
                    {method.last4 && (
                      <Text className="text-sm text-gray-500">•••• {method.last4}</Text>
                    )}
                    {isPrimary && (
                      <Text className="text-xs text-blue-600">Default</Text>
                    )}
                  </View>
                </View>
                
                <View className="flex flex-row items-center gap-2">
                  {!isPrimary && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(method.id)}
                      >
                        Set Default
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(method.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {isPrimary && (
                    <View className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Add New Payment Method */}
        <Button className="w-full" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add New Payment Method
        </Button>

        {/* Info */}
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Text className="text-sm text-blue-900">
            💳 Your payment information is encrypted and secure. We support credit cards, debit cards, and cash payments.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
