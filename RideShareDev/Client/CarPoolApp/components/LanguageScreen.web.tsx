import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native-web';
import { ArrowLeft, Check } from './Icons';
import { Button } from './ui/button';

type LanguageScreenProps = {
  onBack: () => void;
};

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

export default function LanguageScreen({ onBack }: LanguageScreenProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">
      {/* Header */}
      <View className="bg-white border-b p-4 flex flex-row items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Text className="text-xl">Language</Text>
      </View>

      {/* Content */}
      <View className="p-6 space-y-4">
        <View className="bg-white rounded-2xl overflow-hidden">
          {languages.map((language) => (
            <TouchableOpacity
              key={language.code}
              onPress={() => setSelectedLanguage(language.code)}
              className="flex flex-row items-center justify-between p-4 border-b last:border-b-0"
            >
              <View>
                <Text>{language.name}</Text>
                <Text className="text-sm text-gray-500">{language.nativeName}</Text>
              </View>
              {selectedLanguage === language.code && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Text className="text-sm text-blue-900">
            The app will restart to apply the new language setting.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
