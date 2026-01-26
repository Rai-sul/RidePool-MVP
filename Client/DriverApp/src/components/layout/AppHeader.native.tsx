import { View, Text } from "react-native";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Power, ArrowLeft } from "lucide-react-native";

interface AppHeaderProps {
  currentScreen: 'home' | 'earnings' | 'profile' | 'settings' | 'contactInfo' | 'safety' | 'help';
  isOnline: boolean;
  onToggleOnline: () => void;
  onBack?: () => void;
  showNavigationMode?: boolean;
  hasActiveRide?: boolean;
}

export function AppHeader({ 
  currentScreen, 
  isOnline, 
  onToggleOnline, 
  onBack,
  showNavigationMode = false,
  hasActiveRide = false 
}: AppHeaderProps) {
  return (
    <View className="bg-white border-b shadow-sm">
      <View className="max-w-2xl mx-auto flex-row items-center justify-between px-4 h-16">
        {currentScreen === 'home' && !hasActiveRide ? (
          <>
            <Text className="text-xl font-semibold">Driver</Text>
            <Button 
              variant={isOnline ? "default" : "outline"}
              size="sm"
              className={isOnline ? "bg-green-600" : ""}
              onPress={onToggleOnline}
            >
              <View className="flex-row items-center">
                <Power size={16} color={isOnline ? "#FFFFFF" : "#6B7280"} />
                <Text className={isOnline ? "text-white ml-2" : "ml-2"}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </Button>
          </>
        ) : currentScreen === 'home' && hasActiveRide ? (
          <>
            <View className="flex-row items-center gap-3">
              {onBack && (
                <Button variant="ghost" size="icon" onPress={onBack}>
                  <ArrowLeft size={20} color="#374151" />
                </Button>
              )}
              <Text className="text-xl font-semibold">
                {showNavigationMode ? 'Navigation' : 'Active Ride'}
              </Text>
            </View>
            {!showNavigationMode && (
              <Badge className="bg-green-600">
                <Text className="text-white">In Progress</Text>
              </Badge>
            )}
          </>
        ) : (
          <View className="flex-row items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="icon" onPress={onBack}>
                <ArrowLeft size={20} color="#374151" />
              </Button>
            )}
            <Text className="text-xl font-semibold">
              {currentScreen === 'earnings' && 'Earnings'}
              {currentScreen === 'profile' && 'Profile'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
