import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from './LinearGradient';
import { MapPin, Tag, Users, Search, ArrowRight, Star, ChevronRight, Navigation } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import DestinationSearch from './DestinationSearch';
import LocationSearch from './LocationSearch';
import GoogleMapView from './GoogleMapView';
import type { UserProfile, Destination, Location } from '../contexts/GlobalContext';
import * as ExpoLocation from 'expo-location';
import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';

type LandingPageProps = {
  userProfile: UserProfile | null;
  onDestinationSelect: (destination: Destination, rideType?: 'female-only' | 'regular') => void;
  onPickupSelect?: (location: Location) => void;
  onProfileClick: () => void;
  onFriendsClick?: () => void;
};

type Companion = {
  id: string;
  companion_id: string;
  status: string;
  companion?: {
    id: string;
    phone?: string;
    full_name?: string;
    average_rating?: number;
  };
};

type RecentRide = {
  id: string;
  dropoff_address?: string;
  dropoff_name?: string;
  fare_amount?: number;
  created_at: string;
  status: string;
};

type PromoCode = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  description?: string;
  expires_at?: string;
};

const defaultPromos = [
  {
    id: '1',
    title: '50% OFF First Ride',
    description: 'Use code: FIRST50',
    icon: '🎉',
  },
  {
    id: '2',
    title: 'Refer & Earn ৳500',
    description: 'Share with friends',
    icon: '💰',
  },
  {
    id: '3',
    title: 'Pool Rides - Save More',
    description: 'Save up to ৳200 per ride',
    icon: '🚗',
  },
];

// Helper function to format time ago
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

