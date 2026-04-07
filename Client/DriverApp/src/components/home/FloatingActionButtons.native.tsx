import { View, Text } from "react-native";
import { Button } from "../ui/button";
import { MapPin, Gift, Navigation } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface FloatingActionButtonsProps {
  priorityLocation: string | null;
  searchZoneAddress: string | null;
  onPriorityPress: () => void;
  onSearchZonePress: () => void;
  onPromotionsPress: () => void;
}

export function FloatingActionButtons({
  priorityLocation,
  searchZoneAddress,
  onPriorityPress,
  onSearchZonePress,
  onPromotionsPress,
}: FloatingActionButtonsProps) {
  const { colors } = useTheme();

  return (
    <View className="absolute top-4 left-4 z-10 space-y-2">
      <Button
        size="sm"
        variant="default"
        className="shadow-lg"
        style={{ backgroundColor: colors.card }}
        onPress={onPriorityPress}
      >
        <View className="flex-row items-center">
          <MapPin size={16} color={colors.icon} />
          <Text className="ml-2" style={{ color: colors.text }}>
            {priorityLocation || "Set Priority"}
          </Text>
        </View>
      </Button>
      <Button
        size="sm"
        variant="default"
        className="shadow-lg w-full"
        style={{ backgroundColor: searchZoneAddress ? '#059669' : colors.card }}
        onPress={onSearchZonePress}
      >
        <View className="flex-row items-center">
          <Navigation size={16} color={searchZoneAddress ? '#FFFFFF' : colors.icon} />
          <Text className="ml-2" style={{ color: searchZoneAddress ? '#FFFFFF' : colors.text }}>
            {searchZoneAddress || "Set Route"}
          </Text>
        </View>
      </Button>
      <Button
        size="sm"
        variant="default"
        className="shadow-lg w-full"
        style={{ backgroundColor: colors.primary }}
        onPress={onPromotionsPress}
      >
        <View className="flex-row items-center">
          <Gift size={16} color={colors.primaryText} />
          <Text className="ml-2" style={{ color: colors.primaryText }}>Offers</Text>
        </View>
      </Button>
    </View>
  );
}
