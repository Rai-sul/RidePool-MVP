import { View, Text } from "react-native";
import { Card } from "../ui/card";
import { Wallet, TrendingUp, Users, Clock } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface DriverStatsProps {
  todayEarnings: number;
  totalRides: number;
  onlineTime: number;
  rating: number;
}

export function DriverStats({ todayEarnings, totalRides, onlineTime, rating }: DriverStatsProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-row flex-wrap gap-3">
      <Card className="flex-1 min-w-[45%] p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <View className="flex-row items-center gap-2 mb-2">
          <Wallet size={18} color={colors.icon} />
          <Text className="text-sm" style={{ color: colors.textSecondary }}>Today&apos;s Earnings</Text>
        </View>
        <Text className="text-2xl font-bold" style={{ color: colors.text }}>৳{todayEarnings.toLocaleString()}</Text>
      </Card>

      <Card className="flex-1 min-w-[45%] p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <View className="flex-row items-center gap-2 mb-2">
          <Users size={18} color={colors.icon} />
          <Text className="text-sm" style={{ color: colors.textSecondary }}>Total Rides</Text>
        </View>
        <Text className="text-2xl font-bold" style={{ color: colors.text }}>{totalRides}</Text>
      </Card>

      <Card className="flex-1 min-w-[45%] p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <View className="flex-row items-center gap-2 mb-2">
          <Clock size={18} color={colors.icon} />
          <Text className="text-sm" style={{ color: colors.textSecondary }}>Online Time</Text>
        </View>
        <Text className="text-2xl font-bold" style={{ color: colors.text }}>{onlineTime}h</Text>
      </Card>

      <Card className="flex-1 min-w-[45%] p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <View className="flex-row items-center gap-2 mb-2">
          <TrendingUp size={18} color={colors.icon} />
          <Text className="text-sm" style={{ color: colors.textSecondary }}>Rating</Text>
        </View>
        <Text className="text-2xl font-bold" style={{ color: colors.text }}>{rating} ★</Text>
      </Card>
    </View>
  );
}
