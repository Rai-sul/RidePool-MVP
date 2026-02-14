import { View, Text } from "react-native";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Gift, TrendingUp, Zap, Trophy } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: 'bonus' | 'incentive' | 'challenge';
  icon: 'gift' | 'trending' | 'zap' | 'trophy';
  reward: string;
  progress?: number;
  target?: number;
}

const mockPromotions: Promotion[] = [
  {
    id: "1",
    title: "Complete 5 More Rides",
    description: "Get ৳200 bonus today",
    type: "challenge",
    icon: "trophy",
    reward: "৳200",
    progress: 7,
    target: 12
  },
  {
    id: "2",
    title: "Peak Hour Bonus",
    description: "1.5x earnings until 7 PM",
    type: "incentive",
    icon: "zap",
    reward: "1.5x"
  },
  {
    id: "3",
    title: "Weekend Special",
    description: "Extra ৳500 for 20 rides this weekend",
    type: "bonus",
    icon: "gift",
    reward: "৳500"
  }
];

export function PromotionsBanner() {
  const { colors, isDark } = useTheme();
  const activePromotion = mockPromotions[0];

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'gift': return <Gift size={20} color={colors.primaryText} />;
      case 'trending': return <TrendingUp size={20} color={colors.primaryText} />;
      case 'zap': return <Zap size={20} color={colors.primaryText} />;
      case 'trophy': return <Trophy size={20} color={colors.primaryText} />;
      default: return <Gift size={20} color={colors.primaryText} />;
    }
  };

  return (
    <View className="gap-4">
      {/* Main Active Promotion */}
      <Card className="p-5" style={{ backgroundColor: colors.primary }}>
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            {getIcon(activePromotion.icon)}
            <Badge className="border-0 px-3 py-1" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}>
              <Text className="font-semibold" style={{ color: colors.primaryText }}>{activePromotion.type.toUpperCase()}</Text>
            </Badge>
          </View>
          <Text className="text-2xl font-bold" style={{ color: colors.primaryText }}>{activePromotion.reward}</Text>
        </View>
        <Text className="text-lg font-semibold mb-2" style={{ color: colors.primaryText }}>{activePromotion.title}</Text>
        <Text className="text-sm opacity-90" style={{ color: colors.primaryText }}>{activePromotion.description}</Text>
        
        {/* Progress bar if available */}
        {activePromotion.progress && activePromotion.target && (
          <View className="mt-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs" style={{ color: colors.primaryText }}>{activePromotion.progress} rides completed</Text>
              <Text className="text-xs" style={{ color: colors.primaryText }}>{activePromotion.target - activePromotion.progress} more to go!</Text>
            </View>
            <View className="w-full rounded-full h-2" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}>
              <View 
                className="rounded-full h-2"
                style={{ backgroundColor: colors.primaryText, width: `${(activePromotion.progress / activePromotion.target) * 100}%` }}
              />
            </View>
          </View>
        )}
      </Card>

      {/* Other Promotions - Compact */}
      <View className="flex-row gap-3">
        {mockPromotions.slice(1).map((promo) => (
          <Card key={promo.id} className="flex-1 p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <View className="flex-row items-center gap-2 mb-3">
              {getIcon(promo.icon)}
              <Text className="text-lg font-bold" style={{ color: colors.primary }}>{promo.reward}</Text>
            </View>
            <Text className="text-sm font-semibold mb-1" style={{ color: colors.text }}>{promo.title}</Text>
            <Text className="text-xs" style={{ color: colors.textSecondary }}>{promo.description}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}
