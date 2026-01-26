import { View, Text, ScrollView, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { MessageCircle, Phone, Mail, FileText, HelpCircle, BookOpen, Video, ExternalLink } from "lucide-react-native";

interface HelpSupportScreenProps {
  onBack: () => void;
}

export function HelpSupportScreen({ onBack }: HelpSupportScreenProps) {
  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleEmail = () => {
    Linking.openURL("mailto:support@ridepool.com");
  };

  const handleWhatsApp = () => {
    Linking.openURL("https://wa.me/8801712345678");
  };

  const handleFAQ = (question: string) => {
    Alert.alert("Success", `Opening: ${question}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <ScrollView className="flex-1">
        <View className="p-4 pb-20 mb-4">{/* Contact Support */}
        <Card className="p-4 mb-4">
          <Text className="font-semibold text-lg mb-4">Contact Support</Text>
          
          <View className="space-y-3">
            <Button 
              className="w-full bg-green-600"
              onPress={handleWhatsApp}
            >
              <View className="flex-row items-center">
                <MessageCircle size={18} color="#FFFFFF" />
                <Text className="text-white ml-2">Chat on WhatsApp</Text>
              </View>
            </Button>

            <Button 
              className="w-full bg-blue-600"
              onPress={() => handleCall("16333")}
            >
              <View className="flex-row items-center">
                <Phone size={18} color="#FFFFFF" />
                <Text className="text-white ml-2">Call Support (16333)</Text>
              </View>
            </Button>

            <Button 
              variant="outline"
              className="w-full"
              onPress={handleEmail}
            >
              <View className="flex-row items-center">
                <Mail size={18} color="#6B7280" />
                <Text className="ml-2">Email Support</Text>
              </View>
            </Button>
          </View>
        </Card>

        {/* Quick Help */}
        <Card className="p-4 mb-4">
          <Text className="font-semibold text-lg mb-4">Quick Help</Text>
          
          <View className="space-y-3">
            <Button 
              variant="outline"
              className="w-full justify-start"
              onPress={() => Alert.alert("Success", "Opening tutorial videos")}
            >
              <View className="flex-row items-center flex-1">
                <Video size={18} color="#6B7280" />
                <Text className="ml-3 flex-1">Tutorial Videos</Text>
                <ExternalLink size={16} color="#9CA3AF" />
              </View>
            </Button>

            <Button 
              variant="outline"
              className="w-full justify-start"
              onPress={() => Alert.alert("Success", "Opening driver guide")}
            >
              <View className="flex-row items-center flex-1">
                <BookOpen size={18} color="#6B7280" />
                <Text className="ml-3 flex-1">Driver Guide</Text>
                <ExternalLink size={16} color="#9CA3AF" />
              </View>
            </Button>

            <Button 
              variant="outline"
              className="w-full justify-start"
              onPress={() => Alert.alert("Success", "Opening FAQ")}
            >
              <View className="flex-row items-center flex-1">
                <HelpCircle size={18} color="#6B7280" />
                <Text className="ml-3 flex-1">Frequently Asked Questions</Text>
                <ExternalLink size={16} color="#9CA3AF" />
              </View>
            </Button>

            <Button 
              variant="outline"
              className="w-full justify-start"
              onPress={() => Alert.alert("Success", "Opening community forum")}
            >
              <View className="flex-row items-center flex-1">
                <MessageCircle size={18} color="#6B7280" />
                <Text className="ml-3 flex-1">Community Forum</Text>
                <ExternalLink size={16} color="#9CA3AF" />
              </View>
            </Button>
          </View>
        </Card>

        {/* Popular FAQs */}
        <Card className="p-4 mb-4">
          <Text className="font-semibold text-lg mb-4">Popular Questions</Text>
          
          <View className="space-y-3">
            <View>
              <Button 
                variant="ghost"
                className="w-full justify-start p-0 h-auto"
                onPress={() => handleFAQ("How do I accept a pool?")}
              >
                <Text className="font-medium text-left">How do I accept a pool?</Text>
              </Button>
              <Text className="text-sm text-gray-600 mt-1">
                Tap on any available pool card to view details, then click "Accept Pool" to start the ride.
              </Text>
            </View>

            <Separator />

            <View>
              <Button 
                variant="ghost"
                className="w-full justify-start p-0 h-auto"
                onPress={() => handleFAQ("When do I get paid?")}
              >
                <Text className="font-medium text-left">When do I get paid?</Text>
              </Button>
              <Text className="text-sm text-gray-600 mt-1">
                Earnings are transferred to your bank account every Tuesday and Friday.
              </Text>
            </View>

            <Separator />

            <View>
              <Button 
                variant="ghost"
                className="w-full justify-start p-0 h-auto"
                onPress={() => handleFAQ("How to set priority location?")}
              >
                <Text className="font-medium text-left">How to set priority location?</Text>
              </Button>
              <Text className="text-sm text-gray-600 mt-1">
                Click "Set Priority" button on home screen and enter your preferred destination.
              </Text>
            </View>

            <Separator />

            <View>
              <Button 
                variant="ghost"
                className="w-full justify-start p-0 h-auto"
                onPress={() => handleFAQ("What if passenger cancels?")}
              >
                <Text className="font-medium text-left">What if a passenger cancels?</Text>
              </Button>
              <Text className="text-sm text-gray-600 mt-1">
                You'll receive cancellation fee if passenger cancels after 5 minutes of acceptance.
              </Text>
            </View>

            <Separator />

            <View>
              <Button 
                variant="ghost"
                className="w-full justify-start p-0 h-auto"
                onPress={() => handleFAQ("How ratings work?")}
              >
                <Text className="font-medium text-left">How do ratings work?</Text>
              </Button>
              <Text className="text-sm text-gray-600 mt-1">
                Passengers rate you after each trip. Maintain 4.5+ rating for better pool offers.
              </Text>
            </View>
          </View>
        </Card>

        {/* Submit Ticket */}
        <Card className="p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <FileText size={20} color="#6B7280" />
            <Text className="font-semibold text-lg ml-2">Can't find your answer?</Text>
          </View>
          
          <Text className="text-sm text-gray-600 mb-4">
            Submit a support ticket and our team will get back to you within 24 hours.
          </Text>

          <Button 
            className="w-full bg-blue-600"
            onPress={() => Alert.alert("Success", "Support ticket form opened")}
          >
            <View className="flex-row items-center">
              <FileText size={18} color="#FFFFFF" />
              <Text className="text-white ml-2">Submit Support Ticket</Text>
            </View>
          </Button>
        </Card>

        {/* Operating Hours */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <Text className="font-semibold mb-2">🕐 Support Operating Hours</Text>
          <Text className="text-sm text-gray-700">Monday - Friday: 9:00 AM - 9:00 PM</Text>
          <Text className="text-sm text-gray-700">Saturday - Sunday: 10:00 AM - 6:00 PM</Text>
          <Text className="text-sm text-gray-700 mt-2">Emergency support available 24/7</Text>
        </Card>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default HelpSupportScreen;
