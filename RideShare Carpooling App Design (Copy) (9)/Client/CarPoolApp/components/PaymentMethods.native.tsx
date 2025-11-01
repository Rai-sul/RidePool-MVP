import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { ArrowLeft, CreditCard, Plus, Check, Trash2, Taka, Smartphone, X } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';

type PaymentMethodsProps = {
  onBack: () => void;
  userProfile?: { gender?: string } | null;
};

const initialPaymentMethods = [
  { id: '1', type: 'Cash', icon: Taka, primary: true },
  { id: '2', type: 'Credit Card', last4: '4242', icon: CreditCard, primary: false },
  { id: '3', type: 'Debit Card', last4: '8888', icon: CreditCard, primary: false },
];

export default function PaymentMethods({ onBack, userProfile }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods);
  const [primaryId, setPrimaryId] = useState('1');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'card' | 'mobile'>('card');
  
  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  
  // Mobile banking fields
  const [mobileProvider, setMobileProvider] = useState('bKash');
  const [accountNumber, setAccountNumber] = useState('');
  
  const isFemale = userProfile?.gender === 'female';
  const primaryColor = isFemale ? 'bg-pink-500' : 'bg-blue-600';
  const primaryColorText = isFemale ? 'text-pink-600' : 'text-blue-600';
  const primaryColorLight = isFemale ? 'bg-pink-100' : 'bg-blue-100';

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
  
  const handleAddNew = () => {
    setIsAddingNew(true);
    setActiveTab('card');
    resetFields();
  };
  
  const resetFields = () => {
    setCardNumber('');
    setCardHolder('');
    setExpiryDate('');
    setCvv('');
    setAccountNumber('');
    setMobileProvider('bKash');
  };
  
  const handleSave = () => {
    const newMethod = {
      id: Date.now().toString(),
      type: activeTab === 'card' ? 'Credit Card' : mobileProvider,
      last4: activeTab === 'card' ? cardNumber.slice(-4) : accountNumber.slice(-4),
      icon: activeTab === 'card' ? CreditCard : Smartphone,
      primary: false,
    };
    setPaymentMethods(prev => [...prev, newMethod]);
    setIsAddingNew(false);
    resetFields();
  };
  
  const handleCancel = () => {
    setIsAddingNew(false);
    resetFields();
  };

  return (
    <View className="flex-1 bg-gray-50">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ paddingBottom: isAddingNew ? 200 : 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Content */}
        <View className="p-6 space-y-4">
        {/* Payment Methods List */}
        <View className="rounded-2xl p-5 space-y-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isPrimary = method.id === primaryId;
            
            return (
              <View
                key={method.id}
                className="flex flex-row items-center justify-between p-4 border rounded-xl mb-2"
              >
                <View className="flex flex-row items-center gap-3 flex-1">
                  <View className={`w-10 h-10 ${isPrimary ? 'bg-blue-100' : 'bg-gray-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
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
                        onPress={() => handleSetPrimary(method.id)}
                      >
                        Set Default
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onPress={() => handleDelete(method.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                  {isPrimary && (
                    <View className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Add New Payment Method */}
        {!isAddingNew && (
          <Button 
            className={`w-full flex-row h-12 ${primaryColor}`} 
            onPress={handleAddNew}
          >
            <Plus className="w-5 h-5 mr-2 text-white" />
            <Text className="text-white font-medium">Add New Payment Method</Text>
          </Button>
        )}
        
        {/* Add Payment Form */}
        {isAddingNew && (
          <View className="bg-white rounded-2xl p-5 space-y-4">
            {/* Tabs */}
            <View className="flex-row gap-3 mb-4">
              <TouchableOpacity
                onPress={() => setActiveTab('card')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 ${
                  activeTab === 'card' 
                    ? `${primaryColor.replace('bg-', 'border-')} ${primaryColorLight}` 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <CreditCard className={`w-5 h-5 ${activeTab === 'card' ? primaryColorText : 'text-gray-600'}`} />
                  <Text className={`font-medium ${activeTab === 'card' ? primaryColorText : 'text-gray-600'}`}>
                    Card
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setActiveTab('mobile')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 ${
                  activeTab === 'mobile' 
                    ? `${primaryColor.replace('bg-', 'border-')} ${primaryColorLight}` 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Smartphone className={`w-5 h-5 ${activeTab === 'mobile' ? primaryColorText : 'text-gray-600'}`} />
                  <Text className={`font-medium ${activeTab === 'mobile' ? primaryColorText : 'text-gray-600'}`}>
                    Mobile Banking
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Card Form */}
            {activeTab === 'card' && (
              <View className="space-y-4">
                <View>
                  <Text className="text-xs text-gray-500 mb-2">Card Number</Text>
                  <Input
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    placeholder="1234 5678 9012 3456"
                    keyboardType="numeric"
                    maxLength={16}
                    className="w-full"
                  />
                </View>
                
                <View>
                  <Text className="text-xs text-gray-500 mb-2">Cardholder Name</Text>
                  <Input
                    value={cardHolder}
                    onChangeText={setCardHolder}
                    placeholder="John Doe"
                    className="w-full"
                  />
                </View>
                
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 mb-2">Expiry Date</Text>
                    <Input
                      value={expiryDate}
                      onChangeText={setExpiryDate}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full"
                    />
                  </View>
                  
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 mb-2">CVV</Text>
                    <Input
                      value={cvv}
                      onChangeText={setCvv}
                      placeholder="123"
                      keyboardType="numeric"
                      maxLength={3}
                      secureTextEntry
                      className="w-full"
                    />
                  </View>
                </View>
              </View>
            )}
            
            {/* Mobile Banking Form */}
            {activeTab === 'mobile' && (
              <View className="space-y-4">
                <View>
                  <Text className="text-xs text-gray-500 mb-2">Provider</Text>
                  <View className="flex-row gap-2">
                    {['bKash', 'Nagad', 'Rocket'].map((provider) => (
                      <TouchableOpacity
                        key={provider}
                        onPress={() => setMobileProvider(provider)}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                          mobileProvider === provider
                            ? `${primaryColor.replace('bg-', 'border-')} ${primaryColorLight}`
                            : 'border-gray-200'
                        }`}
                      >
                        <Text className={`text-center font-medium ${
                          mobileProvider === provider ? primaryColorText : 'text-gray-600'
                        }`}>
                          {provider}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View>
                  <Text className="text-xs text-gray-500 mb-2">Account Number</Text>
                  <Input
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="01XXXXXXXXX"
                    keyboardType="phone-pad"
                    maxLength={11}
                    className="w-full"
                  />
                </View>
              </View>
            )}
            
            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-4">
              <Button variant="outline" onPress={handleCancel} className="flex-1 h-11">
                <View className="flex-row items-center gap-2">
                  <X className="w-4 h-4" />
                  <Text className="font-medium">Cancel</Text>
                </View>
              </Button>
              <Button onPress={handleSave} className={`flex-1 h-11 ${primaryColor}`}>
                <View className="flex-row items-center gap-2">
                  <Check className="w-4 h-4 text-white" />
                  <Text className="text-white font-medium">Add {activeTab === 'card' ? 'Card' : 'Account'}</Text>
                </View>
              </Button>
            </View>
          </View>
        )}
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
