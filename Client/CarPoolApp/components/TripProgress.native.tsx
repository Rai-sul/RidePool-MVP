import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Phone, MessageCircle, User, Navigation, Clock, Star, Users, AlertCircle, RefreshCw } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import GoogleMapView from './GoogleMapView';
import type { UserProfile, Location, Destination, Pool } from '../contexts/GlobalContext';
import { usePoolRealtime } from '../hooks/usePoolRealtime';

type TripProgressProps = {
  userProfile: UserProfile | null;
  pickupLocation?: Location | null;
  destination?: Destination | null;
  selectedPool?: Pool | null;
  onComplete?: () => void;
  onChatDriver?: () => void;
};

export default function TripProgress({ userProfile, pickupLocation, destination, selectedPool, onComplete, onChatDriver }: TripProgressProps) {
  const [progress, setProgress] = useState(15);
  const [tripStatus, setTripStatus] = useState<'waiting' | 'on-the-way' | 'arrived' | 'in-progress' | 'completed'>('waiting');
  const [driverPosition, setDriverPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Use real-time pool updates
  const {
    pool: poolDetails,
    coRiders,
    hasDriver,
    poolStatus,
    loading: loadingPool,
    error: poolError,
    lastUpdated,
    refresh: refreshPool,
  } = usePoolRealtime(selectedPool?.id || null, userProfile?.id || null);
  
  const isFemale = userProfile?.gender === 'female';
  const accentColor = isFemale ? 'pink' : 'blue';
  const accentBg = isFemale ? 'bg-pink-500' : 'bg-blue-600';
  const accentText = isFemale ? 'text-pink-600' : 'text-blue-600';
  const accentBorder = isFemale ? 'border-pink-500' : 'border-blue-600';

  // Use actual pickup location or default
  const pickupCoords = pickupLocation 
    ? { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude }
    : { latitude: 23.8103, longitude: 90.4125 };
  
  // Use actual destination or default
  const dropoffCoords = destination?.latitude && destination?.longitude
    ? { latitude: destination.latitude, longitude: destination.longitude }
    : { latitude: 23.82, longitude: 90.43 };

  // Driver info - use real pool data if available
  const driver = {
    name: poolDetails?.driver?.id ? 'Driver' : (selectedPool?.driverName || 'Waiting for driver...'),
    initial: poolDetails?.driver?.id?.charAt(0).toUpperCase() || selectedPool?.photo || 'D',
    rating: poolDetails?.driver?.average_rating || selectedPool?.rating || 0,
    trips: 0,
    vehicle: poolDetails?.vehicles?.model || selectedPool?.carModel || selectedPool?.vehicle_type || 'N/A',
    plateNumber: poolDetails?.vehicles?.vehicle_number || selectedPool?.licensePlate || 'N/A',
    eta: `${selectedPool?.eta || 5} mins`,
    phone: ''
  };

  // Pool status info
  const currentPassengers = poolDetails?.current_passengers || selectedPool?.current_passengers || 1;
  const maxPassengers = poolDetails?.max_passengers || selectedPool?.max_passengers || 4;

  // Initialize driver position between pickup and destination
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      // Start driver slightly away from pickup
      const initialLat = pickupCoords.latitude - 0.005;
      const initialLng = pickupCoords.longitude - 0.003;
      setDriverPosition({ latitude: initialLat, longitude: initialLng });
    }
  }, []);

  // Simulate trip progress and driver movement
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setTripStatus('completed');
          return 100;
        }
        
        // Move driver position along the route
        if (driverPosition && pickupCoords && dropoffCoords) {
          const progressRatio = (prev + 5) / 100;
          let newLat, newLng;
          
          if (prev < 40) {
            // Driver moving towards pickup
            const pickupProgress = prev / 40;
            const startLat = pickupCoords.latitude - 0.005;
            const startLng = pickupCoords.longitude - 0.003;
            newLat = startLat + (pickupCoords.latitude - startLat) * pickupProgress;
            newLng = startLng + (pickupCoords.longitude - startLng) * pickupProgress;
          } else {
            // Driver moving from pickup to destination
            const tripProgress = (prev - 40) / 60;
            newLat = pickupCoords.latitude + (dropoffCoords.latitude - pickupCoords.latitude) * tripProgress;
            newLng = pickupCoords.longitude + (dropoffCoords.longitude - pickupCoords.longitude) * tripProgress;
          }
          
          setDriverPosition({ latitude: newLat, longitude: newLng });
        }
        
        return prev + 5;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [driverPosition, pickupCoords, dropoffCoords]);

  // Update status based on progress
  useEffect(() => {
    if (progress < 20) setTripStatus('waiting');
    else if (progress < 40) setTripStatus('on-the-way');
    else if (progress < 50) setTripStatus('arrived');
    else if (progress < 100) setTripStatus('in-progress');
    else setTripStatus('completed');
  }, [progress]);

  const getStatusText = () => {
    switch (tripStatus) {
      case 'waiting': return 'Driver is on the way';
      case 'on-the-way': return 'Driver arriving soon';
      case 'arrived': return 'Driver has arrived';
      case 'in-progress': return 'Trip in progress';
      case 'completed': return 'Trip completed';
      default: return 'Preparing trip';
    }
  };

  // Calculate ETA based on progress
  const getETA = () => {
    const baseEta = selectedPool?.eta || 5;
    if (tripStatus === 'waiting' || tripStatus === 'on-the-way') {
      return `${Math.max(1, Math.round(baseEta * (1 - progress / 40)))} mins`;
    } else if (tripStatus === 'in-progress') {
      const remainingProgress = 100 - progress;
      const remainingMins = Math.max(1, Math.round(25 * remainingProgress / 50));
      return `${remainingMins} mins`;
    }
    return 'Arrived';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Google Map - Dynamic with real locations */}
        <View style={{ height: 256, position: 'relative' }}>
          <GoogleMapView
            center={driverPosition || pickupCoords}
            zoom={14}
            pickupLocation={pickupCoords}
            dropoffLocation={dropoffCoords}
            showDirections={true}
            markers={driverPosition ? [
              { id: 'driver', latitude: driverPosition.latitude, longitude: driverPosition.longitude, title: driver.name, icon: 'driver' },
            ] : []}
          />
          
          {/* Status Badge */}
          <View 
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: isFemale ? '#ec4899' : '#2563eb',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>{getStatusText()}</Text>
          </View>

          {/* ETA Badge */}
          {tripStatus !== 'completed' && (
            <View 
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'white',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: '#e5e7eb',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Clock className="w-4 h-4" color="#4b5563" />
              <Text style={{ fontWeight: '600' }}>{getETA()}</Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        <View className="px-6 py-4 bg-white">
          <Progress value={progress} className="h-2" />
          <View className="flex-row justify-between mt-2">
            <Text className="text-sm text-gray-500">Pickup</Text>
            <Text className="text-sm text-gray-500">Destination</Text>
          </View>
        </View>

        {/* Driver Card */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">Your Driver</Text>
          
          {hasDriver ? (
            <View className="flex-row items-center gap-4">
              <View className={`w-16 h-16 rounded-full items-center justify-center ${isFemale ? 'bg-pink-100' : 'bg-blue-100'} border-2 border-white shadow-md`}>
                <Text className={`${isFemale ? 'text-pink-800' : 'text-blue-800'} text-xl font-semibold`}>{driver.initial}</Text>
              </View>
              
              <View className="flex-1">
                <Text className="text-lg font-semibold">{driver.name}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <Star className="w-4 h-4" color="#eab308" />
                  <Text className="text-sm text-gray-600">
                    {driver.rating > 0 ? driver.rating.toFixed(1) : 'New'}
                  </Text>
                </View>
                <Text className="text-sm text-gray-500 mt-1">{driver.vehicle} • {driver.plateNumber}</Text>
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity className={`w-12 h-12 rounded-full ${accentBg} items-center justify-center`}>
                  <Phone className="w-5 h-5" color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center"
                  onPress={onChatDriver}
                >
                  <MessageCircle className="w-5 h-5" color="#4b5563" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="items-center py-4">
              <View className="w-16 h-16 rounded-full items-center justify-center bg-gray-200 mb-3">
                <User className="w-8 h-8 text-gray-400" />
              </View>
              <Text className="text-gray-600 font-medium">Waiting for driver...</Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                A driver will be assigned once the pool is ready
              </Text>
            </View>
          )}
        </View>

        {/* Pool Status Card */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold">Pool Status</Text>
              <View className="w-2 h-2 rounded-full bg-green-500" />
              <Text className="text-xs text-green-600">Live</Text>
            </View>
            <View className="flex-row items-center gap-2">
              {loadingPool && <ActivityIndicator size="small" color="#2563eb" />}
              <TouchableOpacity onPress={refreshPool} className="p-2">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </TouchableOpacity>
            </View>
          </View>
          
          {poolError ? (
            <View className="flex-row items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <Text className="text-red-500 text-sm">{poolError}</Text>
            </View>
          ) : (
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Status</Text>
                <View className={`px-2 py-1 rounded ${hasDriver ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <Text className={`text-xs font-medium ${hasDriver ? 'text-green-700' : 'text-yellow-700'}`}>
                    {poolStatus.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Passengers</Text>
                <View className="flex-row items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <Text className="font-medium">{currentPassengers}/{maxPassengers}</Text>
                </View>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Driver</Text>
                <Text className={`font-medium ${hasDriver ? 'text-green-600' : 'text-yellow-600'}`}>
                  {hasDriver ? 'Assigned' : 'Waiting for driver...'}
                </Text>
              </View>
              {lastUpdated && (
                <Text className="text-xs text-gray-400 text-right">
                  Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Co-Riders Card */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">
            Co-Riders {coRiders.length > 0 ? `(${coRiders.length})` : ''}
          </Text>
          
          {loadingPool ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-gray-500 text-sm mt-2">Loading co-riders...</Text>
            </View>
          ) : coRiders.length > 0 ? (
            <View className="gap-3">
              {coRiders.map((rider, index) => (
                <View key={rider.userId || index} className="flex-row items-center gap-3">
                  <View className={`w-10 h-10 rounded-full items-center justify-center ${isFemale ? 'bg-pink-100' : 'bg-blue-100'} border-2 border-white`}>
                    <Text className={`${isFemale ? 'text-pink-800' : 'text-blue-800'} font-semibold`}>{rider.initial}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-800 font-medium">{rider.name}</Text>
                    <Text className="text-xs text-gray-500">
                      Joined {new Date(rider.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center py-4">
              <Users className="w-8 h-8 text-gray-300 mb-2" />
              <Text className="text-gray-500 text-center">No other riders yet</Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                Waiting for more riders to join...
              </Text>
            </View>
          )}
        </View>

        {/* Route Info */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">Route</Text>
          
          <View className="gap-4">
            <View className="flex-row items-start gap-3">
              <View className="w-3 h-3 rounded-full bg-green-500 mt-1" />
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Pickup</Text>
                <Text className="font-medium">{pickupLocation?.name || 'Current Location'}</Text>
                {pickupLocation?.address && (
                  <Text className="text-xs text-gray-400" numberOfLines={1}>{pickupLocation.address}</Text>
                )}
              </View>
            </View>

            <View className="flex-row items-start gap-3">
              <View className="w-3 h-3 rounded-full bg-red-500 mt-1" />
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Drop-off</Text>
                <Text className="font-medium">{destination?.name || 'Destination'}</Text>
                {destination?.address && (
                  <Text className="text-xs text-gray-400" numberOfLines={1}>{destination.address}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Trip Details */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">Trip Details</Text>
          
          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Vehicle Type</Text>
              <Text className="font-medium">{poolDetails?.vehicle_type || selectedPool?.vehicle_type || 'N/A'}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Estimated Time</Text>
              <Text className="font-medium">{selectedPool?.eta || '~'} mins</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Fare per Person</Text>
              <Text className={`font-semibold ${accentText}`}>
                ৳ {poolDetails?.fare_per_person || selectedPool?.fare_per_person || 'Calculating...'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Destination</Text>
              <Text className="font-medium text-right flex-1 ml-4" numberOfLines={1}>
                {poolDetails?.destination_address || selectedPool?.destination_address || destination?.name || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* SOS Button */}
        {tripStatus !== 'completed' && (
          <View className="mx-6 mt-4">
            <Button
              variant="outline"
              className="w-full border-2 border-red-500"
            >
              <Text className="text-red-500 font-semibold">🚨 Emergency SOS</Text>
            </Button>
          </View>
        )}

        {/* Complete Trip Button */}
        {tripStatus === 'completed' && (
          <View className="mx-6 mt-4">
            <Button
              onPress={onComplete}
              className={`w-full ${accentBg}`}
            >
              <Text className="text-white font-semibold">Confirm Payment</Text>
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
