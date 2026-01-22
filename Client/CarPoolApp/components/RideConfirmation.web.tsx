import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native-web';
import { MapPin, Clock, Users, Navigation, ChevronRight, ChevronLeft, Car, Taka } from './Icons';
import { Button } from './ui/button';
import GoogleMapView from './GoogleMapView';
import type { Destination, UserProfile, Pool, Location } from '../contexts/GlobalContext';

type RideConfirmationProps = {
  pickupLocation?: Location | null;
  destination: Destination | null;
  userProfile: UserProfile | null;
  rideType: 'female-only' | 'regular' | null;
  onPoolSelect: (pool: Pool) => void;
  onBack: () => void;
};

type PoolStop = {
  type: 'pickup' | 'dropoff';
  name: string;
  rider: string;
  x: number;
  y: number;
};

const mockPools: Pool[] = [
  {
    id: '1',
    driverName: 'Raisul',
    seatsLeft: 2,
    savings: 145,
    eta: 5,
    walkDistance: 150,
    rating: 4.92,
    carModel: 'Black Honda Civic',
    licensePlate: 'DHK METRO GA-12-36-36',
    photo: 'R',
    vehicle_type: 'car'
  },
  {
    id: '2',
    driverName: 'Fatima',
    seatsLeft: 3,
    savings: 120,
    eta: 8,
    walkDistance: 200,
    rating: 4.88,
    carModel: 'White Toyota Corolla',
    licensePlate: 'DHK METRO HA-45-12-89',
    photo: 'F',
    vehicle_type: 'car'
  },
  {
    id: '3',
    driverName: 'Ahmed',
    seatsLeft: 1,
    savings: 160,
    eta: 3,
    walkDistance: 100,
    rating: 4.95,
    carModel: 'Silver Honda City',
    licensePlate: 'DHK METRO BA-78-23-45',
    photo: 'A',
    vehicle_type: 'cng'
  },
  {
    id: '4',
    driverName: 'Aisha',
    seatsLeft: 2,
    savings: 155,
    eta: 4,
    walkDistance: 120,
    rating: 4.93,
    carModel: 'Red Toyota Yaris',
    licensePlate: 'DHK METRO CA-56-78-90',
    photo: 'A',
    vehicle_type: 'car'
  },
  {
    id: '5',
    driverName: 'Nadia',
    seatsLeft: 1,
    savings: 135,
    eta: 6,
    walkDistance: 180,
    rating: 4.90,
    carModel: 'Green CNG Auto',
    licensePlate: 'DHK METRO DA-23-45-67',
    photo: 'N',
    vehicle_type: 'cng'
  },
  {
    id: '6',
    driverName: 'Karim',
    seatsLeft: 1,
    savings: 140,
    eta: 7,
    walkDistance: 190,
    rating: 4.87,
    carModel: 'Yellow CNG Auto',
    licensePlate: 'DHK METRO EA-11-22-33',
    photo: 'K',
    vehicle_type: 'cng'
  },
];

// Female driver names for filtering
const femaleDrivers = ['Fatima', 'Aisha', 'Nadia'];

