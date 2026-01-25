import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Phone, MessageCircle, User, Navigation, Clock, Star, Users, AlertCircle, RefreshCw, Plus, X } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import GoogleMapView from './GoogleMapView';
import type { UserProfile, Location, Destination, Pool } from '../contexts/GlobalContext';
import { usePoolRealtime } from '../hooks/usePoolRealtime';
import { poolService } from '../services/pool.service';

const INITIAL_LOOKUP_SECONDS = 30;
const EXTENDED_LOOKUP_SECONDS = 10;
// Threshold in seconds - if pool is older than this, never show the timer
const TIMER_EXPIRY_THRESHOLD_SECONDS = 45;

type LookupPhase = 'initial' | 'extended' | 'no-match' | 'matched';

type TripProgressProps = {
  userProfile: UserProfile | null;
  pickupLocation?: Location | null;
  destination?: Destination | null;
  selectedPool?: Pool | null;
  onComplete?: () => void;
  onChatDriver?: () => void;
  onChatCoRider?: (userId: string, userName: string) => void;
  onCreateNewPool?: () => void;
  onCancelPool?: () => void;
  onPoolCancelled?: () => void;
};

export default function TripProgress({ userProfile, pickupLocation, destination, selectedPool, onComplete, onChatDriver, onChatCoRider, onCreateNewPool, onCancelPool, onPoolCancelled }: TripProgressProps) {
  const [progress, setProgress] = useState(15);
  const [tripStatus, setTripStatus] = useState<'waiting' | 'on-the-way' | 'arrived' | 'in-progress' | 'completed'>('waiting');
  const [driverPosition, setDriverPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Use ref to track if we've initialized - survives across re-renders but not remounts
  // Combined with the created_at check, this ensures we never restart the timer on navigation
  const hasInitializedRef = useRef(false);
  
  // Calculate initial lookup phase based on pool creation time - this runs on every mount
  // but the logic ensures we never show timer for old pools
  const getInitialLookupPhase = (): { phase: LookupPhase; seconds: number } => {
    // If pool has been around for more than the threshold, never show timer
    if (selectedPool?.created_at) {
      const poolCreatedAt = new Date(selectedPool.created_at).getTime();
      const elapsedSeconds = (Date.now() - poolCreatedAt) / 1000;
      
      // Pool is old enough that timer should never be shown
      if (elapsedSeconds > TIMER_EXPIRY_THRESHOLD_SECONDS) {
        return { phase: 'matched', seconds: 0 };
      }
    }
    // For fresh pools, start with 'matched' and let the useEffect handle proper initialization
    return { phase: 'matched', seconds: 0 };
  };
  
  const initialState = getInitialLookupPhase();
  const [lookupPhase, setLookupPhase] = useState<LookupPhase>(initialState.phase);
  const [remainingSeconds, setRemainingSeconds] = useState(initialState.seconds);
  const [isExtendedSearching, setIsExtendedSearching] = useState(false);
  
  // Use real-time pool updates
  const {
    pool: poolDetails,
    coRiders,
    hasDriver,
    poolStatus,
    loading: loadingPool,
    error: poolError,
    lastUpdated,
    isConnected,
    refresh: refreshPool,
    clearUnreadMessages,
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
  
  // Check if current user is the pool creator
  const isPoolCreator = selectedPool?.creator_user_id === userProfile?.id;

  // Update trip status based on pool status from realtime updates
  useEffect(() => {
    if (poolStatus === 'WAITING_FOR_RIDERS') {
      setTripStatus('waiting');
    } else if (poolStatus === 'WAITING_FOR_DRIVER') {
      setTripStatus('waiting');
    } else if (poolStatus === 'READY_TO_START') {
      setTripStatus('on-the-way');
    } else if (poolStatus === 'STARTED') {
      setTripStatus('in-progress');
    } else if (poolStatus === 'COMPLETED') {
      setTripStatus('completed');
    }
  }, [poolStatus]);
  
  // Handle pool cancellation (e.g., when all other riders left)
  useEffect(() => {
    if (poolStatus === 'CANCELLED' && onPoolCancelled) {
      Alert.alert(
        'Pool Cancelled',
        'Your pool was cancelled because all other riders left. You will be redirected to the home screen.',
        [
          {
            text: 'OK',
            onPress: () => {
              onPoolCancelled();
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [poolStatus, onPoolCancelled]);
  
  // Initialize lookup phase based on pool state - only runs once when pool data is loaded
  useEffect(() => {
    // Skip if we've already initialized (using ref to persist across remounts of same pool)
    if (hasInitializedRef.current || loadingPool || !selectedPool?.id) {
      return;
    }
    
    // CRITICAL: First check pool creation time - if pool is old, NEVER show timer
    // This is the main fix to prevent timer from restarting on navigation
    if (selectedPool?.created_at) {
      const poolCreatedAt = new Date(selectedPool.created_at).getTime();
      const elapsedSeconds = (Date.now() - poolCreatedAt) / 1000;
      
      // If pool is older than threshold, skip timer entirely
      if (elapsedSeconds > TIMER_EXPIRY_THRESHOLD_SECONDS) {
        console.log('[TripProgress] Pool is older than threshold, skipping timer');
        setLookupPhase('matched');
        hasInitializedRef.current = true;
        return;
      }
    }
    
    // If pool is already matched (has multiple passengers, driver, or past waiting phase), don't start timer
    if (currentPassengers > 1 || hasDriver || 
        poolStatus === 'WAITING_FOR_DRIVER' || 
        poolStatus === 'READY_TO_START' ||
        poolStatus === 'STARTED' ||
        poolStatus === 'COMPLETED' ||
        poolStatus === 'CANCELLED') {
      setLookupPhase('matched');
      hasInitializedRef.current = true;
      return;
    }
    
    // Only the pool creator should see the lookup timer for a new pool
    // Non-creators (joiners) who are already in the pool shouldn't see search timer
    if (!isPoolCreator) {
      setLookupPhase('matched');
      hasInitializedRef.current = true;
      return;
    }
    
    // For pools within the threshold window, calculate remaining time
    if (selectedPool?.created_at) {
      const poolCreatedAt = new Date(selectedPool.created_at).getTime();
      const elapsedSeconds = (Date.now() - poolCreatedAt) / 1000;
      
      // If more than 30 seconds, we're in extended phase
      if (elapsedSeconds > INITIAL_LOOKUP_SECONDS) {
        const extendedRemaining = Math.max(0, INITIAL_LOOKUP_SECONDS + EXTENDED_LOOKUP_SECONDS - elapsedSeconds);
        if (extendedRemaining <= 0) {
          setLookupPhase('no-match');
          setRemainingSeconds(0);
        } else {
          setLookupPhase('extended');
          setRemainingSeconds(Math.ceil(extendedRemaining));
          setIsExtendedSearching(true);
        }
        hasInitializedRef.current = true;
        return;
      }
      
      // We're in initial phase, calculate remaining time
      const initialRemaining = Math.max(0, INITIAL_LOOKUP_SECONDS - elapsedSeconds);
      if (initialRemaining > 0) {
        setLookupPhase('initial');
        setRemainingSeconds(Math.ceil(initialRemaining));
      } else {
        setLookupPhase('matched');
      }
      hasInitializedRef.current = true;
    } else {
      // No created_at timestamp - this shouldn't happen, default to matched
      setLookupPhase('matched');
      hasInitializedRef.current = true;
    }
  }, [loadingPool, selectedPool?.id, selectedPool?.created_at, currentPassengers, hasDriver, poolStatus, isPoolCreator]);

  // Calculate progress based on pool status
  const getProgress = () => {
    switch (tripStatus) {
      case 'waiting': return 15;
      case 'on-the-way': return 35;
      case 'arrived': return 50;
      case 'in-progress': return 75;
      case 'completed': return 100;
      default: return 0;
    }
  };

  useEffect(() => {
    setProgress(getProgress());
  }, [tripStatus]);

  // Lookup timer - 30 seconds initial, then 10 seconds extended search
  useEffect(() => {
    // Don't run timer until initialization is complete
    if (!hasInitializedRef.current) {
      return;
    }
    
    // Skip if already matched (has other riders or driver)
    if (currentPassengers > 1 || hasDriver || poolStatus === 'WAITING_FOR_DRIVER' || poolStatus === 'READY_TO_START') {
      setLookupPhase('matched');
      return;
    }

    // Skip if pool is cancelled or completed
    if (poolStatus === 'CANCELLED' || poolStatus === 'COMPLETED') {
      return;
    }

    // Only run timer during active search phases (initial or extended)
    if (lookupPhase === 'no-match' || lookupPhase === 'matched') {
      return;
    }
    
    // Don't run if remainingSeconds is 0
    if (remainingSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (lookupPhase === 'initial') {
            // Initial 30 seconds expired - start extended search
            setLookupPhase('extended');
            setIsExtendedSearching(true);
            // Trigger extended search with wider range (handled by server)
            // Only call if pool is still accepting riders and user is creator
            if (selectedPool?.id && poolStatus === 'WAITING_FOR_RIDERS' && isPoolCreator) {
              poolService.extendPoolSearch(selectedPool.id).catch((err) => {
                console.log('[TripProgress] Extended search skipped:', err.message);
              });
            }
            return EXTENDED_LOOKUP_SECONDS;
          } else if (lookupPhase === 'extended') {
            // Extended 10 seconds expired - no match found
            setLookupPhase('no-match');
            setIsExtendedSearching(false);
            clearInterval(timer);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lookupPhase, currentPassengers, hasDriver, poolStatus, selectedPool?.id, remainingSeconds, isPoolCreator]);

  // Watch for new riders joining
  useEffect(() => {
    if (currentPassengers > 1 && lookupPhase !== 'matched') {
      setLookupPhase('matched');
    }
  }, [currentPassengers, lookupPhase]);

  const handleCreateNewPool = useCallback(() => {
    if (onCreateNewPool) {
      onCreateNewPool();
    }
  }, [onCreateNewPool]);

  const handleCancelPool = useCallback(() => {
    Alert.alert(
      'Cancel Pool',
      'Are you sure you want to cancel and leave this pool?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (onCancelPool) {
              setIsCancelling(true);
              await onCancelPool();
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  }, [onCancelPool]);

  const getStatusText = () => {
    switch (tripStatus) {
      case 'waiting': return hasDriver ? 'Driver assigned' : 'Waiting for riders...';
      case 'on-the-way': return 'Driver is on the way';
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
        {/* Google Map - Shows real locations only, no simulation */}
        <View style={{ height: 256, position: 'relative' }}>
          <GoogleMapView
            center={pickupCoords}
            zoom={14}
            pickupLocation={pickupCoords}
            dropoffLocation={dropoffCoords}
            showDirections={true}
            markers={[]}
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

        {/* Lookup Timer Card - Only show during waiting phase */}
        {(lookupPhase === 'initial' || lookupPhase === 'extended') && poolStatus === 'WAITING_FOR_RIDERS' && (
          <View className="mx-6 mt-4 bg-blue-50 rounded-2xl p-5 border-2 border-blue-200">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Clock className="w-5 h-5" color="#2563eb" />
                <Text className="font-semibold text-blue-800">
                  {lookupPhase === 'initial' ? 'Searching for Riders' : 'Extended Search'}
                </Text>
              </View>
              <View className="bg-blue-600 px-3 py-1 rounded-full">
                <Text className="text-white font-bold">{remainingSeconds}s</Text>
              </View>
            </View>
            
            <Text className="text-blue-700 text-sm">
              {lookupPhase === 'initial' 
                ? 'Your pool is visible to nearby users with similar routes...'
                : 'Searching in wider area for potential riders...'}
            </Text>
            
            {isExtendedSearching && (
              <View className="flex-row items-center gap-2 mt-2">
                <ActivityIndicator size="small" color="#2563eb" />
                <Text className="text-blue-600 text-xs">Expanding search range...</Text>
              </View>
            )}
          </View>
        )}

        {/* No Match Card - Show when no one joined after extended search */}
        {lookupPhase === 'no-match' && (
          <View className="mx-6 mt-4 bg-yellow-50 rounded-2xl p-5 border-2 border-yellow-300">
            <View className="items-center py-4">
              <Users className="w-12 h-12 text-yellow-600 mb-3" />
              <Text className="text-lg font-semibold text-yellow-800 text-center">No Riders Found</Text>
              <Text className="text-yellow-700 text-sm text-center mt-2">
                No one joined your pool within the search time. You can try creating a new pool or wait for a driver.
              </Text>
              
              <TouchableOpacity
                onPress={handleCreateNewPool}
                className="mt-4 bg-blue-600 rounded-xl px-6 py-3 flex-row items-center gap-2"
                style={{
                  shadowColor: '#2563eb',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Plus className="w-5 h-5" color="white" />
                <Text className="text-white font-semibold">Create New Pool</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
              <View className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <Text className={`text-xs ${isConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                {isConnected ? 'Live' : 'Connecting...'}
              </Text>
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
                    <View className="flex-row items-center gap-2">
                      <Text className="text-gray-800 font-medium">{rider.name}</Text>
                      {rider.hasUnreadMessages && (
                        <View className="w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </View>
                    <Text className="text-xs text-gray-500">
                      Joined {new Date(rider.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {/* Chat button for co-rider with unread badge */}
                  <TouchableOpacity 
                    className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                    onPress={() => {
                      clearUnreadMessages(rider.userId);
                      onChatCoRider?.(rider.userId, rider.name);
                    }}
                    style={{ position: 'relative' }}
                  >
                    <MessageCircle className="w-5 h-5" color={rider.hasUnreadMessages ? '#2563eb' : '#4b5563'} />
                    {rider.hasUnreadMessages && (
                      <View 
                        style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#ef4444',
                          borderWidth: 2,
                          borderColor: 'white',
                        }}
                      />
                    )}
                  </TouchableOpacity>
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
              <Text className="font-medium">
                {poolDetails?.score_breakdown?.base_duration_minutes 
                  ? `${Math.round(poolDetails.score_breakdown.base_duration_minutes)} mins`
                  : selectedPool?.eta 
                    ? `${selectedPool.eta} mins` 
                    : 'Calculating...'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Fare per Person</Text>
              <Text className={`font-semibold ${accentText}`}>
                ৳ {poolDetails?.fare_per_person 
                  ? Math.round(poolDetails.fare_per_person) 
                  : selectedPool?.fare_per_person 
                    ? Math.round(selectedPool.fare_per_person as number)
                    : 'Calculating...'}
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

        {/* Cancel Pool Button - Only show during waiting phase (before trip starts) */}
        {(tripStatus === 'waiting' || tripStatus === 'on-the-way') && poolStatus !== 'STARTED' && (
          <View className="mx-6 mt-4">
            <TouchableOpacity
              onPress={handleCancelPool}
              disabled={isCancelling}
              className="w-full py-4 rounded-xl border-2 border-gray-300 bg-white flex-row items-center justify-center"
              style={{
                opacity: isCancelling ? 0.6 : 1,
              }}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#6b7280" />
              ) : (
                <>
                  <X className="w-5 h-5 mr-2" color="#6b7280" />
                  <Text className="text-gray-600 font-semibold">Cancel & Leave Pool</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

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
