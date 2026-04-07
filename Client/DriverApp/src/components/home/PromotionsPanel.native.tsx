import { View, Text } from "react-native";
import { Button } from "../ui/button";
import { PromotionsBanner } from "../driver/PromotionsBanner.native";
import { useTheme } from "../../contexts/ThemeContext";

interface PromotionsPanelProps {
  onClose: () => void;
}

export function PromotionsPanel({ onClose }: PromotionsPanelProps) {
  const { colors } = useTheme();

  return (
    <View className="absolute left-0 right-0 top-20 z-10 mx-4">
      <View className="rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: colors.card }}>
        <View className="p-5 pt-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold" style={{ color: colors.text }}>Active Offers</Text>
            <Button size="sm" variant="ghost" onPress={onClose} className="h-8">
              <Text className="font-medium" style={{ color: colors.text }}>Close</Text>
            </Button>
          </View>
          <PromotionsBanner />
        </View>
      </View>
    </View>
  );
}
