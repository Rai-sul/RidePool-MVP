import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../ui/card";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Bell, Volume2, MapPin, Navigation, Globe, Moon, Smartphone, ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { colors, isDark, toggleTheme } = useTheme();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [autoNavigation, setAutoNavigation] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const handleSave = () => {
    Alert.alert("Success", "Settings saved successfully");
    onBack();
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b" style={{ borderBottomColor: colors.border }}>
        <Pressable onPress={onBack} className="mr-4">
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text className="text-xl font-bold" style={{ color: colors.text }}>Settings</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="px-4 py-6 gap-4 mb-20">
        {/* Notifications Settings */}
        <Card className="p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <Text className="font-semibold text-lg mb-4" style={{ color: colors.text }}>Notifications</Text>
          
          <View className="space-y-4">
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <Bell size={20} color={colors.icon} />
                <View className="ml-3 flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>Push Notifications</Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>Get notified about new pools</Text>
                </View>
              </View>
              <Switch 
                checked={pushNotifications}
                onCheckedChange={(checked) => setPushNotifications(checked as boolean)}
              />
            </View>

            <Separator style={{ backgroundColor: colors.border }} />

            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <Volume2 size={20} color={colors.icon} />
                <View className="ml-3 flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>Sound Alerts</Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>Play sound for new requests</Text>
                </View>
              </View>
              <Switch 
                checked={soundAlerts}
                onCheckedChange={(checked) => setSoundAlerts(checked as boolean)}
              />
            </View>
          </View>
        </Card>

        {/* Location & Navigation Settings */}
        <Card className="p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <Text className="font-semibold text-lg mb-4" style={{ color: colors.text }}>Location & Navigation</Text>
          
          <View className="space-y-4">
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <MapPin size={20} color={colors.icon} />
                <View className="ml-3 flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>Location Tracking</Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>Allow real-time location tracking</Text>
                </View>
              </View>
              <Switch 
                checked={locationTracking}
                onCheckedChange={(checked) => setLocationTracking(checked as boolean)}
              />
            </View>

            <Separator style={{ backgroundColor: colors.border }} />

            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <Navigation size={20} color={colors.icon} />
                <View className="ml-3 flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>Auto-Start Navigation</Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>Auto launch maps on pool accept</Text>
                </View>
              </View>
              <Switch 
                checked={autoNavigation}
                onCheckedChange={(checked) => setAutoNavigation(checked as boolean)}
              />
            </View>
          </View>
        </Card>

        {/* App Settings */}
        <Card className="p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <Text className="font-semibold text-lg mb-4" style={{ color: colors.text }}>App Settings</Text>
          
          <View className="space-y-4">
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <Globe size={20} color={colors.icon} />
                <View className="ml-3 flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>Language</Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>English (US)</Text>
                </View>
              </View>
              <Button variant="ghost" size="sm">
                <Text style={{ color: colors.primary }}>Change</Text>
              </Button>
            </View>

            <Separator style={{ backgroundColor: colors.border }} />

            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <Moon size={20} color={colors.icon} />
                <View className="ml-3 flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>Dark Mode</Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>Use dark theme</Text>
                </View>
              </View>
              <Switch 
                checked={isDark}
                onCheckedChange={toggleTheme}
              />
            </View>

            <Separator style={{ backgroundColor: colors.border }} />

            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <Smartphone size={20} color={colors.icon} />
                <View className="ml-3 flex-1">
                  <Text className="font-medium" style={{ color: colors.text }}>Offline Mode</Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>Work offline with cached data</Text>
                </View>
              </View>
              <Switch 
                checked={offlineMode}
                onCheckedChange={(checked) => setOfflineMode(checked as boolean)}
              />
            </View>
          </View>
        </Card>

        {/* Save Button */}
        <Button 
          className="w-full h-12"
          style={{ backgroundColor: colors.primary }}
          onPress={handleSave}
        >
          <Text className="font-semibold" style={{ color: colors.primaryText }}>Save Settings</Text>
        </Button>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default SettingsScreen;
