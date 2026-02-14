import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Shield, Phone, AlertTriangle, Users, FileText, CheckCircle, ArrowLeft } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface SafetyScreenProps {
  onBack: () => void;
}

export function SafetyScreen({ onBack }: SafetyScreenProps) {
  const { colors, isDark } = useTheme();
  const emergencyContacts = [
    { name: "Police", number: "999", icon: Shield },
    { name: "Ambulance", number: "199", icon: Phone },
    { name: "Fire Service", number: "16163", icon: AlertTriangle },
  ];

  const safetyFeatures = [
    {
      title: "Live Trip Tracking",
      description: "Share your live location with trusted contacts during rides",
      icon: Users,
    },
    {
      title: "Verified Passengers",
      description: "All passengers go through identity verification",
      icon: CheckCircle,
    },
    {
      title: "24/7 Support",
      description: "Round-the-clock safety support team available",
      icon: Phone,
    },
    {
      title: "Insurance Coverage",
      description: "Comprehensive insurance for every ride",
      icon: Shield,
    },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b" style={{ borderBottomColor: colors.border }}>
        <Pressable onPress={onBack} className="mr-4">
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text className="text-xl font-bold" style={{ color: colors.text }}>Safety & Security</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="px-4 py-6 gap-6 mb-20">
          {/* Emergency Contacts */}
          <View>
            <View className="flex-row items-center gap-2 mb-3 px-2">
              <AlertTriangle size={20} color={colors.error} />
              <Text className="text-lg font-semibold" style={{ color: colors.text }}>Emergency Contacts</Text>
            </View>
            <Card className="p-4 border" style={{ backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', borderColor: isDark ? '#991B1B' : '#FCA5A5' }}>
              <View className="gap-3">
                {emergencyContacts.map((contact, index) => (
                  <View key={contact.number}>
                    <Pressable
                      onPress={() => console.log(`Calling ${contact.name}: ${contact.number}`)}
                      className="flex-row items-center justify-between py-2"
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: isDark ? '#991B1B' : '#FEE2E2' }}>
                          <contact.icon size={20} color={colors.error} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold" style={{ color: colors.text }}>{contact.name}</Text>
                          <Text className="text-sm" style={{ color: colors.textSecondary }}>{contact.number}</Text>
                        </View>
                      </View>
                      <Button className="h-10 px-4" style={{ backgroundColor: colors.error }}>
                        <Text className="text-white font-semibold">Call</Text>
                      </Button>
                    </Pressable>
                    {index < emergencyContacts.length - 1 && (
                      <View className="h-px my-1" style={{ backgroundColor: isDark ? '#991B1B' : '#FCA5A5' }} />
                    )}
                  </View>
                ))}
              </View>
            </Card>
          </View>

          {/* RidePool Safety Support */}
          <View>
            <Text className="text-lg font-semibold mb-3 px-2" style={{ color: colors.text }}>RidePool Safety Support</Text>
            <Card className="p-5 border" style={{ backgroundColor: isDark ? '#374151' : '#FEF3C7', borderColor: isDark ? '#4B5563' : '#F59E0B' }}>
              <View className="items-center gap-3 mb-4">
                <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary }}>
                  <Shield size={32} color={colors.primaryText} />
                </View>
                <Text className="text-lg font-bold" style={{ color: colors.text }}>24/7 Safety Team</Text>
                <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
                  Our dedicated safety team is available round the clock to assist you
                </Text>
              </View>
              <Button 
                className="w-full h-12"
                style={{ backgroundColor: colors.primary }}
                onPress={() => console.log("Contact safety team")}
              >
                <Text className="font-semibold" style={{ color: colors.primaryText }}>Contact Safety Team</Text>
              </Button>
            </Card>
          </View>

          {/* Safety Features */}
          <View>
            <Text className="text-lg font-semibold mb-3 px-2" style={{ color: colors.text }}>Safety Features</Text>
            <Card className="p-3" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              {safetyFeatures.map((feature, index) => (
                <View key={feature.title}>
                  <View className="flex-row items-start gap-3 py-4 px-2">
                    <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: isDark ? '#374151' : '#FEF3C7' }}>
                      <feature.icon size={24} color={colors.icon} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold mb-1" style={{ color: colors.text }}>{feature.title}</Text>
                      <Text className="text-sm" style={{ color: colors.textSecondary }}>{feature.description}</Text>
                    </View>
                  </View>
                  {index < safetyFeatures.length - 1 && (
                    <View className="h-px" style={{ backgroundColor: colors.border }} />
                  )}
                </View>
              ))}
            </Card>
          </View>

          {/* Safety Guidelines */}
          <View>
            <Text className="text-lg font-semibold mb-3 px-2" style={{ color: colors.text }}>Safety Guidelines</Text>
            <Card className="p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <View className="gap-3">
                <View className="flex-row items-start gap-3">
                  <View className="w-6 h-6 rounded-full items-center justify-center mt-1" style={{ backgroundColor: colors.primary }}>
                    <Text className="text-xs font-bold" style={{ color: colors.primaryText }}>1</Text>
                  </View>
                  <Text className="flex-1 text-sm" style={{ color: colors.text }}>
                    Always verify passenger identity before starting the ride
                  </Text>
                </View>
                <View className="flex-row items-start gap-3">
                  <View className="w-6 h-6 rounded-full items-center justify-center mt-1" style={{ backgroundColor: colors.primary }}>
                    <Text className="text-xs font-bold" style={{ color: colors.primaryText }}>2</Text>
                  </View>
                  <Text className="flex-1 text-sm" style={{ color: colors.text }}>
                    Keep your car doors locked until you verify the passenger
                  </Text>
                </View>
                <View className="flex-row items-start gap-3">
                  <View className="w-6 h-6 rounded-full items-center justify-center mt-1" style={{ backgroundColor: colors.primary }}>
                    <Text className="text-xs font-bold" style={{ color: colors.primaryText }}>3</Text>
                  </View>
                  <Text className="flex-1 text-sm" style={{ color: colors.text }}>
                    Trust your instincts - cancel if you feel uncomfortable
                  </Text>
                </View>
                <View className="flex-row items-start gap-3">
                  <View className="w-6 h-6 rounded-full items-center justify-center mt-1" style={{ backgroundColor: colors.primary }}>
                    <Text className="text-xs font-bold" style={{ color: colors.primaryText }}>4</Text>
                  </View>
                  <Text className="flex-1 text-sm" style={{ color: colors.text }}>
                    Report any suspicious behavior immediately
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          {/* Report Issue */}
          <Button 
            variant="outline" 
            className="w-full h-12"
            style={{ borderColor: colors.error, backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }}
            onPress={() => console.log("Report safety issue")}
          >
            <View className="flex-row items-center gap-2">
              <FileText size={20} color={colors.error} />
              <Text className="font-semibold" style={{ color: colors.error }}>Report Safety Issue</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default SafetyScreen;
