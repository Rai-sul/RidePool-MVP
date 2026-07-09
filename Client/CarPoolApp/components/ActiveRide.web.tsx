import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native-web';
import { MapPin, Shield, Phone, Share2, Navigation, Clock, RefreshCw, Users, AlertCircle } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import GoogleMapView from './GoogleMapView';
import type { Pool, Location } from '../types';
import { usePoolRealtime } from '../hooks/usePoolRealtime';

type ActiveRideProps = {
  pool: Pool | null;
  destination: Location | null;
  pickupLocation?: Location | null;
  userId?: string | null;
  onComplete: () => void;
};

export default function ActiveRide({ pool, destination, pickupLocation, userId, onComplete }: ActiveRideProps) {
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
  } = usePoolRealtime(pool?.id || null, userId || null);

  // Calculate progress based on pool status
  const getProgress = () => {
    switch (poolStatus) {
      case 'WAITING_FOR_RIDERS': return 15;
      case 'WAITING_FOR_DRIVER': return 30;
      case 'READY_TO_START': return 50;
      case 'STARTED': return 75;
      case 'COMPLETED': return 100;
      default: return 0;
    }
  };

  // Calculate ETA based on pool data
  const eta = (pool as any)?.eta || 15;

  // Use actual pickup location or default
  const pickupCoords = pickupLocation 
    ? { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude }
    : { latitude: 23.8103, longitude: 90.4125 };
  
  // Use actual destination or default
  const dropoffCoords = destination?.latitude && destination?.longitude
    ? { latitude: destination.latitude, longitude: destination.longitude }
    : { latitude: 23.82, longitude: 90.43 };

  if (!pool || !destination) return null;

  return (
    <View className="h-full w-full flex flex-col bg-white">
      {/* Map View with real locations */}
      <View className="flex-1 relative">
        <GoogleMapView
          center={pickupCoords}
          zoom={14}
          pickupLocation={pickupCoords}
          dropoffLocation={dropoffCoords}
          showDirections={true}
          markers={[]}
        />
        {/* Pool Status Overlay */}
        <View 
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: '#2563eb',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>
            {poolStatus === 'STARTED' ? 'Trip in progress' : poolStatus.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View className="bg-white rounded-t-3xl shadow-2xl">
        <View className="p-6 space-y-5">
          {/* Driver Info */}
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
                  {poolDetails?.driver?.id?.charAt(0).toUpperCase() || pool.driver?.id?.charAt(0).toUpperCase() || 'D'}
                </AvatarFallback>
              </Avatar>
              <View>
                <Text className="font-medium">{hasDriver ? 'Driver' : 'Waiting for driver...'}</Text>
                <Text className="text-sm text-gray-500">{poolDetails?.vehicles?.model || pool.vehicles?.model || pool.vehicle_type}</Text>
              </View>
            </View>
            <View className="flex flex-row items-center gap-2">
              {loadingPool && <ActivityIndicator size="small" color="#2563eb" />}
              <Button variant="ghost" size="icon" onClick={refreshPool}>
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </Button>
            </View>
          </View>

          {/* ETA */}
          <View className="bg-blue-50 p-4 rounded-xl flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <View>
                <Text className="text-sm text-gray-600">Your ETA</Text>
                <Text className="text-xl font-semibold">{eta} min</Text>
              </View>
            </View>
            <View>
              <Text className="text-sm text-gray-600 text-right">Destination</Text>
              <Text className="text-sm text-right">{destination.address || 'Destination'}</Text>
            </View>
          </View>

          {/* Pool Status */}
          <View className="bg-gray-50 p-4 rounded-xl">
            <View className="flex flex-row items-center justify-between mb-2">
              <View className="flex flex-row items-center gap-2">
                <Text className="font-medium">Pool Status</Text>
                <View className="w-2 h-2 rounded-full bg-green-500" />
                <Text className="text-xs text-green-600">Live</Text>
              </View>
            </View>
            {poolError ? (
              <View className="flex flex-row items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <Text className="text-red-500 text-sm">{poolError}</Text>
              </View>
            ) : (
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <Text className="text-sm text-gray-600">
                    {poolDetails?.current_passengers || pool.current_passengers || 1}/{poolDetails?.max_passengers || pool.max_passengers || 4} passengers
                  </Text>
                </View>
                <Text className={`text-sm font-medium ${hasDriver ? 'text-green-600' : 'text-yellow-600'}`}>
                  {hasDriver ? 'Driver assigned' : 'Waiting for driver'}
                </Text>
              </View>
            )}
            {lastUpdated && (
              <Text className="text-xs text-gray-400 mt-2">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            )}
          </View>

          {/* Trip Progress */}
          <View className="space-y-3">
            <View className="flex flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">Trip Progress</Text>
              <Text className="text-sm">{getProgress()}%</Text>
            </View>
            <Progress value={getProgress()} className="h-2" />
            
            <View className="flex flex-row items-center justify-between">
              <Text className="text-xs text-gray-500">Waiting</Text>
              <Text className="text-xs text-gray-500">Driver Assigned</Text>
              <Text className="text-xs text-gray-500">In Progress</Text>
              <Text className="text-xs text-gray-500">Completed</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex flex-row gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-12 gap-2 active:scale-95 transition-transform">
              <Shield className="w-5 h-5" />
              Trip Status
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 active:scale-95 transition-transform">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 active:scale-95 transition-transform">
              <Share2 className="w-5 h-5" />
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}
