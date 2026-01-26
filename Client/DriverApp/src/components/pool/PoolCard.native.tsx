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
  return (
    <Card className={`p-4 ${pool.isPriority ? 'border-2 border-green-500 bg-green-50' : ''}`}>
      {pool.isPriority && (
        <View className="flex-row items-center gap-2 mb-3">
          <Star size={16} color="#059669" fill="#059669" />
          <Text className="text-green-700">Priority Destination</Text>
        </View>
      )}
      
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-2">
            <Users size={16} color="#6B7280" />
            <Text>{pool.customers.length} Passenger{pool.customers.length > 1 ? 's' : ''}</Text>
            <Badge variant="secondary">{pool.estimatedTime} min</Badge>
          </View>
          
          <View className="space-y-2 mt-3">
            {pool.customers.map((customer, index) => (
              <View key={customer.id} className="pl-4 border-l-2 border-gray-200">
                <View className="flex-row items-start gap-2 mb-1">
                  <View className="flex-row items-center gap-1 text-sm text-gray-600 mt-0.5">
                    <View className="w-2 h-2 rounded-full bg-blue-500" />
                    <Text className="text-sm text-gray-600">P{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text>{customer.name}</Text>
                      {customer.rating !== undefined && (
                        <View className="flex-row items-center gap-1">
                          <Star size={12} color="#EAB308" fill="#EAB308" />
                          <Text className="text-sm">{customer.rating}</Text>
                        </View>
                      )}
                    </View>
                    <View className="text-sm text-gray-600 mt-1">
                      <View className="flex-row items-center gap-1">
                        <MapPin size={12} color="#6B7280" />
                        <Text className="text-sm text-gray-600">{customer.pickup}</Text>
                      </View>
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <Navigation size={12} color="#6B7280" />
                        <Text className="text-sm text-gray-600">{customer.destination}</Text>
                      </View>
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
              <Text>৳{pool.totalEarnings}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Navigation size={20} color="#2563EB" />
            <View>
              <Text className="text-sm text-gray-600">Distance</Text>
              <Text>{pool.distance} km</Text>
            </View>
          </View>
        </View>
        <Button onPress={() => onAccept(pool.id)} className="bg-green-600 hover:bg-green-700">
          <Text className="text-white">Accept Pool</Text>
        </Button>
      </View>
    </Card>
  );
}
