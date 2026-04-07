import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ArrowLeft, User, Phone, Mail, MapPin } from "lucide-react-native";
import { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface ContactInfoScreenProps {
  onBack: () => void;
  onSave: (data: ContactInfoData) => void;
}

export interface ContactInfoData {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export function ContactInfoScreen({ onBack, onSave }: ContactInfoScreenProps) {
  const { colors, isDark } = useTheme();
  const [formData, setFormData] = useState<ContactInfoData>({
    name: "Ahmed Kabir",
    phone: "+880 1712-345678",
    email: "ahmed.kabir@email.com",
    address: "Badda, Dhaka",
  });

  const handleSave = () => {
    onSave(formData);
    console.log("Contact info saved:", formData);
  };

  return (
    <SafeAreaView 
      className="flex-1" 
      style={{ backgroundColor: colors.background }}
      edges={['top', 'bottom']}
    >
      <View 
        className="px-6 py-4 flex-row items-center border-b"
        style={{ borderBottomColor: colors.border }}
      >
        <Pressable onPress={onBack} className="mr-4">
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text className="text-xl font-bold" style={{ color: colors.text }}>
          Contact Information
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          <View className="px-4 py-6 gap-6 mb-20">
            <Card 
              className="p-6"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <View className="gap-5">
                <View className="gap-2">
                  <Label style={{ color: colors.text }}>Full Name</Label>
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <User size={18} color={colors.iconSecondary} />
                    </View>
                    <Input
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChangeText={(text) => setFormData({...formData, name: text})}
                      className="pl-10 h-12"
                      style={{ 
                        backgroundColor: isDark ? '#374151' : '#F9FAFB',
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View className="gap-2">
                  <Label style={{ color: colors.text }}>Phone Number</Label>
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <Phone size={18} color={colors.iconSecondary} />
                    </View>
                    <Input
                      placeholder="+880 1712-345678"
                      value={formData.phone}
                      onChangeText={(text) => setFormData({...formData, phone: text})}
                      className="pl-10 h-12"
                      style={{ 
                        backgroundColor: isDark ? '#374151' : '#F9FAFB',
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View className="gap-2">
                  <Label style={{ color: colors.text }}>Email Address</Label>
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <Mail size={18} color={colors.iconSecondary} />
                    </View>
                    <Input
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChangeText={(text) => setFormData({...formData, email: text})}
                      className="pl-10 h-12"
                      style={{ 
                        backgroundColor: isDark ? '#374151' : '#F9FAFB',
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View className="gap-2">
                  <Label style={{ color: colors.text }}>Address</Label>
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <MapPin size={18} color={colors.iconSecondary} />
                    </View>
                    <Input
                      placeholder="Enter your address"
                      value={formData.address}
                      onChangeText={(text) => setFormData({...formData, address: text})}
                      className="pl-10 h-12"
                      style={{ 
                        backgroundColor: isDark ? '#374151' : '#F9FAFB',
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <Button 
                  className="w-full h-14 mt-4"
                  style={{ backgroundColor: colors.primary }}
                  onPress={handleSave}
                >
                  <Text className="font-bold text-base" style={{ color: colors.primaryText }}>
                    Save Changes
                  </Text>
                </Button>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ContactInfoScreen;
