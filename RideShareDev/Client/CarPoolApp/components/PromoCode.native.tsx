import React, { useState } from 'react';
import { View, Text, ScrollView, Clipboard } from 'react-native';
import { ArrowLeft, Gift, Tag, Check, Copy } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import LinearGradient from './LinearGradient';
import type { UserProfile } from '../contexts/GlobalContext'; // Assuming UserProfile is defined in GlobalContext

type PromoCodeProps = {
  onBack: () => void;
  userProfile: UserProfile | null; // Add userProfile to props
};

const availablePromos = [
  {
    id: '1',
    code: 'FIRST50',
    title: '50% OFF First Ride',
    description: 'Valid for first-time users only',
    discount: '50% off',
    expiry: 'Expires: Dec 31, 2025',
  },
  {
    id: '2',
    code: 'POOL20',
    title: '৳20 OFF Pool Rides',
    description: 'Valid on all pool rides',
    discount: '৳20 off',
    expiry: 'Expires: Nov 30, 2025',
  },
  {
    id: '3',
    code: 'WEEKEND100',
    title: 'Weekend Special',
    description: 'Valid on weekends only',
    discount: '৳100 off',
    expiry: 'Expires: Oct 31, 2025',
  },
];

export default function PromoCode({ onBack, userProfile }: PromoCodeProps) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isFemale = userProfile?.gender === 'female';
  const buttonBgColor = isFemale ? 'bg-pink-600' : 'bg-blue-600';

  const handleApply = () => {
    if (promoCode.trim()) {
      setAppliedCode(promoCode.toUpperCase());
      setPromoCode('');
    }
  };

  const handleCopy = (code: string) => {
    Clipboard.setString(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1" contentContainerStyle={{ paddingBottom: 64 }}>


      {/* Content */}
      <View className="p-6 space-y-6">
        {/* Apply Promo Code */}
        <View className="rounded-2xl p-5 space-y-4">
          <Text>Enter Promo Code</Text>
          <View className="flex flex-row gap-2">
            <Input
              placeholder="Enter code"
              value={promoCode}
              onChangeText={(text) => setPromoCode(text.toUpperCase())}
              className="h-12 flex-1"
            />
            <Button onPress={handleApply} className={`h-12 px-6 ${buttonBgColor} text-white`}>
              Apply
            </Button>
          </View>
          
          {appliedCode && (
            <View className="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-row items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <Text className="text-sm text-green-900">
                Promo code "{appliedCode}" applied successfully!
              </Text>
            </View>
          )}
        </View>

        {/* Available Promo Codes */}
        <View className="space-y-3">
          <Text>Available Offers</Text>
          
          {availablePromos.map((promo) => (
            <View
              key={promo.id}
              className="rounded-2xl p-5 space-y-3 border-2 border-dashed border-gray-200"
            >
              <View className="flex flex-row items-start justify-between">
                <View className="flex flex-row items-start gap-3 flex-1">
                  <LinearGradient
                    colors={['#8b5cf6', '#a855f7']} // Approximate colors for from-purple-500 to-pink-500
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                  >
                    <Gift className="w-6 h-6 text-white" />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text>{promo.title}</Text>
                    <Text className="text-sm text-gray-500 mt-1">{promo.description}</Text>
                    <Text className="text-xs text-gray-400 mt-2">{promo.expiry}</Text>
                  </View>
                </View>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-sm text-green-700">{promo.discount}</Text>
                </View>
              </View>

              <View className="flex flex-row items-center gap-2 pt-2 border-t border-dashed">
                <View className="flex flex-row items-center gap-2 flex-1 bg-gray-50 px-3 py-2 rounded-lg">
                  <Tag className="w-4 h-4 text-gray-600" />
                  <Text className="text-sm font-mono">{promo.code}</Text>
                </View>
                <Button
                  variant="outline"
                  size="icon"
                  onPress={() => handleCopy(promo.code)}
                >
                  {copiedCode === promo.code ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </Button>
              </View>
            </View>
          ))}
        </View>


      </View>
    </ScrollView>
  );
}