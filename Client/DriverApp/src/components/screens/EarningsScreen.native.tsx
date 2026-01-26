import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { DriverStats } from "../driver/DriverStats.native";
import { TrendingUp, Download } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { driverService } from "../../services/driver.service";
import { useDriverStore } from "../../store/useDriverStore";
import type { EarningEntry } from "../../types";

export function EarningsScreen() {
  const { colors, isDark } = useTheme();
  const { todayEarnings, todayRides, setTodayEarnings, setTodayRides, earningsHistory, setEarningsHistory } = useDriverStore();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEarnings = useCallback(async () => {
    try {
      setIsLoading(true);
      const [todayResponse, historyResponse] = await Promise.all([
        driverService.getEarningsToday(),
        driverService.getEarningsHistory(),
      ]);

      if (todayResponse.success && todayResponse.data) {
        setTodayEarnings(todayResponse.data.total);
        setTodayRides(todayResponse.data.trips);
      }

      if (historyResponse.success && historyResponse.data) {
        setEarningsHistory(historyResponse.data as EarningEntry[]);
      }
    } catch {
      // Silent fail - will show cached data
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [setTodayEarnings, setTodayRides, setEarningsHistory]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEarnings();
  }, [fetchEarnings]);

  const weekEarnings = earningsHistory.reduce((sum, e) => sum + e.amount, 0);
  const todayEarningsList = earningsHistory.filter(e => {
    const today = new Date().toISOString().split('T')[0];
    return e.date === today;
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 py-6 gap-6 mb-20">
          <DriverStats
            todayEarnings={todayEarnings}
            totalRides={todayRides}
            onlineTime={6}
            rating={4.8}
          />

          <View>
            <View className="flex-row items-center justify-between mb-3 px-2">
              <Text className="text-lg font-semibold" style={{ color: colors.text }}>Today's Rides</Text>
              <Button
                variant="outline"
                className="h-9 px-3"
                style={{ borderColor: colors.border, backgroundColor: colors.card }}
                onPress={() => {}}
              >
                <View className="flex-row items-center gap-2">
                  <Download size={16} color={colors.icon} />
                  <Text className="text-sm" style={{ color: colors.text }}>Export</Text>
                </View>
              </Button>
            </View>

            <View className="gap-3">
              {todayEarningsList.length === 0 && !isLoading && (
                <Card className="p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                    No rides completed today
                  </Text>
                </Card>
              )}
              {todayEarningsList.map((earning) => (
                <Card key={earning.id} className="p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="font-semibold mb-1" style={{ color: colors.text }}>{earning.time}</Text>
                      <View className="flex-row gap-4 mt-1">
                        <Text className="text-sm" style={{ color: colors.textSecondary }}>
                          {earning.passengers} passenger{earning.passengers > 1 ? 's' : ''}
                        </Text>
                        <Text className="text-sm" style={{ color: colors.textSecondary }}>
                          {earning.distance} km
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                      ৳{earning.amount}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>

          <Card className="p-6 border" style={{ backgroundColor: isDark ? '#374151' : '#FEF3C7', borderColor: isDark ? '#4B5563' : '#F59E0B' }}>
            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary }}>
                <TrendingUp size={24} color={colors.primaryText} />
              </View>
              <View className="flex-1">
                <Text className="text-sm" style={{ color: colors.textSecondary }}>Weekly Earnings</Text>
                <Text className="text-2xl font-bold" style={{ color: colors.text }}>৳{weekEarnings.toLocaleString()}</Text>
              </View>
            </View>
            <Button
              className="w-full h-12"
              style={{ backgroundColor: colors.primary }}
              onPress={() => {}}
            >
              <Text className="font-semibold" style={{ color: colors.primaryText }}>Request Payout</Text>
            </Button>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default EarningsScreen;
