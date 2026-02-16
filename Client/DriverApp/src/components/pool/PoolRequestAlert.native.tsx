import { useEffect, useRef } from "react";
import { View, Text, Modal, Pressable, Animated, Vibration } from "react-native";
import { Button } from "../ui/button";
import { MapPin, Users, DollarSign, Navigation, X } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface PoolRequestData {
  pool_id: string;
  vehicle_type?: string;
  passengers?: number;
  estimated_earnings?: number;
  pickup_lat?: number;
  pickup_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  destination_address?: string;
  pickup_address?: string;
}

interface PoolRequestAlertProps {
  isVisible: boolean;
  poolRequest: PoolRequestData | null;
  onAccept: (poolId: string) => void;
  onDismiss: () => void;
}

export function PoolRequestAlert({
  isVisible,
  poolRequest,
  onAccept,
  onDismiss,
}: PoolRequestAlertProps) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVisible && poolRequest) {
      Vibration.vibrate([0, 400, 200, 400]);

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Auto-dismiss after 30 seconds
      const timeout = setTimeout(() => {
        onDismiss();
      }, 30000);

      return () => {
        pulse.stop();
        clearTimeout(timeout);
      };
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, poolRequest]);

  if (!isVisible || !poolRequest) return null;

  const earnings = poolRequest.estimated_earnings
    ? `৳${Math.round(poolRequest.estimated_earnings)}`
    : 'N/A';

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 justify-start pt-12 px-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
        <Animated.View
          style={{
            transform: [
              { translateY: slideAnim },
              { scale: pulseAnim },
            ],
          }}
        >
          <View
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: colors.card,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View className="px-5 py-3 flex-row items-center justify-between" style={{ backgroundColor: isDark ? '#B45309' : '#F59E0B' }}>
              <View className="flex-row items-center gap-2">
                <Navigation size={18} color="#FFFFFF" />
                <Text className="text-white font-bold text-lg">New Pool Request!</Text>
              </View>
              <Pressable onPress={onDismiss} className="p-1">
                <X size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Content */}
            <View className="px-5 py-4 gap-3">
              <View className="flex-row gap-4">
                <View className="flex-1 flex-row items-center gap-2">
                  <Users size={16} color={colors.primary} />
                  <Text style={{ color: colors.text }}>
                    <Text className="font-bold">{poolRequest.passengers || '?'}</Text> passengers
                  </Text>
                </View>
                <View className="flex-1 flex-row items-center gap-2">
                  <DollarSign size={16} color={colors.success} />
                  <Text style={{ color: colors.text }}>
                    Est. <Text className="font-bold" style={{ color: colors.success }}>{earnings}</Text>
                  </Text>
                </View>
              </View>

              {poolRequest.vehicle_type && (
                <View className="flex-row items-center gap-2">
                  <View
                    className="px-2 py-1 rounded"
                    style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                      {poolRequest.vehicle_type}
                    </Text>
                  </View>
                </View>
              )}

              {(poolRequest.pickup_address || poolRequest.destination_address) && (
                <View className="gap-2">
                  {poolRequest.pickup_address && (
                    <View className="flex-row items-center gap-2">
                      <MapPin size={14} color={colors.success} />
                      <Text className="text-sm flex-1" style={{ color: colors.textSecondary }} numberOfLines={1}>
                        Pickup: {poolRequest.pickup_address}
                      </Text>
                    </View>
                  )}
                  {poolRequest.destination_address && (
                    <View className="flex-row items-center gap-2">
                      <MapPin size={14} color={colors.error} />
                      <Text className="text-sm flex-1" style={{ color: colors.textSecondary }} numberOfLines={1}>
                        Drop: {poolRequest.destination_address}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Actions */}
            <View className="flex-row gap-3 px-5 pb-5">
              <Button
                variant="outline"
                onPress={onDismiss}
                className="flex-1 h-12"
                style={{ borderColor: colors.border }}
              >
                <Text className="font-semibold" style={{ color: colors.text }}>Dismiss</Text>
              </Button>
              <Button
                onPress={() => onAccept(poolRequest.pool_id)}
                className="flex-1 h-12"
                style={{ backgroundColor: isDark ? '#B45309' : '#D97706' }}
              >
                <Text className="font-bold text-white">Accept</Text>
              </Button>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
