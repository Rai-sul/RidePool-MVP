import { View, Text } from "react-native";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { MapPin, Users, DollarSign, Navigation, Star } from "lucide-react-native";
import type { Pool } from "../../types";

interface PoolCardProps {
  pool: Pool;
  onAccept: (poolId: string) => void;
}

export function PoolCard({ pool, onAccept }: PoolCardProps) {
  const passengers = pool.passengers || [];

  return (
    <Card className="p-4">
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-2">
            <Users size={16} color="#6B7280" />
            <Text>{passengers.length} Passenger{passengers.length > 1 ? 's' : ''}</Text>
            {pool.estimated_arrival_minutes !== undefined && (
              <Badge variant="secondary">{pool.estimated_arrival_minutes} min</Badge>
            )}
          </View>
          
          <View className="space-y-2 mt-3">
            {passengers.map((passenger, index) => (
              <View key={passenger.user_id} className="pl-4 border-l-2 border-gray-200">
                <View className="flex-row items-start gap-2 mb-1">
                  <View className="flex-row items-center gap-1 text-sm text-gray-600 mt-0.5">
                    <View className="w-2 h-2 rounded-full bg-blue-500" />
                    <Text className="text-sm text-gray-600">P{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text>{passenger.name}</Text>
                      {passenger.rating !== undefined && passenger.rating > 0 && (
                        <View className="flex-row items-center gap-1">
                          <Star size={12} color="#EAB308" fill="#EAB308" />
                          <Text className="text-sm">{passenger.rating}</Text>
                        </View>
                      )}
                    </View>
                    <View className="text-sm text-gray-600 mt-1">
                      {passenger.pickup?.address && (
                        <View className="flex-row items-center gap-1">
                          <MapPin size={12} color="#6B7280" />
                          <Text className="text-sm text-gray-600">{passenger.pickup.address}</Text>
                        </View>
                      )}
                      {passenger.dropoff?.address && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Navigation size={12} color="#6B7280" />
                          <Text className="text-sm text-gray-600">{passenger.dropoff.address}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between pt-3 border-t border-gray-200">
        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center gap-2">
            <DollarSign size={20} color="#059669" />
            <View>
              <Text className="text-sm text-gray-600">Earnings</Text>
              <Text>৳{pool.total_earnings}</Text>
            </View>
          </View>
          {pool.nearest_pickup_km !== null && pool.nearest_pickup_km !== undefined && (
            <View className="flex-row items-center gap-2">
              <Navigation size={20} color="#2563EB" />
              <View>
                <Text className="text-sm text-gray-600">Distance</Text>
                <Text>{pool.nearest_pickup_km} km</Text>
              </View>
            </View>
          )}
        </View>
        <Button onPress={() => onAccept(pool.id)} className="bg-green-600 hover:bg-green-700">
          <Text className="text-white">Accept Pool</Text>
        </Button>
      </View>
    </Card>
  );
}
