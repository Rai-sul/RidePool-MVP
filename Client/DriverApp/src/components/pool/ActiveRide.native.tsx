import { View, Text, ScrollView } from "react-native";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Phone, CheckCircle, X, Navigation, MessageCircle, Star } from "lucide-react-native";
import { useState } from "react";
import { PassengerBillingDialog } from "./PassengerBillingDialog.native";
import type { Pool, Customer } from "../../types";

interface ActiveRideProps {
  pool: Pool;
  onComplete: () => void;
  onCancel: () => void;
  onOpenNavigation: () => void;
  onPassengerDropped?: (customerId: string, earnings: number) => void;
}

export function ActiveRide({ pool, onComplete, onCancel, onOpenNavigation, onPassengerDropped }: ActiveRideProps) {
  const [completedCustomers, setCompletedCustomers] = useState<Set<string>>(new Set());
  const [billingPassenger, setBillingPassenger] = useState<Pool["customers"][0] | null>(null);
  const [billingEarnings, setBillingEarnings] = useState(0);
  const [billingDistance, setBillingDistance] = useState(0);

  const toggleCustomerComplete = (customerId: string) => {
    const newCompleted = new Set(completedCustomers);
    
    if (newCompleted.has(customerId)) {
      newCompleted.delete(customerId);
    } else {
      newCompleted.add(customerId);
      
      const earningsPerPassenger = Math.round(pool.totalEarnings / pool.customers.length);
      const distancePerPassenger = Number((pool.distance / pool.customers.length).toFixed(1));
      const customer = pool.customers.find((c: Customer) => c.id === customerId);
      
      if (customer) {
        setBillingPassenger(customer);
        setBillingEarnings(earningsPerPassenger);
        setBillingDistance(distancePerPassenger);
      }
      
      // Call callback if provided
      if (onPassengerDropped) {
        onPassengerDropped(customerId, earningsPerPassenger);
      }
    }
    
    setCompletedCustomers(newCompleted);
  };

  const allCompleted = completedCustomers.size === pool.customers.length;

  return (
    <ScrollView className="flex-1">
      <View className="space-y-4 p-4">
        {/* Ride Header */}
        <Card className="p-5 bg-gradient-to-r from-blue-600 to-blue-700">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-2xl text-white mb-1">Active Pool Ride</Text>
              <Text className="text-sm text-white opacity-90">
                {completedCustomers.size}/{pool.customers.length} passengers completed
              </Text>
            </View>
            <Badge className="bg-white px-3 py-1">
              <Text className="text-blue-700">In Progress</Text>
            </Badge>
          </View>
          <View className="flex-row gap-4 mt-4">
            <View className="flex-1">
              <Text className="text-sm text-white opacity-90">Total Earnings</Text>
              <Text className="text-3xl text-white">৳{pool.totalEarnings}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-white opacity-90">Distance</Text>
              <Text className="text-3xl text-white">{pool.distance}km</Text>
            </View>
          </View>
        </Card>

        {/* Navigation Button */}
        <Button className="w-full h-14 bg-blue-600" onPress={onOpenNavigation}>
          <View className="flex-row items-center">
            <Navigation size={20} color="#FFFFFF" />
            <Text className="text-lg text-white ml-2">Open Navigation</Text>
          </View>
        </Button>

        {/* Passengers List */}
        <View>
          <Text className="mb-3 text-lg font-semibold">Passengers ({pool.customers.length})</Text>
          <View className="space-y-3">
            {pool.customers.map((customer) => {
              const isCompleted = completedCustomers.has(customer.id);
              
              return (
                <Card 
                  key={customer.id} 
                  className={`p-4 ${isCompleted ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
                >
                  <View className="flex-row items-start justify-between gap-3 mb-3">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-12 h-12 rounded-full bg-blue-600 items-center justify-center">
                        <Text className="text-white text-lg">
                          {customer.name.charAt(0)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold mb-1">{customer.name}</Text>
                        <View className="flex-row items-center gap-1">
                          <Star size={12} color="#EAB308" fill="#EAB308" />
                          <Text className="text-sm">{customer.rating}</Text>
                        </View>
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="w-10 h-10"
                        onPress={() => {}}
                      >
                        <Phone size={16} color="#6B7280" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="w-10 h-10"
                        onPress={() => {}}
                      >
                        <MessageCircle size={16} color="#6B7280" />
                      </Button>
                    </View>
                  </View>

                  <View className="space-y-2 bg-gray-50 rounded-lg p-3 mb-3">
                    <View className="flex-row items-start gap-2">
                      <Text className="text-green-700 font-medium">↑ Pickup:</Text>
                      <Text className="text-gray-700 flex-1">{customer.pickup}</Text>
                    </View>
                    <View className="flex-row items-start gap-2">
                      <Text className="text-red-700 font-medium">↓ Drop:</Text>
                      <Text className="text-gray-700 flex-1">{customer.destination}</Text>
                    </View>
                  </View>

                  <Button
                    variant={isCompleted ? "secondary" : "default"}
                    className={`w-full h-11 ${!isCompleted && 'bg-green-600'}`}
                    onPress={() => toggleCustomerComplete(customer.id)}
                  >
                    <View className="flex-row items-center">
                      {isCompleted ? (
                        <>
                          <X size={16} color="#6B7280" />
                          <Text className="ml-2">Undo Complete</Text>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} color="#FFFFFF" />
                          <Text className="text-white ml-2">Mark as Dropped Off</Text>
                        </>
                      )}
                    </View>
                  </Button>
                </Card>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1 h-14 border-2"
            onPress={onCancel}
          >
            <Text className="text-base">Cancel Ride</Text>
          </Button>
          <Button 
            className="flex-1 h-14 bg-green-600"
            disabled={!allCompleted}
            onPress={onComplete}
          >
            <Text className="text-white text-base">Complete Pool</Text>
          </Button>
        </View>

        {/* Billing Dialog */}
        {billingPassenger && (
          <PassengerBillingDialog
            isOpen={billingPassenger !== null}
            passenger={billingPassenger}
            earnings={billingEarnings}
            distance={billingDistance}
            onClose={() => setBillingPassenger(null)}
          />
        )}
      </View>
    </ScrollView>
  );
}
