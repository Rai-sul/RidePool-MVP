import { View, Text } from "react-native";
import { Button } from "../ui/button";
import { Home, DollarSign, User } from "lucide-react-native";

interface BottomNavigationProps {
  currentScreen: 'home' | 'earnings' | 'profile';
  onNavigate: (screen: 'home' | 'earnings' | 'profile') => void;
}

export function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  return (
    <View className="bg-white border-t shadow-lg">
      <View className="max-w-2xl mx-auto">
        <View className="flex-row gap-1 p-2">
          <Button
            variant={currentScreen === 'home' ? 'default' : 'ghost'}
            className="flex-1 h-16"
            onPress={() => onNavigate('home')}
          >
            <View className="items-center gap-1">
              <Home size={20} color={currentScreen === 'home' ? "#FFFFFF" : "#6B7280"} />
              <Text className={`text-xs ${currentScreen === 'home' ? 'text-white' : ''}`}>
                Home
              </Text>
            </View>
          </Button>
          <Button
            variant={currentScreen === 'earnings' ? 'default' : 'ghost'}
            className="flex-1 h-16"
            onPress={() => onNavigate('earnings')}
          >
            <View className="items-center gap-1">
              <DollarSign size={20} color={currentScreen === 'earnings' ? "#FFFFFF" : "#6B7280"} />
              <Text className={`text-xs ${currentScreen === 'earnings' ? 'text-white' : ''}`}>
                Earnings
              </Text>
            </View>
          </Button>
          <Button
            variant={currentScreen === 'profile' ? 'default' : 'ghost'}
            className="flex-1 h-16"
            onPress={() => onNavigate('profile')}
          >
            <View className="items-center gap-1">
              <User size={20} color={currentScreen === 'profile' ? "#FFFFFF" : "#6B7280"} />
              <Text className={`text-xs ${currentScreen === 'profile' ? 'text-white' : ''}`}>
                Profile
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </View>
  );
}