export default function LandingPage({ userProfile, onDestinationSelect, onPickupSelect, onProfileClick, onFriendsClick }: LandingPageProps) {
  const [isDestinationSearchOpen, setIsDestinationSearchOpen] = useState(false);
  const [isPickupSearchOpen, setIsPickupSearchOpen] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
  const [loadingCompanions, setLoadingCompanions] = useState(true);
  const [loadingRides, setLoadingRides] = useState(true);
  
  const initials = userProfile ? `${userProfile.firstName[0]}${userProfile.lastName[0]}` : 'U';
  const isFemale = userProfile?.gender === 'female';

  const accentColors: [string, string] = isFemale ? ['#db2777', '#f43f5e'] : ['#1f2937', '#374151'];

  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Fetch Priyo Sathi companions
  const fetchCompanions = useCallback(async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: { companions: Companion[] } }>(
        API_ENDPOINTS.PRIYO_SATHI.LIST
      );
      if (response.success && response.data.companions) {
        // Only show accepted companions
        setCompanions(response.data.companions.filter(c => c.status === 'ACCEPTED'));
      }
    } catch (error) {
      console.log('[LandingPage] Error fetching companions:', error);
    } finally {
      setLoadingCompanions(false);
    }
  }, []);

  // Fetch recent rides
  const fetchRecentRides = useCallback(async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: { rides: RecentRide[] } }>(
        API_ENDPOINTS.RIDE.HISTORY,
        { limit: 5 }
      );
      if (response.success && response.data.rides) {
        setRecentRides(response.data.rides.slice(0, 3));
      }
    } catch (error) {
      console.log('[LandingPage] Error fetching recent rides:', error);
    } finally {
      setLoadingRides(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanions();
    fetchRecentRides();
  }, [fetchCompanions, fetchRecentRides]);

  // Get current location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPickupLocation({
            name: 'Current Location',
            address: 'Dhaka, Bangladesh',
            latitude: 23.8103,
            longitude: 90.4125,
          });
          return;
        }

        const location = await ExpoLocation.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        // Reverse geocode to get a proper place name
        if (GOOGLE_MAPS_API_KEY) {
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            const result = data.results?.[0];
            const address = result?.formatted_address || 'Your current position';
            
            // Extract a meaningful place name from address components
            let placeName = 'Current Location';
            if (result?.address_components) {
              const nameComponent = result.address_components.find((c: any) => 
                c.types.includes('establishment') || 
                c.types.includes('point_of_interest') ||
                c.types.includes('premise') ||
                c.types.includes('neighborhood') ||
                c.types.includes('sublocality_level_1') ||
                c.types.includes('sublocality')
              );
              if (nameComponent) {
                placeName = nameComponent.long_name;
              } else {
                const firstPart = address.split(',')[0]?.trim();
                if (firstPart && !/^\d/.test(firstPart)) {
                  placeName = firstPart;
                }
              }
            }
            
            setPickupLocation({
              name: placeName,
              address,
              latitude,
              longitude,
            });
          } catch {
            setPickupLocation({
              name: 'Current Location',
              address: 'Your current position',
              latitude,
              longitude,
            });
          }
        } else {
          setPickupLocation({
            name: 'Current Location',
            address: 'Your current position',
            latitude,
            longitude,
          });
        }
      } catch (error) {
        console.log('Location error:', error);
        setPickupLocation({
          name: 'Current Location',
          address: 'Dhaka, Bangladesh',
          latitude: 23.8103,
          longitude: 90.4125,
        });
      }
    })();
  }, []);

  const handlePickupSelect = (location: Location) => {
    setPickupLocation(location);
    onPickupSelect?.(location);
  };

  const handleDestinationSelect = (destination: Destination) => {
    setSelectedDestination(destination);
    onDestinationSelect(destination);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <LinearGradient
        colors={accentColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-6 pb-8"
      >
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-sm text-white opacity-90">Welcome back,</Text>
            <Text className="text-2xl text-white font-bold mt-1">{userProfile?.firstName || 'User'}</Text>
          </View>
          <TouchableOpacity 
            onPress={onProfileClick}
            activeOpacity={0.7}
          >
            <Avatar className="w-12 h-12 border-2 border-white">
              <AvatarFallback className={`${isFemale ? 'bg-gradient-to-br from-rose-500 to-pink-400' : 'bg-gradient-to-br from-blue-600 to-cyan-500'}`}>
                <Text className="text-white font-semibold">{initials}</Text>
              </AvatarFallback>
            </Avatar>
          </TouchableOpacity>
        </View>

        {/* Search Bar - Pickup and Destination Fields */}
        <View className="rounded-xl overflow-hidden shadow-lg bg-white/95">
          <View className="p-4">
            <View className="flex-row items-stretch gap-3">
              {/* Route indicators */}
              <View className="items-center py-2">
                <View className={`w-3 h-3 rounded-full ${isFemale ? 'bg-green-500' : 'bg-green-600'}`} />
                <View className="w-0.5 flex-1 bg-gray-300 my-1" />
                <MapPin className="w-4 h-4" color="#ef4444" />
              </View>
              
              {/* Location inputs */}
              <View className="flex-1 gap-3">
                {/* Pickup Location - Clickable */}
                <TouchableOpacity 
                  onPress={() => setIsPickupSearchOpen(true)}
                  className="py-2 border-b border-gray-200"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-gray-500 mb-1">From</Text>
                  <View className="flex-row items-center gap-2">
                    <Navigation className="w-4 h-4" color="#22c55e" />
                    <Text className="text-gray-900 font-medium" numberOfLines={1}>
                      {pickupLocation?.name || 'Select pickup location'}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {/* Destination - Clickable */}
                <TouchableOpacity 
                  onPress={() => setIsDestinationSearchOpen(true)}
                  className="py-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-gray-500 mb-1">To</Text>
                  <View className="flex-row items-center gap-2">
                    <MapPin className="w-4 h-4" color="#ef4444" />
                    <Text className={selectedDestination ? 'text-gray-900 font-medium' : 'text-gray-400'} numberOfLines={1}>
                      {selectedDestination?.name || 'Where to?'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              
              {/* Search icon */}
              <TouchableOpacity 
                onPress={() => setIsDestinationSearchOpen(true)}
                className="justify-center pl-2"
              >
                <Search className="w-5 h-5" color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Map Preview Section - Dynamic based on pickup/destination */}
      <View style={mapStyles.mapContainer}>
        <GoogleMapView
          center={pickupLocation ? { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude } : undefined}
          zoom={selectedDestination ? 12 : 15}
          pickupLocation={pickupLocation ? { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude } : undefined}
          dropoffLocation={selectedDestination?.latitude && selectedDestination?.longitude ? { latitude: selectedDestination.latitude, longitude: selectedDestination.longitude } : undefined}
          showDirections={!!(pickupLocation && selectedDestination?.latitude)}
          style={mapStyles.map}
        />
        <View style={mapStyles.mapOverlay}>
          <TouchableOpacity 
            onPress={() => setIsDestinationSearchOpen(true)}
            style={mapStyles.mapSearchButton}
          >
            <Search className="w-5 h-5" color="#6b7280" />
            <Text style={mapStyles.mapSearchText}>Where to?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="pb-20">
          {/* Priyo Sathi (Close Friends) */}
          <View className="p-6 gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Users className="w-5 h-5" color="#000" />
                <Text className="text-lg font-semibold">Priyo Sathi</Text>
              </View>
              <TouchableOpacity 
                className="flex-row items-center gap-1" 
                activeOpacity={0.7}
                onPress={onFriendsClick}
              >
                <Text className="text-sm text-blue-600 font-medium">See All</Text>
                <ChevronRight className="w-4 h-4" color="#2563eb" />
              </TouchableOpacity>
            </View>

            {loadingCompanions ? (
              <View className="h-24 items-center justify-center">
                <ActivityIndicator size="small" color={isFemale ? '#db2777' : '#374151'} />
              </View>
            ) : companions.length === 0 ? (
              <TouchableOpacity 
                onPress={onFriendsClick}
                className="bg-gray-50 rounded-xl p-4 items-center"
                activeOpacity={0.7}
              >
                <Users className="w-8 h-8 mb-2" color="#9ca3af" />
                <Text className="text-gray-500 text-center">No Priyo Sathi yet</Text>
                <Text className="text-sm text-blue-600 mt-1">Add friends to pool together</Text>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                <View className="flex-row gap-3">
                  {companions.slice(0, 5).map((companion, index) => {
                    const name = companion.companion?.full_name || companion.companion?.phone || 'Friend';
                    const initial = name[0]?.toUpperCase() || '?';
                    return (
                      <TouchableOpacity
                        key={companion.id}
                        activeOpacity={0.7}
                        className="w-40 mr-3"
                      >
                        <View className="rounded-xl p-4 flex-row items-center gap-3">
                          <View className="relative">
                            <View
                              className="w-16 h-16 rounded-full items-center justify-center bg-gray-300 border-2 border-white shadow-md"
                            >
                              <Text className="text-gray-800 text-lg font-semibold">{initial}</Text>
                            </View>
                          </View>
                          <View className="flex-1">
                            <Text className="text-lg font-medium" numberOfLines={1} ellipsizeMode="tail">{name}</Text>
                            {companion.companion?.average_rating && (
                              <Text className="text-sm text-gray-500">⭐ {companion.companion.average_rating.toFixed(1)}</Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Offers & Promos */}
          <View className="px-6 pb-6 gap-4">
            <View className="flex-row items-center gap-2">
              <Tag className="w-5 h-5" color="#000" />
              <Text className="text-lg font-semibold">Offers & Promos</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled className="-mx-6 px-6">
              <View className="flex-row gap-3">
                {defaultPromos.map((promo) => (
                  <TouchableOpacity key={promo.id} activeOpacity={0.9} style={{ width: Dimensions.get('window').width - 48 }}>
                    <View className="rounded-xl p-4 bg-gray-100">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                          <Text className="text-3xl">{promo.icon}</Text>
                          <View>
                            <Text className="text-gray-800 font-semibold" numberOfLines={1} ellipsizeMode="tail">{promo.title}</Text>
                            <Text className="text-gray-600 text-sm mt-1" numberOfLines={1} ellipsizeMode="tail">{promo.description}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Recent Rides */}
          <View className="px-6 pb-6 gap-4">
            <Text className="text-lg font-semibold">Recent Rides</Text>
            
            {loadingRides ? (
              <View className="h-24 items-center justify-center">
                <ActivityIndicator size="small" color={isFemale ? '#db2777' : '#374151'} />
              </View>
            ) : recentRides.length === 0 ? (
              <View className="bg-gray-50 rounded-xl p-4 items-center">
                <MapPin className="w-8 h-8 mb-2" color="#9ca3af" />
                <Text className="text-gray-500 text-center">No rides yet</Text>
                <Text className="text-sm text-gray-400 mt-1">Your ride history will appear here</Text>
              </View>
            ) : (
              <View className="gap-3">
                {recentRides.map((ride) => {
                  const timeAgo = getTimeAgo(ride.created_at);
                  return (
                    <TouchableOpacity key={ride.id} className="bg-gray-50 rounded-xl p-4" activeOpacity={0.9}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 mb-2">
                            <MapPin className={`w-4 h-4 ${isFemale ? 'text-rose-500' : 'text-gray-800'}`} />
                            <Text className="font-medium" numberOfLines={1}>
                              {ride.dropoff_name || ride.dropoff_address || 'Destination'}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-4">
                            <Text className="text-sm text-gray-500">{timeAgo}</Text>
                            {ride.fare_amount && (
                              <>
                                <Text className="text-gray-500">•</Text>
                                <Text className="text-sm text-gray-500">৳{ride.fare_amount}</Text>
                              </>
                            )}
                          </View>
                        </View>
                        <ChevronRight className="w-5 h-5" color="#9ca3af" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Destination Search Modal */}
      <DestinationSearch
        isOpen={isDestinationSearchOpen}
        onClose={() => setIsDestinationSearchOpen(false)}
        onSelectDestination={handleDestinationSelect}
      />

      {/* Pickup Location Search Modal */}
      <LocationSearch
        isOpen={isPickupSearchOpen}
        onClose={() => setIsPickupSearchOpen(false)}
        onSelectLocation={handlePickupSelect}
        title="Select Pickup Location"
        placeholder="Search pickup location..."
        type="pickup"
      />
    </SafeAreaView>
  );
}

const mapStyles = StyleSheet.create({
  mapContainer: {
    height: 200,
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  mapSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapSearchText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});
