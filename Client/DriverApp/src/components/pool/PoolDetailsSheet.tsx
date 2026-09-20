import { View, Text, Modal, ScrollView, Pressable, Animated, PanResponder } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Users, ChevronDown, ChevronUp, X, Navigation, Clock, DollarSign } from "lucide-react-native";
import { useState, useRef } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import type { Pool } from "../../types";

interface PoolDetailsSheetProps {
  pool: Pool | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (poolId: string) => void;
}

export function PoolDetailsSheet({ pool, isOpen, onClose, onAccept }: PoolDetailsSheetProps) {
  const { colors, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          if (isExpanded) {
            setIsExpanded(false);
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          } else {
            onClose();
          }
        } else if (gestureState.dy < -50) {
          if (!isExpanded) setIsExpanded(true);
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!pool || !isOpen) return null;

  const passengers = pool.passengers || [];
  const nearestKm = pool.nearest_pickup_km;
  const estimatedMin = pool.estimated_arrival_minutes || 0;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        onPress={onClose}
      >
        <Animated.View
          className="absolute bottom-0 left-0 right-0"
          style={{ transform: [{ translateY }] }}
        >
          <Pressable 
            className="rounded-t-3xl"
            style={{ 
              backgroundColor: colors.background,
              maxHeight: isExpanded ? '90%' : undefined,
            }}
            onPress={(e) => e.stopPropagation()}
          >
          {!isExpanded ? (
            /* Collapsed View */
            <SafeAreaView edges={['bottom']}>
              <View {...panResponder.panHandlers}>
                <View className="w-12 h-1 rounded-full mx-auto mt-3 mb-5" style={{ backgroundColor: colors.border }} />
                
                <View className="px-6 pb-6">
                  <View className="flex-row items-center justify-between gap-4 mb-5">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="rounded-2xl w-14 h-14 items-center justify-center" style={{ backgroundColor: colors.primary }}>
                        <Users size={24} color={colors.primaryText} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-lg" style={{ color: colors.text }}>
                          {passengers.length} Passengers
                        </Text>
                        <View className="flex-row items-center gap-2">
                          {nearestKm !== null && nearestKm !== undefined && (
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>{nearestKm}km away</Text>
                          )}
                          {estimatedMin > 0 && (
                            <>
                              <Text className="text-sm" style={{ color: colors.textSecondary }}>•</Text>
                              <Text className="text-sm" style={{ color: colors.textSecondary }}>{estimatedMin}min</Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-3xl font-bold" style={{ color: colors.success }}>৳{pool.total_earnings}</Text>
                      <Button
                        size="icon"
                        variant="ghost"
                        onPress={() => setIsExpanded(true)}
                        className="w-10 h-10"
                      >
                        <ChevronUp size={20} color={colors.icon} />
                      </Button>
                    </View>
                  </View>
                  
                  <Button 
                    className="w-full h-14"
                    style={{ backgroundColor: colors.success }}
                    onPress={() => {
                      onAccept(pool.id);
                      onClose();
                    }}
                  >
                    <Text className="text-lg font-semibold" style={{ color: colors.primaryText }}>Accept Pool</Text>
                  </Button>
                </View>
              </View>
            </SafeAreaView>
          ) : (
            /* Expanded View */
            <View style={{ height: 600, maxHeight: '85%', position: 'relative' }}>
              <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
                <View {...panResponder.panHandlers}>
                  <View className="w-12 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: colors.border }} />
                </View>
              
              {/* Header */}
              <View className="p-4 flex-row items-center justify-between border-b" style={{ backgroundColor: colors.card, borderBottomColor: colors.border }}>
                <View>
                  <Text className="text-xl font-semibold" style={{ color: colors.text }}>Pool Details</Text>
                  <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                    {passengers.length} passengers {nearestKm !== null && nearestKm !== undefined ? `• ${nearestKm}km away` : ''}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Button size="icon" variant="ghost" onPress={() => setIsExpanded(false)}>
                    <ChevronDown size={20} color={colors.icon} />
                  </Button>
                  <Button size="icon" variant="ghost" onPress={onClose}>
                    <X size={20} color={colors.icon} />
                  </Button>
                </View>
              </View>

              <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="p-5 gap-5">
                  {/* Stats Grid */}
                  <View className="flex-row gap-3">
                    <View className="flex-1 p-4 rounded-xl border items-center" style={{ backgroundColor: isDark ? '#064E3B' : '#D1FAE5', borderColor: isDark ? '#059669' : '#A7F3D0' }}>
                      <DollarSign size={20} color={colors.success} />
                      <Text className="text-2xl font-bold mt-1" style={{ color: colors.success }}>৳{pool.total_earnings}</Text>
                      <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>Earnings</Text>
                    </View>
                    <View className="flex-1 p-4 rounded-xl border items-center" style={{ backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE', borderColor: isDark ? '#2563EB' : '#93C5FD' }}>
                      <Navigation size={20} color="#2563EB" />
                      <Text className="text-2xl font-bold mt-1" style={{ color: '#2563EB' }}>{nearestKm ?? '-'}</Text>
                      <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>km to pickup</Text>
                    </View>
                    <View className="flex-1 p-4 rounded-xl border items-center" style={{ backgroundColor: isDark ? '#581C87' : '#F3E8FF', borderColor: isDark ? '#9333EA' : '#D8B4FE' }}>
                      <Clock size={20} color="#9333EA" />
                      <Text className="text-2xl font-bold mt-1" style={{ color: '#9333EA' }}>{estimatedMin}</Text>
                      <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>min</Text>
                    </View>
                  </View>

                  {/* Route Overview */}
                  <View className="rounded-xl p-4" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="font-semibold" style={{ color: colors.text }}>Route</Text>
                      <Badge variant="outline" style={{ borderColor: colors.border }}>
                        <Text style={{ color: colors.text }}>{passengers.length * 2} stops</Text>
                      </Badge>
                    </View>
                    <View className="gap-2">
                      <View className="flex-row items-center gap-2">
                        <View className="w-2 h-2 rounded-full bg-blue-600" />
                        <Text className="text-sm" style={{ color: colors.textSecondary }}>Start: Your Location</Text>
                      </View>
                      {passengers[0]?.pickup?.address && (
                        <View className="flex-row items-center gap-2">
                          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.success }} />
                          <Text className="text-sm" style={{ color: colors.textSecondary }}>First Pickup: {passengers[0].pickup.address}</Text>
                        </View>
                      )}
                      {pool.destination?.address && (
                        <View className="flex-row items-center gap-2">
                          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.error }} />
                          <Text className="text-sm" style={{ color: colors.textSecondary }}>Destination: {pool.destination.address}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Passengers */}
                  <View>
                    <Text className="font-semibold mb-3" style={{ color: colors.text }}>Passengers ({passengers.length})</Text>
                    <View className="gap-3">
                      {passengers.map((passenger) => (
                        <View key={passenger.user_id} className="rounded-xl p-4" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                          <View className="flex-row items-start gap-3">
                            <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary }}>
                              <Text className="text-lg font-semibold" style={{ color: colors.primaryText }}>
                                {passenger.name.charAt(0)}
                              </Text>
                            </View>
                            <View className="flex-1">
                              <View className="flex-row items-center gap-2 mb-2">
                                <Text className="font-semibold" style={{ color: colors.text }}>{passenger.name}</Text>
                                {passenger.rating !== undefined && passenger.rating > 0 && (
                                  <Badge variant="outline" style={{ borderColor: colors.border }}>
                                    <Text className="text-xs" style={{ color: colors.text }}>⭐ {passenger.rating}</Text>
                                  </Badge>
                                )}
                              </View>
                              <View className="gap-2">
                                {passenger.pickup?.address && (
                                  <View className="flex-row items-start gap-2">
                                    <Text className="font-medium" style={{ color: colors.success }}>↑ Pickup:</Text>
                                    <Text className="flex-1" style={{ color: colors.text }}>{passenger.pickup.address}</Text>
                                  </View>
                                )}
                                {passenger.dropoff?.address && (
                                  <View className="flex-row items-start gap-2">
                                    <Text className="font-medium" style={{ color: colors.error }}>↓ Drop:</Text>
                                    <Text className="flex-1" style={{ color: colors.text }}>{passenger.dropoff.address}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Stop Sequence */}
                  <View>
                    <Text className="font-semibold mb-3" style={{ color: colors.text }}>Stop Sequence</Text>
                    <View className="rounded-xl p-4" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                      <View className="gap-3">
                        <View className="flex-row items-center gap-3">
                          <View className="w-8 h-8 rounded-full items-center justify-center bg-blue-600">
                            <Text className="text-white font-semibold">0</Text>
                          </View>
                          <Text className="text-sm font-medium flex-1" style={{ color: '#2563EB' }}>Start from your location</Text>
                        </View>
                        {passengers.map((passenger, index) => (
                          <View key={`pickup-${passenger.user_id}`} className="flex-row items-center gap-3">
                            <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: colors.success }}>
                              <Text className="font-semibold" style={{ color: colors.primaryText }}>{index + 1}</Text>
                            </View>
                            <Text className="text-sm font-medium flex-1" style={{ color: colors.success }}>
                              Pick up {passenger.name.split(' ')[0]} at {passenger.pickup?.address || 'pickup'}
                            </Text>
                          </View>
                        ))}
                        {passengers.map((passenger, index) => (
                          <View key={`dropoff-${passenger.user_id}`} className="flex-row items-center gap-3">
                            <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: colors.error }}>
                              <Text className="font-semibold" style={{ color: colors.primaryText }}>{passengers.length + index + 1}</Text>
                            </View>
                            <Text className="text-sm font-medium flex-1" style={{ color: colors.error }}>
                              Drop {passenger.name.split(' ')[0]} at {passenger.dropoff?.address || 'destination'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </SafeAreaView>

            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: colors.background }}>
              <Button 
                className="w-full h-14"
                style={{ backgroundColor: colors.success }}
                onPress={() => {
                  onAccept(pool.id);
                  onClose();
                }}
              >
                <Text className="text-lg font-semibold" style={{ color: colors.primaryText }}>Accept Pool - ৳{pool.total_earnings}</Text>
              </Button>
            </View>
            </View>
          )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