export default function RideConfirmation({ pickupLocation, destination, userProfile, rideType, onPoolSelect, onBack }: RideConfirmationProps) {
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [activeRideType, setActiveRideType] = useState<'female-only' | 'regular'>(rideType || 'regular');
  const [selectedVehicleType, setSelectedVehicleType] = useState<'car' | 'cng' | null>(null);
  const isFemale = userProfile?.gender === 'female';
  
  // Mock stops for each pool showing other riders' pickups and drop-offs
  const poolStops: Record<string, PoolStop[]> = {
    '1': [
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 25, y: 30 },
      { type: 'pickup', name: 'Gulshan Circle', rider: 'Sarah', x: 40, y: 45 },
      { type: 'dropoff', name: 'Banani Office', rider: 'Sarah', x: 55, y: 60 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 75, y: 75 },
    ],
    '2': [
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 20, y: 35 },
      { type: 'pickup', name: 'Bashundhara', rider: 'Ali', x: 35, y: 50 },
      { type: 'pickup', name: 'Niketon', rider: 'Fatima', x: 50, y: 55 },
      { type: 'dropoff', name: 'Mohakhali', rider: 'Ali', x: 60, y: 65 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 70, y: 80 },
      { type: 'dropoff', name: 'Uttara', rider: 'Fatima', x: 80, y: 85 },
    ],
    '3': [
      // Ahmed's CNG pool - driver + user only (max 2 passengers)
      { type: 'pickup', name: 'Mirpur 10', rider: 'Ahmed (Driver)', x: 20, y: 20 },
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 30, y: 25 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 70, y: 75 },
      { type: 'dropoff', name: 'Uttara Sector 7', rider: 'Ahmed (Driver)', x: 80, y: 80 },
    ],
    '4': [
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 25, y: 30 },
      { type: 'pickup', name: 'Gulshan Circle', rider: 'Sarah', x: 40, y: 45 },
      { type: 'dropoff', name: 'Banani Office', rider: 'Sarah', x: 55, y: 60 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 75, y: 75 },
    ],
    '5': [
      // Nadia's CNG pool - driver + user only (max 2 passengers)
      { type: 'pickup', name: 'Dhanmondi 27', rider: 'Nadia (Driver)', x: 15, y: 30 },
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 20, y: 35 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 70, y: 80 },
      { type: 'dropoff', name: 'Mohammadpur', rider: 'Nadia (Driver)', x: 75, y: 85 },
    ],
    '6': [
      // Karim's CNG pool - driver + user only (max 2 passengers)
      { type: 'pickup', name: 'Badda Link Road', rider: 'Karim (Driver)', x: 18, y: 25 },
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 25, y: 30 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 75, y: 75 },
      { type: 'dropoff', name: 'Rampura TV Gate', rider: 'Karim (Driver)', x: 82, y: 80 },
    ],
  };
  
  // Filter pools based on user gender and ride type selection
  const filteredPools = (() => {
    let pools = mockPools;
    
    // First filter by gender and ride type
    if (isFemale && activeRideType === 'female-only') {
      // Female users with female-only selection: show only female driver pools
      pools = pools.filter(p => femaleDrivers.includes(p.driverName));
    } else if (isFemale && activeRideType === 'regular') {
      // Female users with regular selection: show all pools
      pools = mockPools;
    } else {
      // Male users: show only non-female-only pools (male drivers)
      pools = pools.filter(p => !femaleDrivers.includes(p.driverName));
    }
    
    // Then filter by vehicle type if selected
    if (selectedVehicleType) {
      pools = pools.filter(p => p.vehicle_type === selectedVehicleType);
    }
    
    return pools;
  })();
  
  const handlePoolClick = (pool: Pool) => {
    setSelectedPoolId(pool.id);
  };

  const handleConfirm = () => {
    if (selectedPoolId) {
      const pool = mockPools.find(p => p.id === selectedPoolId);
      if (pool) {
        onPoolSelect(pool);
      }
    }
  };

  // Use pickup location from props or default to Dhaka center
  const pickupCoords = pickupLocation 
    ? { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude }
    : { latitude: 23.8103, longitude: 90.4125 };
  
  // Use destination coordinates if available, otherwise use default
  const dropoffCoords = destination?.latitude && destination?.longitude
    ? { latitude: destination.latitude, longitude: destination.longitude }
    : { latitude: 23.82, longitude: 90.43 };

  return (
    <View className="h-full w-full flex flex-col bg-white">
      {/* Google Map */}
      <View style={{ height: '33%', position: 'relative' }}>
        <GoogleMapView
          center={pickupCoords}
          zoom={12}
          pickupLocation={pickupCoords}
          dropoffLocation={dropoffCoords}
          showDirections={true}
          markers={
            selectedPoolId && currentStops.length > 0
              ? currentStops
                  .filter(stop => stop.rider !== 'You')
                  .map((stop, idx) => ({
                    id: `stop-${idx}`,
                    latitude: pickupCoords.latitude + (stop.y - 50) * 0.0015,
                    longitude: pickupCoords.longitude + (stop.x - 50) * 0.0015,
                    title: `${stop.rider} - ${stop.name}`,
                    icon: stop.type === 'pickup' ? 'pickup' : 'dropoff',
                  }))
              : []
          }
        >
          {/* Back Button Overlay */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-10 bg-white shadow-md rounded-full w-10 h-10 active:scale-95 transition-transform"
            onClick={onBack}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Legend */}
          {selectedPoolId && (
            <View
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <View className="flex flex-row items-center gap-2 mb-1">
                <View className="w-3 h-3 bg-green-500 rounded-full"></View>
                <Text style={{ fontSize: 12 }}>Pickup</Text>
              </View>
              <View className="flex flex-row items-center gap-2">
                <View className="w-3 h-3 bg-red-500 rounded-full"></View>
                <Text style={{ fontSize: 12 }}>Destination</Text>
              </View>
            </View>
          )}
        </GoogleMapView>
      </View>

      {/* Bottom Sheet */}
      <ScrollView className="flex-1 pb-32">
        <View className="p-5 space-y-5">
          {/* Ride Type Selector for Female Users */}
          {isFemale && (
            <View className="space-y-3">
              <View className="flex flex-row items-center gap-2">
                <Users className="w-5 h-5" />
                <Text>Ride Type</Text>
              </View>
              <View className="flex flex-row gap-3">
                <Button 
                  onClick={() => {
                    setActiveRideType('female-only');
                    setSelectedPoolId(null); // Reset selection when switching
                  }}
                  className={`flex-1 h-12 transition-all ${
                    activeRideType === 'female-only'
                      ? 'bg-pink-500 text-white border-2 border-pink-500 hover:bg-pink-600'
                      : 'bg-pink-50 text-pink-700 border-2 border-pink-300 hover:bg-pink-100'
                  } active:scale-[0.98]`}
                >
                  RideShare with Female
                </Button>
                <Button 
                  onClick={() => {
                    setActiveRideType('regular');
                    setSelectedPoolId(null); // Reset selection when switching
                  }}
                  variant={activeRideType === 'regular' ? 'default' : 'outline'}
                  className={`flex-1 h-12 transition-all ${
                    activeRideType === 'regular'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-2'
                  } active:scale-[0.98]`}
                >
                  Regular RideShare
                </Button>
              </View>
              {activeRideType === 'female-only' && (
                <Text className="text-sm text-pink-600 bg-pink-50 border border-pink-200 rounded-lg p-3">
                  Showing pools with female drivers and riders only for your safety and comfort.
                </Text>
              )}
            </View>
          )}

          {/* Route Summary */}
          <View className="space-y-3">
            <View className="flex flex-row items-start gap-3">
              <View className="w-3 h-3 bg-blue-600 rounded-full mt-2"></View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Pickup</Text>
                <Text>Current Location</Text>
              </View>
            </View>
            <View className="flex flex-row items-start gap-3">
              <MapPin className="w-4 h-4 text-red-600 fill-red-600 flex-shrink-0 mt-1" />
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Drop-off</Text>
                <Text>{destination?.name}</Text>
                <Text className="text-sm text-gray-500">{destination?.address}</Text>
              </View>
            </View>
          </View>

          {/* Cost & Time */}
          <View className="flex flex-row items-center gap-4 py-3 px-4 bg-gray-50 rounded-xl">
            <View className="flex flex-row items-center gap-2">
              <Taka className="w-5 h-5 text-green-600" />
              <Text>185 taka</Text>
            </View>
            <View className="w-px h-6 bg-gray-300"></View>
            <View className="flex flex-row items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <Text>28 mins</Text>
            </View>
          </View>

          {/* Vehicle Type Selector */}
          <View className="space-y-3">
            <Text>Select Vehicle Type</Text>
            <View className="grid grid-cols-2 gap-3">
              {/* Car Option */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedVehicleType('car');
                  setSelectedPoolId(null); // Reset pool selection when switching vehicle type
                }}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                  selectedVehicleType === 'car'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200'
                }`}
              >
                <View className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  selectedVehicleType === 'car' ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  <Car className={`w-7 h-7 ${
                    selectedVehicleType === 'car' ? 'text-white' : 'text-gray-600'
                  }`} />
                </View>
                <View className="items-center">
                  <Text>Car</Text>
                  <Text className="text-xs text-gray-500">Max 3 passengers</Text>
                </View>
                {selectedVehicleType === 'car' && (
                  <View
                    
                    
                    className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <View className="w-2 h-2 bg-white rounded-full"></View>
                  </View>
                )}
              </TouchableOpacity>

              {/* CNG Option */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedVehicleType('cng');
                  setSelectedPoolId(null); // Reset pool selection when switching vehicle type
                }}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.98] relative ${
                  selectedVehicleType === 'cng'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200'
                }`}
              >
                <View className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  selectedVehicleType === 'cng' ? 'bg-green-500' : 'bg-gray-200'
                }`}>
                  {/* CNG Icon - simplified three-wheeler */}
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-7 h-7 ${
                      selectedVehicleType === 'cng' ? 'text-white' : 'text-gray-600'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="17" cy="17" r="2" />
                    <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" />
                    <path d="M12 17v-9" />
                  </svg>
                </View>
                <View className="items-center">
                  <Text>CNG</Text>
                  <Text className="text-xs text-gray-500">Max 2 passengers</Text>
                </View>
                {selectedVehicleType === 'cng' && (
                  <View
                    
                    
                    className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <View className="w-2 h-2 bg-white rounded-full"></View>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            {!selectedVehicleType && (
              <Text className="text-sm text-gray-500 text-center">Select a vehicle type to see available pools</Text>
            )}
          </View>

          {/* Available Pools */}
          {selectedVehicleType && (
            <View className="space-y-3">
              <View className="flex flex-row items-center gap-2">
                <Users className="w-5 h-5" />
                <Text>Available Pools</Text>
              </View>
              
              {!selectedPoolId && (
                <Text className="text-sm text-gray-500">Tap a pool to see the route and other riders</Text>
              )}
              
              {filteredPools.length > 0 ? (
                <View className="space-y-3">
                  {filteredPools.map((pool) => (
                    <TouchableOpacity
                      key={pool.id}
                      onPress={() => handlePoolClick(pool)}
                      className={`border-2 rounded-2xl p-4 space-y-3 transition-all ${
                        selectedPoolId === pool.id
                          ? 'border-blue-500 shadow-lg bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <View className="flex flex-row items-center justify-between">
                        <View className="flex flex-row items-center gap-3">
                          <View className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center">
                            <Text className="text-white">{pool.photo}</Text>
                          </View>
                          <View>
                            <Text>{pool.driverName}'s Pool</Text>
                            <View className="flex flex-row items-center gap-1">
                              <Text className="text-sm text-gray-600">⭐ {pool.rating}</Text>
                            </View>
                          </View>
                        </View>
                        {selectedPoolId === pool.id && (
                          <View
                            
                            
                            className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center"
                          >
                            <View className="w-2 h-2 bg-white rounded-full"></View>
                          </View>
                        )}
                      </View>

                      <View className="grid grid-cols-2 gap-2">
                        <View className="flex flex-row items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4 text-gray-600" />
                          <Text className="text-sm text-gray-600">{pool.seatsLeft} seats left</Text>
                        </View>
                        <View className="flex flex-row items-center gap-2">
                          <Taka className="w-4 h-4 text-green-600" />
                          <Text className="text-sm text-green-600">Save {pool.savings} taka</Text>
                        </View>
                        <View className="flex flex-row items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-600" />
                          <Text className="text-sm text-gray-600">{pool.eta} min away</Text>
                        </View>
                        <View className="flex flex-row items-center gap-2">
                          <Navigation className="w-4 h-4 text-gray-600" />
                          <Text className="text-sm text-gray-600">Walk {pool.walkDistance}m</Text>
                        </View>
                      </View>

                      {selectedPoolId === pool.id && poolStops[pool.id] && (
                        <View
                          
                          
                          className="pt-3 border-t border-blue-200 space-y-2"
                        >
                          <Text className="text-sm text-blue-900">Route Stops:</Text>
                          <View className="space-y-1">
                            {poolStops[pool.id].map((stop, idx) => (
                              <View key={idx} className="flex flex-row items-center gap-2">
                                {stop.type === 'pickup' ? (
                                  <View className={`w-2 h-2 rounded-full ${
                                    stop.rider === 'You' ? 'bg-blue-600' : 'bg-green-500'
                                  }`}></View>
                                ) : (
                                  <MapPin className={`w-3 h-3 ${
                                    stop.rider === 'You' ? 'text-red-600 fill-red-600' : 'text-orange-500 fill-orange-500'
                                  }`} />
                                )}
                                <Text className={`text-sm ${stop.rider === 'You' ? 'text-blue-900' : 'text-gray-600'}`}>
                                  {stop.rider} - {stop.name}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="items-center py-8 px-4 bg-gray-50 rounded-xl">
                  <Text className="text-gray-600">No pools available for the selected vehicle type</Text>
                  <Text className="text-sm text-gray-500 mt-2">Try selecting a different vehicle type</Text>
                </View>
              )}
            </View>
          )}

          {/* Payment Method */}
          <View className="border-t pt-4">
            <View className="flex flex-row items-center justify-between py-3">
              <Text className="text-gray-600">Payment Method</Text>
              <View className="flex flex-row items-center gap-2">
                <Text>Cash</Text>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </View>
            </View>
          </View>

          {/* Spacer for fixed button */}
          <View className="h-20"></View>
        </View>
      </ScrollView>

      {/* Fixed Confirm Button above bottom nav */}
      {selectedPoolId && (
        <View
          
          
          className="fixed bottom-16 left-0 right-0 px-5 pb-3 bg-white border-t border-gray-200"
        >
          <Button
            onClick={handleConfirm}
            className={`w-full h-14 ${isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'} active:scale-[0.98] transition-transform`}
          >
            Confirm RideShare Pool
          </Button>
        </View>
      )}
    </View>
  );
}
