import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Clock, Users, Navigation, ChevronRight, ChevronLeft, Car, DollarSign } from './Icons';
import { Button } from './ui/button';
import type { Destination, UserProfile, Pool } from '../contexts/GlobalContext';
import LinearGradient from './LinearGradient';
import { Svg, Path, Circle } from 'react-native-svg';

type RideConfirmationProps = {
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
    vehicleType: 'car'
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
    vehicleType: 'car'
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
    vehicleType: 'cng'
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
    vehicleType: 'car'
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
    vehicleType: 'cng'
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
    vehicleType: 'cng'
  },
];

// Female driver names for filtering
const femaleDrivers = ['Fatima', 'Aisha', 'Nadia'];

export default function RideConfirmation({ destination, userProfile, rideType, onPoolSelect, onBack }: RideConfirmationProps) {
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [activeRideType, setActiveRideType] = useState<'female-only' | 'regular'>(rideType || 'regular');
  const [selectedVehicleType, setSelectedVehicleType] = useState<'car' | 'cng' | null>(null);
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const isFemale = userProfile?.gender === 'female';
  
  // Delay showing the confirm button to prevent touch event overlap
  useEffect(() => {
    if (selectedPoolId) {
      const timer = setTimeout(() => {
        setShowConfirmButton(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setShowConfirmButton(false);
    }
  }, [selectedPoolId]);
  
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
      pools = pools.filter(p => p.vehicleType === selectedVehicleType);
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

  const currentStops = selectedPoolId ? poolStops[selectedPoolId] || [] : [];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="h-full w-full flex flex-col bg-white">
        {/* Map Preview */}
        <LinearGradient
          colors={['#e0e0e0', '#f0f0f0', '#e0f2f7']} // Approximate colors for from-gray-200 via-gray-100 to-blue-50
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="h-1/3 relative overflow-hidden"
        >
        <TouchableOpacity
          onPress={onBack}
          className="absolute top-4 left-4 z-10 bg-white rounded-full w-10 h-10 flex items-center justify-center active:scale-95"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 }}
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </TouchableOpacity>

        {/* Simulated route and stops */}
        <View className="absolute inset-0 flex items-center justify-center">
          <View className="relative w-full h-full">
            {/* Show route path when pool is selected */}
            {selectedPoolId && currentStops.length > 0 && (
              <>
                {/* Route line connecting all stops */}
                <Svg className="absolute inset-0 w-full h-full">
                  <Path
                    d={`M ${currentStops[0].x} ${currentStops[0].y} ${currentStops
                      .slice(1)
                      .map(stop => `L ${stop.x} ${stop.y}`)
                      .join(' ')}`}
                    stroke="#3B82F6"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="8,4"
                  />
                </Svg>

                {/* Driver car icon */}
                <View
                  className="absolute"
                  style={{ left: currentStops[0].x, top: currentStops[0].y - 8 }}
                >
                  <View className="relative -translate-x-1/2 -translate-y-1/2">
                    <View className="bg-blue-600 text-white p-2 rounded-full shadow-lg">
                      <Navigation className="w-5 h-5 text-white" />
                    </View>
                    <View className="absolute -top-8 left-1/2 -translate-x-1/2">
                      <View className="bg-white px-2 py-1 rounded shadow-md" style={{ minWidth: 70 }}>
                        <Text className="text-xs" numberOfLines={1}>Driver here</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* All stops with labels */}
                {currentStops.map((stop, index) => (
                  <View
                    key={index}
                    className="absolute"
                    style={{ left: stop.x, top: stop.y }}
                  >
                    <View className="relative -translate-x-1/2 -translate-y-full">
                      {stop.type === 'pickup' ? (
                        <View className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${
                          stop.rider === 'You' ? 'bg-blue-600' : 'bg-green-500'
                        }`}>
                          <View className="w-3 h-3 bg-white rounded-full"></View>
                        </View>
                      ) : (
                        <MapPin className={`w-6 h-6 shadow-lg ${
                          stop.rider === 'You' ? 'text-red-600 fill-red-600' : 'text-orange-500 fill-orange-500'
                        }`} />
                      )}
                      
                      {/* Stop label */}
                      <View className="absolute top-full mt-1 left-1/2 -translate-x-1/2">
                        <View 
                          className={`px-2 py-1 rounded shadow-md ${
                            stop.rider === 'You' 
                              ? 'bg-blue-600' 
                              : 'bg-white border border-gray-200'
                          }`}
                          style={{ minWidth: 60 }}
                        >
                          <Text 
                            className={stop.rider === 'You' ? 'text-white' : 'text-gray-900'}
                            numberOfLines={1}
                          >
                            {stop.rider}
                          </Text>
                          <Text 
                            className={`text-xs ${stop.rider === 'You' ? 'text-blue-100' : 'text-gray-500'}`}
                            numberOfLines={1}
                          >
                            {stop.type === 'pickup' ? 'Pickup' : 'Drop-off'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Default view when no pool selected */}
            {!selectedPoolId && (
              <>
                <View className="absolute top-1/4 left-1/4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <View className="w-3 h-3 bg-white rounded-full"></View>
                </View>
                <View className="absolute bottom-1/4 right-1/4">
                  <MapPin className="w-8 h-8 text-red-600 fill-red-600" />
                </View>
                <Svg className="absolute inset-0 w-full h-full">
                  <Path
                    d="M 100 80 Q 200 120 280 200"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="8,4"
                  />
                </Svg>
              </>
            )}
          </View>
        </View>

        {/* Legend */}
        {selectedPoolId && (
          <View
            className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5 }}
          >
            <View className="flex flex-row items-center gap-2 mb-1.5">
              <View className="w-3 h-3 bg-blue-600 rounded-full"></View>
              <Text className="text-xs text-gray-700">Your stops</Text>
            </View>
            <View className="flex flex-row items-center gap-2 mb-1.5">
              <View className="w-3 h-3 bg-green-500 rounded-full"></View>
              <Text className="text-xs text-gray-700">Co-rider pickups</Text>
            </View>
            <View className="flex flex-row items-center gap-2">
              <MapPin className="w-3 h-3 text-orange-500 fill-orange-500" />
              <Text className="text-xs text-gray-700">Co-rider drops</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Bottom Sheet */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="px-4 py-5">
          {/* Ride Type Selector for Female Users */}
          {isFemale && (
            <View className="mb-6">
              <View className="flex flex-row items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-gray-700" />
                <Text className="text-base font-semibold text-gray-900">Ride Type</Text>
              </View>
              <View className="flex flex-row gap-4">
                <Button 
                  onPress={() => {
                    setActiveRideType('female-only');
                    setSelectedPoolId(null); // Reset selection when switching
                  }}
                  className={`flex-1 h-12 transition-all ${
                    activeRideType === 'female-only'
                      ? 'bg-pink-500 border-2 border-pink-500 hover:bg-pink-600'
                      : 'bg-pink-50 border-2 border-pink-300 hover:bg-pink-100'
                  } active:scale-[0.98]`}
                >
                  <Text className={activeRideType === 'female-only' ? 'text-white font-semibold' : 'text-gray-900 font-semibold'}>
                    RideShare with Female
                  </Text>
                </Button>
                <Button 
                  onPress={() => {
                    setActiveRideType('regular');
                    setSelectedPoolId(null); // Reset selection when switching
                  }}
                  className={`flex-1 h-12 transition-all ${
                    activeRideType === 'regular'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-white border-2 border-gray-300'
                  } active:scale-[0.98]`}
                >
                  <Text className={activeRideType === 'regular' ? 'text-white font-semibold' : 'text-gray-900 font-semibold'}>
                    Regular RideShare
                  </Text>
                </Button>
              </View>
              {activeRideType === 'female-only' && (
                <View className="mt-3 mx-1">
                  <Text className="text-sm text-pink-600 bg-pink-50 border border-pink-200 rounded-lg p-3">
                    Showing pools with female drivers and riders only for your safety and comfort.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Route Summary */}
          <View className="mx-1 mb-4">
            <View className="flex flex-row items-center justify-between gap-4 py-3 px-4 bg-gray-50 rounded-xl">
              {/* Pickup */}
              <View className="flex-1 flex flex-row items-center gap-3">
                <View className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0"></View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Pickup</Text>
                  <Text className="text-sm font-medium" numberOfLines={1}>Current Location</Text>
                </View>
              </View>
              
              <View className="w-px h-10 bg-gray-300"></View>
              
              {/* Drop-off */}
              <View className="flex-1 flex flex-row items-center gap-3">
                <MapPin className="w-4 h-4 text-red-600 fill-red-600 flex-shrink-0" />
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Drop-off</Text>
                  <Text className="text-sm font-medium" numberOfLines={1}>{destination?.name}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cost & Time */}
          <View className="flex flex-row items-center justify-center gap-4 py-3 px-4 bg-gray-50 rounded-xl mx-1 mb-4">
            <View className="flex flex-row items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <Text className="font-semibold">185 taka</Text>
            </View>
            <View className="w-px h-6 bg-gray-300"></View>
            <View className="flex flex-row items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <Text className="font-semibold">28 mins</Text>
            </View>
          </View>

          {/* Vehicle Type Selector */}
          <View className="mb-6">
            <View className="flex flex-row items-center gap-2 mb-3 mx-1">
              <Car className="w-5 h-5 text-gray-700" />
              <Text className="text-base font-semibold text-gray-900">Select Vehicle Type</Text>
            </View>
            <View className="flex-row flex-wrap gap-4 px-1">
              {/* Car Option */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedVehicleType('car');
                  setSelectedPoolId(null); // Reset pool selection when switching vehicle type
                }}
                className={`flex-1 flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                  selectedVehicleType === 'car'
                    ? 'border-blue-500'
                    : 'border-gray-200'
                }`}
                style={selectedVehicleType === 'car' ? {
                  backgroundColor: '#eff6ff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 4,
                } : {}}
              >
                <View className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  selectedVehicleType === 'car' ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  <Car className={`w-7 h-7 ${
                    selectedVehicleType === 'car' ? 'text-white' : 'text-gray-600'
                  }`} />
                </View>
                <View className="items-center">
                  <Text className="text-sm font-medium text-gray-900">Car</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Max 3 passengers</Text>
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
                className={`flex-1 flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-[0.98] relative ${
                  selectedVehicleType === 'cng'
                    ? 'border-green-500'
                    : 'border-gray-200'
                }`}
                style={selectedVehicleType === 'cng' ? {
                  backgroundColor: '#f0fdf4',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 4,
                } : {}}
              >
                <View className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  selectedVehicleType === 'cng' ? 'bg-green-500' : 'bg-gray-200'
                }`}>
                  {/* CNG Icon - simplified three-wheeler */}
                  <Car className={`w-7 h-7 ${
                    selectedVehicleType === 'cng' ? 'text-white' : 'text-gray-600'
                  }`} />
                </View>
                <View className="items-center">
                  <Text className="text-sm font-medium text-gray-900">CNG</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Max 2 passengers</Text>
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
                <View className="mt-3">
                  {filteredPools.map((pool) => (
                    <TouchableOpacity
                      key={pool.id}
                      onPress={() => handlePoolClick(pool)}
                      className={`border-2 rounded-2xl p-4 mb-3 ${
                        selectedPoolId === pool.id
                          ? 'border-blue-500'
                          : 'border-gray-200'
                      }`}
                      style={selectedPoolId === pool.id ? {
                        backgroundColor: '#eff6ff',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 8,
                      } : {
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <View className="flex flex-row items-center justify-between mb-3">
                        <View className="flex flex-row items-center gap-3">
                          <LinearGradient
                            colors={['#2563eb', '#06b6d4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                          >
                            <Text className="text-white text-lg font-bold">{pool.photo}</Text>
                          </LinearGradient>
                          <View>
                            <Text className="text-base font-semibold text-gray-900 mb-1">{pool.driverName}'s Pool</Text>
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

                      <View className="flex flex-row flex-wrap gap-3">
                        <View className="flex flex-row items-center gap-1.5">
                          <Users className="w-4 h-4 text-gray-600" />
                          <Text className="text-sm text-gray-700">{pool.seatsLeft} seats</Text>
                        </View>
                        <View className="flex flex-row items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <Text className="text-sm text-green-600 font-medium">Save ৳{pool.savings}</Text>
                        </View>
                        <View className="flex flex-row items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <Text className="text-sm text-gray-700">{pool.eta} min</Text>
                        </View>
                        <View className="flex flex-row items-center gap-1.5">
                          <Navigation className="w-4 h-4 text-gray-600" />
                          <Text className="text-sm text-gray-700">{pool.walkDistance}m walk</Text>
                        </View>
                      </View>

                      {selectedPoolId === pool.id && poolStops[pool.id] && (
                        <View
                          className="mt-3 pt-3 border-t border-blue-200"
                        >
                          <Text className="text-sm font-semibold text-blue-900 mb-2">Route Stops:</Text>
                          <View>
                            {poolStops[pool.id].map((stop, idx) => (
                              <View key={idx} className="flex flex-row items-center gap-2 mb-1.5">
                                {stop.type === 'pickup' ? (
                                  <View className={`w-2 h-2 rounded-full ${
                                    stop.rider === 'You' ? 'bg-blue-600' : 'bg-green-500'
                                  }`}></View>
                                ) : (
                                  <MapPin className={`w-3 h-3 ${
                                    stop.rider === 'You' ? 'text-red-600 fill-red-600' : 'text-orange-500 fill-orange-500'
                                  }`} />
                                )}
                                <Text className={`text-sm ${stop.rider === 'You' ? 'text-blue-900 font-medium' : 'text-gray-600'}`}>
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
                <View className="items-center py-8 px-4 bg-gray-50 rounded-xl mt-3">
                  <Text className="text-gray-700 font-medium text-center">No pools available</Text>
                  <Text className="text-sm text-gray-500 mt-2 text-center">Try selecting a different vehicle type</Text>
                </View>
              )}
            </View>
          )}

          {/* Payment Method */}
          <View className="mt-6 pt-5 border-t border-gray-200">
            <TouchableOpacity 
              className="flex flex-row items-center justify-between py-3 px-4 rounded-xl"
              style={{ backgroundColor: '#f9fafb' }}
            >
              <Text className="text-gray-700 font-medium">Payment Method</Text>
              <View className="flex flex-row items-center gap-2">
                <Text className="text-gray-900 font-semibold">Cash</Text>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Confirm Button above bottom nav */}
      {showConfirmButton && selectedPoolId && (
        <View
          className="absolute bottom-16 left-0 right-0 px-4 py-4 bg-white border-t border-gray-200"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 }}
        >
          <Button
            onPress={handleConfirm}
            className={`w-full h-14 ${isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'} active:scale-[0.98] transition-transform rounded-xl`}
            textClassName="text-white font-bold text-base"
          >
            Confirm RideShare Pool
          </Button>
        </View>
      )}
      </View>
    </SafeAreaView>
  );
}