import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { 
  Star, 
  Car, 
  Phone, 
  Mail,
  MapPin,
  HelpCircle,
  LogOut,
  Settings,
  ChevronRight,
  Shield,
  Edit
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useDriverStore } from "../../store/useDriverStore";

interface ProfileScreenProps {
  onNavigateToSettings?: () => void;
  onNavigateToContactInfo?: () => void;
  onNavigateToSafety?: () => void;
  onNavigateToHelp?: () => void;
  onLogout?: () => void;
}

export function ProfileScreen({ 
  onNavigateToSettings,
  onNavigateToContactInfo,
  onNavigateToSafety,
  onNavigateToHelp,
  onLogout 
}: ProfileScreenProps) {
  const { colors, isDark } = useTheme();
  const { user } = useDriverStore();

  const displayName = user?.full_name || user?.first_name || 'Driver';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const rating = user?.average_rating || 0;
  const totalRides = user?.total_rides || 0;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView className="flex-1">
        <View className="px-4 py-6 gap-4 mb-20">
          <Card className="p-6" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <View className="flex-row items-center gap-4">
              <View className="w-20 h-20 rounded-full items-center justify-center shadow-lg" style={{ backgroundColor: colors.primary }}>
                <Text className="text-3xl font-bold" style={{ color: colors.primaryText }}>{initials}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-semibold" style={{ color: colors.text }}>{displayName}</Text>
                <View className="flex-row items-center gap-2 mt-2">
                  <Star size={16} color={colors.warning} fill={colors.warning} />
                  <Text className="font-semibold" style={{ color: colors.text }}>{rating.toFixed(1)}</Text>
                  {rating >= 4.5 && (
                    <Badge variant="outline" style={{ borderColor: colors.primary }}>
                      <Text className="text-xs" style={{ color: colors.primary }}>Gold Driver</Text>
                    </Badge>
                  )}
                </View>
              </View>
            </View>
          </Card>

          <View className="flex-row gap-3">
            <Card className="flex-1 p-4 items-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <Text className="text-3xl font-bold mb-1" style={{ color: colors.text }}>{totalRides}</Text>
              <Text className="text-xs" style={{ color: colors.textSecondary }}>Total Rides</Text>
            </Card>
            <Card className="flex-1 p-4 items-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <Text className="text-3xl font-bold mb-1" style={{ color: colors.text }}>98%</Text>
              <Text className="text-xs" style={{ color: colors.textSecondary }}>Acceptance</Text>
            </Card>
            <Card className="flex-1 p-4 items-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <Text className="text-3xl font-bold mb-1" style={{ color: colors.text }}>{rating.toFixed(1)}</Text>
              <Text className="text-xs" style={{ color: colors.textSecondary }}>Rating</Text>
            </Card>
          </View>

          <Card className="p-5" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold" style={{ color: colors.text }}>Vehicle Information</Text>
              <Badge variant="outline" style={{ borderColor: colors.success }}>
                <Text className="text-xs" style={{ color: colors.success }}>Verified</Text>
              </Badge>
            </View>
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <Car size={18} color={colors.icon} />
                <Text style={{ color: colors.textSecondary }}>Vehicle details pending</Text>
              </View>
            </View>
          </Card>

          <Card className="p-5" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold" style={{ color: colors.text }}>Contact Information</Text>
              <Button 
                variant="ghost" 
                size="icon"
                onPress={onNavigateToContactInfo}
              >
                <Edit size={18} color={colors.icon} />
              </Button>
            </View>
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <Phone size={18} color={colors.icon} />
                <Text style={{ color: colors.textSecondary }}>{user?.phone || 'Not set'}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Mail size={18} color={colors.icon} />
                <Text style={{ color: colors.textSecondary }}>{user?.email || 'Not set'}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <MapPin size={18} color={colors.icon} />
                <Text style={{ color: colors.textSecondary }}>Location not set</Text>
              </View>
            </View>
          </Card>

          <Card className="p-3" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Button 
              variant="ghost" 
              className="w-full h-12 justify-start"
              onPress={onNavigateToSettings}
            >
              <View className="flex-row items-center justify-between w-full px-2">
                <View className="flex-row items-center gap-3">
                  <Settings size={20} color={colors.icon} />
                  <Text className="font-medium" style={{ color: colors.text }}>Settings</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </View>
            </Button>

            <Separator className="my-1" style={{ backgroundColor: colors.border }} />

            <Button 
              variant="ghost" 
              className="w-full h-12 justify-start"
              onPress={onNavigateToSafety}
            >
              <View className="flex-row items-center justify-between w-full px-2">
                <View className="flex-row items-center gap-3">
                  <Shield size={20} color={colors.icon} />
                  <Text className="font-medium" style={{ color: colors.text }}>Safety & Security</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </View>
            </Button>

            <Separator className="my-1" style={{ backgroundColor: colors.border }} />

            <Button 
              variant="ghost" 
              className="w-full h-12 justify-start"
              onPress={onNavigateToHelp}
            >
              <View className="flex-row items-center justify-between w-full px-2">
                <View className="flex-row items-center gap-3">
                  <HelpCircle size={20} color={colors.icon} />
                  <Text className="font-medium" style={{ color: colors.text }}>Help & Support</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </View>
            </Button>
          </Card>

          <Button
            variant="outline"
            className="w-full h-14"
            style={{ borderColor: colors.error, backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }}
            onPress={onLogout}
          >
            <View className="flex-row items-center gap-2">
              <LogOut size={20} color={colors.error} />
              <Text className="font-semibold" style={{ color: colors.error }}>Logout</Text>
            </View>
          </Button>

          <Text className="text-center text-sm pb-4" style={{ color: colors.textSecondary }}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default ProfileScreen;
