import { View, Text, ScrollView, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Shield, Phone, AlertTriangle, Camera, MapPin, FileText, Users, Lock } from "lucide-react-native";

interface SafetySecurityScreenProps {
  onBack: () => void;
}

export function SafetySecurityScreen({ onBack }: SafetySecurityScreenProps) {
  const handleEmergencyCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleShareLocation = () => {
    Alert.alert("Success", "Live location shared with emergency contacts");
  };

  const handleReportIncident = () => {
    Alert.alert("Success", "Incident report submitted to support team");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <ScrollView className="flex-1">
        <View className="p-4 pb-20 mb-4">{/* Emergency Contacts */}
        <Card className="p-4 mb-4 bg-red-50 border-red-200">
          <View className="flex-row items-center mb-3">
            <Shield size={24} color="#DC2626" />
            <Text className="font-semibold text-lg ml-2">Emergency Contacts</Text>
          </View>
          
          <View className="space-y-3">
            <Button 
              className="w-full bg-red-600"
              onPress={() => handleEmergencyCall("999")}
            >
              <View className="flex-row items-center">
                <Phone size={18} color="#FFFFFF" />
                <Text className="text-white ml-2 font-semibold">Call Emergency Services (999)</Text>
              </View>
            </Button>

            <Button 
              className="w-full bg-red-500"
              onPress={() => handleEmergencyCall("16333")}
            >
              <View className="flex-row items-center">
                <Phone size={18} color="#FFFFFF" />
                <Text className="text-white ml-2 font-semibold">Call RidePool Safety (16333)</Text>
              </View>
            </Button>

            <Button 
              variant="outline"
              className="w-full border-red-300"
              onPress={handleShareLocation}
            >
              <View className="flex-row items-center">
                <MapPin size={18} color="#DC2626" />
                <Text className="text-red-600 ml-2 font-semibold">Share Live Location</Text>
              </View>
            </Button>
          </View>
        </Card>

        {/* Safety Features */}
        <Card className="p-4 mb-4">
          <Text className="font-semibold text-lg mb-4">Safety Features</Text>
          
          <View className="space-y-4">
            <View className="flex-row items-start py-2">
              <Camera size={20} color="#6B7280" className="mt-0.5" />
              <View className="ml-3 flex-1">
                <Text className="font-medium">Trip Recording</Text>
                <Text className="text-sm text-gray-600 mt-1">
                  All trips are automatically recorded with GPS tracking for your safety
                </Text>
              </View>
            </View>

            <Separator />

            <View className="flex-row items-start py-2">
              <Users size={20} color="#6B7280" className="mt-0.5" />
              <View className="ml-3 flex-1">
                <Text className="font-medium">Passenger Verification</Text>
                <Text className="text-sm text-gray-600 mt-1">
                  All passengers are verified with phone number and profile photos
                </Text>
              </View>
            </View>

            <Separator />

            <View className="flex-row items-start py-2">
              <Shield size={20} color="#6B7280" className="mt-0.5" />
              <View className="ml-3 flex-1">
                <Text className="font-medium">24/7 Support</Text>
                <Text className="text-sm text-gray-600 mt-1">
                  Round-the-clock safety support team available for any concerns
                </Text>
              </View>
            </View>

            <Separator />

            <View className="flex-row items-start py-2">
              <Lock size={20} color="#6B7280" className="mt-0.5" />
              <View className="ml-3 flex-1">
                <Text className="font-medium">Secure Payments</Text>
                <Text className="text-sm text-gray-600 mt-1">
                  All transactions are secured and encrypted for your protection
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Report Incident */}
        <Card className="p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <AlertTriangle size={20} color="#F59E0B" />
            <Text className="font-semibold text-lg ml-2">Report an Incident</Text>
          </View>
          
          <Text className="text-sm text-gray-600 mb-4">
            If you experienced any safety concern during a ride, please report it immediately.
          </Text>

          <Button 
            variant="outline"
            className="w-full border-orange-300"
            onPress={handleReportIncident}
          >
            <View className="flex-row items-center">
              <FileText size={18} color="#F59E0B" />
              <Text className="text-orange-600 ml-2">Submit Incident Report</Text>
            </View>
          </Button>
        </Card>

        {/* Safety Tips */}
        <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
          <Text className="font-semibold mb-3">🛡️ Safety Tips for Drivers</Text>
          <View className="space-y-2">
            <Text className="text-sm text-gray-700">• Always verify passenger identity before starting trip</Text>
            <Text className="text-sm text-gray-700">• Keep your doors locked until passenger verification</Text>
            <Text className="text-sm text-gray-700">• Don't accept cash payments outside the app</Text>
            <Text className="text-sm text-gray-700">• Trust your instincts - cancel if you feel unsafe</Text>
            <Text className="text-sm text-gray-700">• Keep emergency numbers saved in quick dial</Text>
            <Text className="text-sm text-gray-700">• Report suspicious behavior immediately</Text>
            <Text className="text-sm text-gray-700">• Share your trip details with family/friends</Text>
          </View>
        </Card>

        {/* COVID-19 Safety */}
        <Card className="p-4">
          <Text className="font-semibold mb-3">😷 COVID-19 Safety Guidelines</Text>
          <View className="space-y-2">
            <Text className="text-sm text-gray-700">• Sanitize your vehicle before and after each trip</Text>
            <Text className="text-sm text-gray-700">• Wear mask at all times during rides</Text>
            <Text className="text-sm text-gray-700">• Keep windows slightly open for ventilation</Text>
            <Text className="text-sm text-gray-700">• Maintain hand sanitizer in your vehicle</Text>
            <Text className="text-sm text-gray-700">• Limit physical contact with passengers</Text>
          </View>
        </Card>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default SafetySecurityScreen;
