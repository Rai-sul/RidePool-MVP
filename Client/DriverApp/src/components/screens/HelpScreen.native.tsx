import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { HelpCircle, MessageCircle, Mail, Phone, ChevronRight, Search, FileText, Car, MapPin, User, ArrowLeft, Wallet } from "lucide-react-native";
import { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface HelpScreenProps {
  onBack: () => void;
}

export function HelpScreen({ onBack }: HelpScreenProps) {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const faqCategories = [
    { title: "Getting Started", icon: Car, topics: ["How to accept ride requests", "Setting up your profile", "Completing your first ride"] },
    { title: "Earnings & Payments", icon: Wallet, topics: ["How do I get paid?", "Understanding ride fares", "Weekly payout schedule"] },
    { title: "Account & Settings", icon: User, topics: ["Updating vehicle information", "Managing notifications", "Account verification"] },
    { title: "Rides & Navigation", icon: MapPin, topics: ["Using in-app navigation", "Canceling a ride", "Multiple passenger pickups"] },
  ];

  const contactMethods = [
    { title: "Live Chat", description: "Chat with our support team", icon: MessageCircle, color: isDark ? '#064E3B' : '#D1FAE5', iconColor: colors.success, action: "chat" },
    { title: "Email Support", description: "support@ridepool.com", icon: Mail, color: isDark ? '#1E3A8A' : '#DBEAFE', iconColor: '#2563EB', action: "email" },
    { title: "Phone Support", description: "+880 1234-567890", icon: Phone, color: isDark ? '#374151' : '#FEF3C7', iconColor: colors.icon, action: "phone" },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View className="px-6 py-4 flex-row items-center border-b" style={{ borderBottomColor: colors.border }}>
        <Pressable onPress={onBack} className="mr-4">
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text className="text-xl font-bold" style={{ color: colors.text }}>Help & Support</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="px-4 py-6 gap-6 mb-20">
          <View>
            <View className="relative">
              <View className="absolute left-3 top-3 z-10">
                <Search size={20} color={colors.textSecondary} />
              </View>
              <Input placeholder="Search for help..." value={searchQuery} onChangeText={setSearchQuery} className="pl-10 h-12" style={{ backgroundColor: isDark ? '#374151' : '#F9FAFB', borderColor: colors.border, color: colors.text }} placeholderTextColor={colors.textSecondary} />
            </View>
          </View>

          <View>
            <Text className="text-lg font-semibold mb-3 px-2" style={{ color: colors.text }}>Contact Us</Text>
            <View className="gap-3">
              {contactMethods.map((method) => (
                <Card key={method.title} className="p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <Pressable onPress={() => console.log(`${method.action} pressed`)} className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: method.color }}>
                        <method.icon size={24} color={method.iconColor} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold" style={{ color: colors.text }}>{method.title}</Text>
                        <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>{method.description}</Text>
                      </View>
                    </View>
                    <ChevronRight size={20} color={colors.textSecondary} />
                  </Pressable>
                </Card>
              ))}
            </View>
          </View>

          <View>
            <Text className="text-lg font-semibold mb-3 px-2" style={{ color: colors.text }}>Frequently Asked Questions</Text>
            <View className="gap-3">
              {faqCategories.map((category) => (
                <Card key={category.title} className="p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: isDark ? '#374151' : '#FEF3C7' }}>
                      <category.icon size={20} color={colors.icon} />
                    </View>
                    <Text className="font-semibold text-base" style={{ color: colors.text }}>{category.title}</Text>
                  </View>
                  <View className="gap-2 ml-13">
                    {category.topics.map((topic) => (
                      <Pressable key={topic} onPress={() => console.log(`FAQ: ${topic}`)} className="flex-row items-center justify-between py-2">
                        <Text className="text-sm flex-1" style={{ color: colors.textSecondary }}>{topic}</Text>
                        <ChevronRight size={16} color={colors.textSecondary} />
                      </Pressable>
                    ))}
                  </View>
                </Card>
              ))}
            </View>
          </View>

          <View>
            <Text className="text-lg font-semibold mb-3 px-2" style={{ color: colors.text }}>Popular Articles</Text>
            <Card className="p-3" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              {["How to maximize your earnings", "Best practices for 5-star ratings", "Understanding passenger safety features", "Managing your driver schedule"].map((article, index) => (
                <View key={article}>
                  <Pressable onPress={() => console.log(`Article: ${article}`)} className="flex-row items-center justify-between py-3 px-2">
                    <View className="flex-row items-center gap-3 flex-1">
                      <FileText size={18} color={colors.icon} />
                      <Text className="text-sm flex-1" style={{ color: colors.text }}>{article}</Text>
                    </View>
                    <ChevronRight size={16} color={colors.textSecondary} />
                  </Pressable>
                  {index < 3 && <View className="h-px" style={{ backgroundColor: colors.border }} />}
                </View>
              ))}
            </Card>
          </View>

          <Card className="p-5 border" style={{ backgroundColor: isDark ? '#374151' : '#FEF3C7', borderColor: isDark ? '#4B5563' : '#F59E0B' }}>
            <View className="items-center gap-3">
              <HelpCircle size={32} color={colors.icon} />
              <Text className="font-semibold text-center" style={{ color: colors.text }}>Can't find what you're looking for?</Text>
              <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>Our support team is here to help you 24/7</Text>
              <Button className="w-full h-12 mt-2" style={{ backgroundColor: colors.primary }} onPress={() => console.log("Submit request pressed")}>
                <Text className="font-semibold" style={{ color: colors.primaryText }}>Submit a Request</Text>
              </Button>
            </View>
          </Card>

          <Card className="p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Text className="font-semibold mb-3" style={{ color: colors.text }}>Support Hours</Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm" style={{ color: colors.textSecondary }}>Live Chat</Text>
                <Text className="text-sm font-medium" style={{ color: colors.text }}>24/7</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm" style={{ color: colors.textSecondary }}>Phone Support</Text>
                <Text className="text-sm font-medium" style={{ color: colors.text }}>8 AM - 10 PM</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm" style={{ color: colors.textSecondary }}>Email Response</Text>
                <Text className="text-sm font-medium" style={{ color: colors.text }}>Within 24 hours</Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default HelpScreen;
