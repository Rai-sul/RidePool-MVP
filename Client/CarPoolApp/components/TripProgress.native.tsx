import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContext } from '@react-navigation/native';
import { MapPin, Phone, MessageCircle, User, Navigation, Clock, Star, Users, AlertCircle, RefreshCw, Plus, X, Route } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import GoogleMapView from './GoogleMapView';
import type { UserProfile, Location, Destination, Pool } from '../contexts/GlobalContext';
import { usePoolRealtime } from '../hooks/usePoolRealtime';
import { poolService, CombinedRouteResponse, CombinedRouteWaypoint, NavigationLinkResponse, SearchTiming } from '../services/pool.service';

// Search phase derived from server timing
type SearchPhase = 'initial' | 'extended' | 'expired' | 'completed';

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

// Wrapper component that safely checks navigation context before rendering TripProgress
// This prevents crashes when React 19 concurrent re-renders temporarily lose navigation context
function SafeTripProgress(props: TripProgressProps) {
  const navigationContext = useContext(NavigationContext);
  
  // If navigation context is unavailable, show loading state
  // This can happen during Supabase realtime-triggered concurrent re-renders
  if (navigationContext === undefined || navigationContext === null) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-gray-500">Loading trip...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return <TripProgressInner {...props} />;
}

function TripProgressInner({ userProfile, pickupLocation, destination, selectedPool, onComplete, onChatDriver, onChatCoRider, onCreateNewPool, onCancelPool, onPoolCancelled }: TripProgressProps) {
  // Double-check navigation context to prevent errors during concurrent re-renders
  // React 19 can lose context mid-render when realtime events trigger state updates
  const navigationContext = useContext(NavigationContext);
  
  const [progress, setProgress] = useState(15);
  const [tripStatus, setTripStatus] = useState<'waiting' | 'on-the-way' | 'arrived' | 'in-progress' | 'completed'>('waiting');
  const [driverPosition, setDriverPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Search countdown state - calculated from pool.created_at
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [searchPhase, setSearchPhase] = useState<SearchPhase>('initial');

  // Combined smart route state - fetched when pool status is WAITING_FOR_DRIVER or beyond
  const [combinedRoute, setCombinedRoute] = useState<CombinedRouteResponse | null>(null);
  const [loadingCombinedRoute, setLoadingCombinedRoute] = useState(false);
  const [combinedRouteError, setCombinedRouteError] = useState<string | null>(null);

  // Navigation link state - FREE Google Maps navigation
  const [navigationLink, setNavigationLink] = useState<NavigationLinkResponse | null>(null);
  const [loadingNavLink, setLoadingNavLink] = useState(false);
  
  // Track previous pool status to detect changes
  const prevPoolStatusRef = useRef<string | null>(null);
  // Track the last fetched status to know when to refetch
  const lastFetchedStatusRef = useRef<string | null>(null);
  // Track pool update time to detect membership changes
  const lastPoolUpdateRef = useRef<string | null>(null);
  // Track route fetch trigger (incremented to force refetch)
  const [routeFetchTrigger, setRouteFetchTrigger] = useState(0);

  // Use real-time pool updates
  const {
    pool: poolDetails,
    members,
    searchTiming,
    coRiders,
    hasDriver,
    poolStatus,
    poolCancelled,
    loading: loadingPool,
    error: poolError,
    lastUpdated,
    isConnected,
    refresh: refreshPool,
    clearUnreadMessages,
  } = usePoolRealtime(selectedPool?.id || null, userProfile?.id || null, selectedPool as any);

  // Use the current member's ride info (server source of truth) for per-user trip details
  const currentMemberRide = useMemo(() => {
    const poolMembers = (poolDetails?.pool_members || members || []) as Array<{
      user_id: string;
      ride?: {
        pickup_lat?: number;
        pickup_lng?: number;
        dropoff_lat?: number;
        dropoff_lng?: number;
        pickup_address?: string;
        dropoff_address?: string;
      };
    }>;
    return poolMembers.find(m => m.user_id === userProfile?.id)?.ride || null;
  }, [poolDetails?.pool_members, members, userProfile?.id]);

  // Pool status info
  const currentPassengers = poolDetails?.current_passengers || selectedPool?.current_passengers || 1;
  const maxPassengers = poolDetails?.max_passengers || selectedPool?.max_passengers || 3;
  const hasStableMemberCount =
    typeof poolDetails?.current_passengers === 'number' &&
    typeof selectedPool?.current_passengers === 'number'
      ? poolDetails.current_passengers === selectedPool.current_passengers
      : true;

  const displayEtaMinutes = hasStableMemberCount
    ? (selectedPool?.eta ?? (poolDetails?.base_duration_minutes ?? undefined))
    : (poolDetails?.base_duration_minutes ?? selectedPool?.eta);

  const displayFare = currentMemberRide?.fare
    ?? (hasStableMemberCount
      ? (selectedPool?.fare_per_person ?? poolDetails?.fare_per_person ?? undefined)
      : (poolDetails?.fare_per_person ?? selectedPool?.fare_per_person ?? undefined));

  // Reset fetch status when pool status changes (forces refetch)
  // This MUST run before the fetch effect
  useEffect(() => {
    if (prevPoolStatusRef.current !== poolStatus) {
      console.log(`[TripProgress] Pool status changed: ${prevPoolStatusRef.current} -> ${poolStatus}`);
      lastFetchedStatusRef.current = null; // Reset to force refetch
      prevPoolStatusRef.current = poolStatus;
      // Clear existing route when status changes to ensure fresh data
      if (poolStatus === 'WAITING_FOR_DRIVER') {
        setCombinedRoute(null);
        setRouteFetchTrigger(prev => prev + 1);
      }
    }
  }, [poolStatus]);

  // Detect pool membership changes via updated_at and refetch route
  useEffect(() => {
    const poolUpdatedAt = poolDetails?.updated_at;
    if (poolUpdatedAt && lastPoolUpdateRef.current && poolUpdatedAt !== lastPoolUpdateRef.current) {
      console.log(`[TripProgress] Pool updated, refetching route...`);
      // Pool was updated (member joined/left), clear and refetch route
      setCombinedRoute(null);
      lastFetchedStatusRef.current = null;
      setRouteFetchTrigger(prev => prev + 1);
    }
    lastPoolUpdateRef.current = poolUpdatedAt || null;
  }, [poolDetails?.updated_at]);

  // Fetch combined route and navigation link when pool status is valid
  // Includes retry logic to handle race conditions with server pre-calculation
  useEffect(() => {
    const validStatuses = ['WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED'];
    
    // Skip if no pool or invalid status
    if (!selectedPool?.id || !validStatuses.includes(poolStatus)) {
      return;
    }

    // Only fetch if we haven't already fetched for this status OR route is missing
    if (lastFetchedStatusRef.current === poolStatus && combinedRoute) {
      return;
    }

    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    let isMounted = true;
    let isRetrying = false;

    const fetchData = async () => {
      if (!isMounted) return;

      setLoadingCombinedRoute(true);
      setLoadingNavLink(true);
      setCombinedRouteError(null);
      isRetrying = false;

      try {
        console.log(`[TripProgress] Fetching combined route for pool ${selectedPool.id} (attempt ${retryCount + 1})`);
        const routeResponse = await poolService.getCombinedRoute(selectedPool.id, driverPosition || undefined);
        
        if (!isMounted) return;

        if (routeResponse.success && routeResponse.data) {
          const waypointCount = routeResponse.data.waypoints?.length || 0;
          const hasValidRoute = waypointCount >= 2 && routeResponse.data.route?.coordinates?.length > 0;
          
          if (hasValidRoute) {
            setCombinedRoute(routeResponse.data);
            lastFetchedStatusRef.current = poolStatus;
            console.log('[TripProgress] Combined route loaded:', {
              waypoints: waypointCount,
              coordinates: routeResponse.data.route?.coordinates?.length,
            });
          } else if (retryCount < MAX_RETRIES) {
            console.log(`[TripProgress] Route incomplete, retrying...`);
            retryCount++;
            isRetrying = true;
            setTimeout(fetchData, RETRY_DELAY_MS);
            return;
          } else {
            // Use whatever we got after max retries
            setCombinedRoute(routeResponse.data);
            lastFetchedStatusRef.current = poolStatus;
            console.warn('[TripProgress] Max retries, using incomplete route');
          }
        } else if (retryCount < MAX_RETRIES) {
          console.log(`[TripProgress] Route fetch failed, retrying...`);
          retryCount++;
          isRetrying = true;
          setTimeout(fetchData, RETRY_DELAY_MS);
          return;
        } else {
          setCombinedRouteError('Failed to load route');
        }

        // Fetch navigation link
        if (isMounted) {
          const navResponse = await poolService.getNavigationLink(selectedPool.id);
          if (isMounted && navResponse.success && navResponse.data) {
            setNavigationLink(navResponse.data);
          }
        }

      } catch (error) {
        console.error('[TripProgress] Error fetching route:', error);
        if (retryCount < MAX_RETRIES && isMounted) {
          retryCount++;
          isRetrying = true;
          setTimeout(fetchData, RETRY_DELAY_MS);
          return;
        }
        setCombinedRouteError('Error loading route');
      }
      
      // Clear loading state after fetch completes (not retrying)
      if (isMounted && !isRetrying) {
        setLoadingCombinedRoute(false);
        setLoadingNavLink(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      // Reset loading on cleanup to prevent stuck state
      setLoadingCombinedRoute(false);
      setLoadingNavLink(false);
    };
  }, [selectedPool?.id, poolStatus, routeFetchTrigger]);

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
    name: poolDetails?.driver?.full_name || selectedPool?.driverName || 'Driver',
    initial: (poolDetails?.driver?.full_name || selectedPool?.driverName || 'D').charAt(0).toUpperCase(),
    rating: poolDetails?.driver?.average_rating || selectedPool?.rating || 0,
    trips: 0,
    vehicle: poolDetails?.vehicles?.model || selectedPool?.carModel || selectedPool?.vehicle_type || 'N/A',
    plateNumber: poolDetails?.vehicles?.vehicle_number || selectedPool?.licensePlate || 'N/A',
    eta: `${selectedPool?.eta || 5} mins`,
    phone: ''
  };

  // Check if current user is the pool creator
  const isPoolCreator = selectedPool?.creator_user_id === userProfile?.id;

  // Constants for search timing (server is source of truth)
  const INITIAL_SECONDS = searchTiming?.initialSeconds ?? 30;
  const TOTAL_SECONDS = searchTiming?.totalSeconds ?? 40;

  // Calculate search phase and remaining seconds from pool.created_at
  // This is the single source of truth - always calculated from creation time
  const calculateTimingFromCreatedAt = useCallback(() => {
    if (!selectedPool?.created_at) {
      return { phase: 'initial' as SearchPhase, remainingSeconds: INITIAL_SECONDS };
    }

    const elapsedSeconds = (Date.now() - new Date(selectedPool.created_at).getTime()) / 1000;

    if (elapsedSeconds >= TOTAL_SECONDS) {
      return { phase: 'expired' as SearchPhase, remainingSeconds: 0 };
    }
    if (elapsedSeconds >= INITIAL_SECONDS) {
      // Extended phase: remaining is from current time to total end
      return { 
        phase: 'extended' as SearchPhase, 
        remainingSeconds: Math.max(0, Math.ceil(TOTAL_SECONDS - elapsedSeconds)) 
      };
    }
    // Initial phase: remaining is from current time to initial end
    return { 
      phase: 'initial' as SearchPhase, 
      remainingSeconds: Math.max(0, Math.ceil(INITIAL_SECONDS - elapsedSeconds)) 
    };
  }, [selectedPool?.created_at]);

  // Countdown timer - updates every second based on pool.created_at
  // This ensures accurate timing even after navigation
  useEffect(() => {
    // Only run for pool creator during waiting phase
    if (poolStatus !== 'WAITING_FOR_RIDERS' || !isPoolCreator || !selectedPool?.created_at) {
      // Reset to completed if not waiting
      if (poolStatus !== 'WAITING_FOR_RIDERS') {
        setSearchPhase('completed');
      }
      return;
    }

    // Calculate initial values
    const { phase, remainingSeconds: remaining } = calculateTimingFromCreatedAt();
    setSearchPhase(phase);
    setRemainingSeconds(remaining);

    // Update every second
    const timer = setInterval(() => {
      const { phase: newPhase, remainingSeconds: newRemaining } = calculateTimingFromCreatedAt();
      setSearchPhase(newPhase);
      setRemainingSeconds(newRemaining);

      // Stop timer if expired
      if (newPhase === 'expired') {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [poolStatus, isPoolCreator, selectedPool?.created_at, calculateTimingFromCreatedAt]);

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

  // Get the best navigation URL for the current platform
  // For multi-stop routes, platform links now use the universal URL format
  // (since native schemes drop waypoints), so all platforms work correctly
  const getBestNavigationUrl = useCallback((navLink: typeof navigationLink): string => {
    if (!navLink) return '';
    
    // Try platform-specific URLs first (server returns universal format for multi-stop)
    if (navLink.platformLinks) {
      const { Platform } = require('react-native');
      if (Platform.OS === 'android' && navLink.platformLinks.android) {
        return navLink.platformLinks.android;
      }
      if (Platform.OS === 'ios' && navLink.platformLinks.ios) {
        return navLink.platformLinks.ios;
      }
      // Fallback to universal
      if (navLink.platformLinks.universal) {
        return navLink.platformLinks.universal;
      }
    }
    
    // Final fallback to basic navigationUrl
    return navLink.navigationUrl;
  }, []);

  // Open Google Maps for FREE navigation
  const handleStartNavigation = useCallback(async () => {
    if (!navigationLink?.navigationUrl) {
      // Fetch navigation link if not available
      if (selectedPool?.id) {
        setLoadingNavLink(true);
        try {
          const response = await poolService.getNavigationLink(selectedPool.id);
          if (response.success && response.data?.navigationUrl) {
            const url = getBestNavigationUrl(response.data);
            await Linking.openURL(url);
          } else {
            Alert.alert('Error', 'Could not generate navigation link');
          }
        } catch (error) {
          console.error('[TripProgress] Error opening navigation:', error);
          Alert.alert('Error', 'Failed to open Google Maps');
        } finally {
          setLoadingNavLink(false);
        }
      }
      return;
    }

    try {
      const url = getBestNavigationUrl(navigationLink);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to universal URL if platform-specific fails
        const fallbackUrl = navigationLink.platformLinks?.universal || navigationLink.navigationUrl;
        const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
        if (canOpenFallback) {
          await Linking.openURL(fallbackUrl);
        } else {
          Alert.alert('Error', 'Google Maps is not installed on this device');
        }
      }
    } catch (error) {
      console.error('[TripProgress] Error opening Google Maps:', error);
      Alert.alert('Error', 'Failed to open Google Maps');
    }
  }, [navigationLink, selectedPool?.id, getBestNavigationUrl]);

  // Open a specific location in Google Maps
  const handleOpenLocation = useCallback(async (mapLink: string, label: string) => {
    try {
      const canOpen = await Linking.canOpenURL(mapLink);
      if (canOpen) {
        await Linking.openURL(mapLink);
      } else {
        Alert.alert('Error', 'Could not open location in Google Maps');
      }
    } catch (error) {
      console.error(`[TripProgress] Error opening ${label}:`, error);
      Alert.alert('Error', `Failed to open ${label}`);
    }
  }, []);

  // Handle pool cancellation (e.g., when server cancels due to timeout or riders leaving)
  // When cancelled with expired search (no riders joined), show "No Riders Found" card
  // If only 1 person in pool, don't redirect - show appropriate UI instead
  useEffect(() => {
    if (poolStatus !== 'CANCELLED') {
      return;
    }

    // If pool creator and search expired with no riders, show the expired UI
    if (isPoolCreator && searchPhase === 'expired' && currentPassengers < 2) {
      return;
    }

    // If pool has only 1 person, stay on page and show the "No Riders Found" UI
    if (currentPassengers <= 1) {
      return;
    }

    // Pool cancelled with multiple passengers: stay on page (no auto-redirect)
    Alert.alert('Pool Cancelled', 'Your pool was cancelled.');
  }, [poolStatus, isPoolCreator, searchPhase, currentPassengers]);

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

  const handleCreateNewPool = useCallback(() => {
    if (onCreateNewPool) {
      onCreateNewPool();
    }
  }, [onCreateNewPool]);

  const handleCancelPool = useCallback(() => {
    // If pool is already cancelled, just go home without confirmation
    if (poolStatus === 'CANCELLED') {
      if (onCancelPool) {
        onCancelPool();
      }
      return;
    }

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
  }, [onCancelPool, poolStatus]);

  const getStatusText = () => {
    switch (poolStatus) {
      case 'WAITING_FOR_RIDERS': return 'Waiting for riders...';
      case 'WAITING_FOR_DRIVER': return 'Waiting for driver...';
      case 'READY_TO_START': return 'Driver is on the way';
      case 'STARTED': return 'Trip in progress';
      case 'COMPLETED': return 'Trip completed';
      case 'CANCELLED': return 'Pool cancelled';
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

  // If navigation context is lost during concurrent re-render, show loading state
  if (navigationContext === undefined || navigationContext === null) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-gray-500">Loading trip...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Google Map - Shows combined route when available, otherwise individual route */}
        <View style={{ height: 300, position: 'relative' }}>
          <GoogleMapView
            center={combinedRoute?.waypoints?.[0]?.location || pickupCoords}
            zoom={combinedRoute ? 12 : 14}
            pickupLocation={!combinedRoute ? pickupCoords : undefined}
            dropoffLocation={!combinedRoute ? dropoffCoords : undefined}
            showDirections={!combinedRoute}
            routePolyline={combinedRoute?.route?.polyline}
            routeCoordinates={combinedRoute?.route?.coordinates}
            markers={combinedRoute ? combinedRoute.waypoints.map((wp, idx) => ({
              id: wp.id,
              latitude: wp.location.latitude,
              longitude: wp.location.longitude,
              title: wp.type === 'driver' ? 'Driver' : `${wp.type === 'pickup' ? 'Pick up' : 'Drop off'} ${idx + 1}`,
              icon: wp.type === 'driver' ? 'driver' : wp.type === 'pickup' ? 'pickup' : 'dropoff',
            })) : []}
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

          {/* Combined Route Badge */}
          {combinedRoute && (
            <View
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                backgroundColor: 'rgba(0,0,0,0.7)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Route className="w-4 h-4" color="#10b981" />
              <Text style={{ color: 'white', fontSize: 12 }}>
                {combinedRoute.route.totalDistanceKm}km • {combinedRoute.route.totalDurationMinutes}min
              </Text>
              {combinedRoute.meta.fromCache && (
                <Text style={{ color: '#9ca3af', fontSize: 10 }}>(cached)</Text>
              )}
            </View>
          )}

          {/* Loading Combined Route */}
          {loadingCombinedRoute && (
            <View
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                backgroundColor: 'rgba(0,0,0,0.7)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={{ color: 'white', fontSize: 12 }}>Loading smart route...</Text>
            </View>
          )}

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
              <Text style={{ fontWeight: '600' }}>
                {combinedRoute ? `${combinedRoute.route.durationInTraffic} mins` : getETA()}
              </Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {/* <View className="px-6 py-4 bg-white">
          <Progress value={progress} className="h-2" />
          <View className="flex-row justify-between mt-2">
            <Text className="text-sm text-gray-500">Pickup</Text>
            <Text className="text-sm text-gray-500">Destination</Text>
          </View>
        </View> */}

        {/* Lookup Timer Card - Only show during waiting phase for pool creator */}
        {isPoolCreator && (searchPhase === 'initial' || searchPhase === 'extended') && poolStatus === 'WAITING_FOR_RIDERS' && (
          <View className="mx-6 mt-4 bg-blue-50 rounded-2xl p-5 border-2 border-blue-200">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Clock className="w-5 h-5" color="#2563eb" />
                <Text className="font-semibold text-blue-800">
                  {searchPhase === 'initial' ? 'Searching for Riders' : 'Extended Search'}
                </Text>
              </View>
              <View className="bg-blue-600 px-3 py-1 rounded-full">
                <Text className="text-white font-bold">{remainingSeconds}s</Text>
              </View>
            </View>

            <Text className="text-blue-700 text-sm">
              {searchPhase === 'initial'
                ? 'Your pool is visible to nearby users with similar routes...'
                : 'Searching in wider area for potential riders...'}
            </Text>

            {searchPhase === 'extended' && (
              <View className="flex-row items-center gap-2 mt-2">
                <ActivityIndicator size="small" color="#2563eb" />
                <Text className="text-blue-600 text-xs">Expanding search range...</Text>
              </View>
            )}
          </View>
        )}

        {/* No Match Card - Show when:
            1. Search expired with no riders (searchPhase === 'expired' && currentPassengers < 2)
            2. Pool was CANCELLED with only 1 person (server cancelled due to timeout or riders left)
        */}
        {(
          (isPoolCreator && searchPhase === 'expired' && currentPassengers < 2) ||
          (poolStatus === 'CANCELLED' && currentPassengers <= 1)
        ) && (
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

        {/* Driver Card - hide when pool is cancelled */}
        {!poolCancelled && (
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <Text className="font-semibold mb-4">Your Driver</Text>

          {hasDriver ? (
            <View className="flex-row items-center gap-4">
              <View className={`w-16 h-16 rounded-full items-center justify-center ${isFemale ? 'bg-pink-100' : 'bg-blue-100'} border-2 border-white`}>
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
        )}

        {/* START NAVIGATION BUTTON - FREE Google Maps Navigation */}
        {/* Shows when pool is formed (waiting for driver or beyond) - users can see all pickup/dropoff points */}
        {['WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED'].includes(poolStatus) && (
          <View className="mx-6 mt-4">
            <TouchableOpacity
              onPress={handleStartNavigation}
              disabled={loadingNavLink}
              className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-3 ${accentBg}`}
              style={{
                shadowColor: isFemale ? '#ec4899' : '#2563eb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
                opacity: loadingNavLink ? 0.7 : 1,
              }}
            >
              {loadingNavLink ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Navigation className="w-6 h-6" color="white" />
                  <View>
                    <Text className="text-white font-bold text-lg">View Route in Google Maps</Text>
                    <Text className="text-white text-xs opacity-80">See all pickup & dropoff points • FREE</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
            <Text className="text-center text-gray-500 text-xs mt-2">
              Opens Google Maps app with the full route and all stops
            </Text>
          </View>
        )}

        {/* Optimized Route Stops - Shows the full route in optimal order */}
        {/* {navigationLink?.orderedStops && ['WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED'].includes(poolStatus) && (
          <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-semibold">Optimized Route</Text>
              {navigationLink.routeInfo && (
                <View className={`px-2 py-1 rounded ${navigationLink.routeInfo.trafficLevel === 'low' ? 'bg-green-100' : navigationLink.routeInfo.trafficLevel === 'moderate' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                  <Text className={`text-xs font-medium ${navigationLink.routeInfo.trafficLevel === 'low' ? 'text-green-700' : navigationLink.routeInfo.trafficLevel === 'moderate' ? 'text-yellow-700' : 'text-red-700'}`}>
                    {navigationLink.routeInfo.trafficLevel.charAt(0).toUpperCase() + navigationLink.routeInfo.trafficLevel.slice(1)} traffic
                  </Text>
                </View>
              )}
            </View>
            <View className="gap-3">
              {navigationLink.orderedStops.map((stop, idx) => {
                const stopColor = stop.type === 'driver' ? '#3B82F6' : stop.type === 'pickup' ? '#22C55E' : '#EF4444';
                const stopLabel = stop.type === 'driver' ? 'Start' : stop.type === 'pickup' ? 'Pick up' : 'Drop off';
                
                return (
                  <View key={`${stop.type}-${stop.userId}-${idx}`} className="flex-row items-start gap-3">
                    <View className="items-center">
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: stopColor, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{stop.order}</Text>
                      </View>
                      {idx < navigationLink.orderedStops.length - 1 && (
                        <View style={{ width: 2, height: 20, backgroundColor: '#e5e7eb', marginTop: 4 }} />
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm text-gray-500">{stopLabel}</Text>
                        {stop.isCurrentUser && (
                          <View className="bg-blue-100 px-2 py-0.5 rounded">
                            <Text className="text-xs text-blue-700">You</Text>
                          </View>
                        )}
                      </View>
                      <Text className="font-medium" numberOfLines={1}>
                        {stop.name || stop.address || `${stopLabel} point`}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        ETA: {stop.estimatedArrivalMinutes === 0 ? 'Start' : `+${stop.estimatedArrivalMinutes} min`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View> */}
            {/* Route Summary */}
            {/* {navigationLink.routeInfo && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Total Distance</Text>
                  <Text className="font-medium">{navigationLink.routeInfo.totalDistanceKm} km</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-600">Total Duration</Text>
                  <Text className="font-medium">{navigationLink.routeInfo.totalDurationMinutes} mins</Text>
                </View>
              </View>
            )}
          </View>
        )} */}

        {/* View Individual Locations - Links to open each location in Google Maps */}
        {/* {navigationLink && ['WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED'].includes(poolStatus) && (
          <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
            <Text className="font-semibold mb-4">View Individualsss Locations</Text>
            <View className="gap-3">
              {navigationLink.waypoints.map((waypoint, idx) => (
                <View key={waypoint.userId} className="gap-2">
                  <View className="flex-row items-center gap-2">
                    <View className={`w-2 h-2 rounded-full ${waypoint.isCurrentUser ? 'bg-blue-500' : 'bg-gray-400'}`} />
                    <Text className={`text-sm font-medium ${waypoint.isCurrentUser ? 'text-blue-600' : 'text-gray-600'}`}>
                      {waypoint.isCurrentUser ? 'Your Locations' : `Rider ${idx + 1}`}
                    </Text>
                  </View>
                  <View className="flex-row gap-2 ml-4">
                    <TouchableOpacity
                      onPress={() => handleOpenLocation(waypoint.pickup.mapLink, 'pickup')}
                      className="flex-1 py-2 px-3 bg-green-50 rounded-lg flex-row items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" color="#22c55e" />
                      <Text className="text-green-700 text-xs" numberOfLines={1}>
                        {waypoint.pickup.name || waypoint.pickup.address || 'Pickup'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleOpenLocation(waypoint.dropoff.mapLink, 'dropoff')}
                      className="flex-1 py-2 px-3 bg-red-50 rounded-lg flex-row items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" color="#ef4444" />
                      <Text className="text-red-700 text-xs" numberOfLines={1}>
                        {waypoint.dropoff.name || waypoint.dropoff.address || 'Drop-off'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )} */}

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
                <View className={`px-2 py-1 rounded ${poolCancelled ? 'bg-red-100' : hasDriver ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <Text className={`text-xs font-medium ${poolCancelled ? 'text-red-700' : hasDriver ? 'text-green-700' : 'text-yellow-700'}`}>
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
              {/* Hide driver row when pool is cancelled */}
              {!poolCancelled && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Driver</Text>
                <Text className={`font-medium ${hasDriver ? 'text-green-600' : 'text-yellow-600'}`}>
                  {hasDriver ? 'Assigned' : 'Waiting for driver...'}
                </Text>
              </View>
              )}
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

          {loadingPool && coRiders.length === 0 ? (
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

        {/* Route Info - Shows combined smart route when available */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border-2 border-gray-200">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-semibold">
              {combinedRoute ? 'Smart Route' : 'Route'}
            </Text>
            {combinedRoute && (
              <View className="flex-row items-center gap-2">
                <View className={`px-2 py-1 rounded ${combinedRoute.route.trafficLevel === 'low' ? 'bg-green-100' : combinedRoute.route.trafficLevel === 'moderate' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                  <Text className={`text-xs font-medium ${combinedRoute.route.trafficLevel === 'low' ? 'text-green-700' : combinedRoute.route.trafficLevel === 'moderate' ? 'text-yellow-700' : 'text-red-700'}`}>
                    {combinedRoute.route.trafficLevel.charAt(0).toUpperCase() + combinedRoute.route.trafficLevel.slice(1)} traffic
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Combined Route Waypoints */}
          {combinedRoute ? (
            <View className="gap-3">
              {combinedRoute.waypoints.map((waypoint, idx) => {
                const isUserWaypoint = waypoint.userId === userProfile?.id;
                const waypointColor = waypoint.type === 'driver' ? '#3B82F6' : waypoint.type === 'pickup' ? '#22C55E' : '#EF4444';
                const waypointLabel = waypoint.type === 'driver' ? 'Driver' : waypoint.type === 'pickup' ? 'Pick up' : 'Drop off';
                
                return (
                  <View key={waypoint.id} className="flex-row items-start gap-3">
                    <View className="items-center">
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: waypointColor, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{idx + 1}</Text>
                      </View>
                      {idx < combinedRoute.waypoints.length - 1 && (
                        <View style={{ width: 2, height: 20, backgroundColor: '#e5e7eb', marginTop: 4 }} />
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm text-gray-500">{waypointLabel}</Text>
                        {isUserWaypoint && (
                          <View className="bg-blue-100 px-2 py-0.5 rounded">
                            <Text className="text-xs text-blue-700">You</Text>
                          </View>
                        )}
                      </View>
                      <Text className="font-medium" numberOfLines={1}>
                        {waypoint.name || waypoint.address || `Waypoint ${idx + 1}`}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        ETA: {waypoint.estimatedArrivalMinutes === 0 ? 'Start' : `+${waypoint.estimatedArrivalMinutes} min`}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Route Summary */}
              <View className="mt-3 pt-3 border-t border-gray-100">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Total Distance</Text>
                  <Text className="font-medium">{combinedRoute.route.totalDistanceKm} km</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-600">Total Duration</Text>
                  <Text className="font-medium">{combinedRoute.route.durationInTraffic} mins</Text>
                </View>
                {combinedRoute.optimization.savingsPercent > 0 && (
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-600">Route Savings</Text>
                    <Text className="font-medium text-green-600">
                      {combinedRoute.optimization.savingsPercent}% more efficient
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* Fallback to simple pickup/dropoff display */
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
          )}
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
                {displayEtaMinutes !== undefined
                  ? `${Math.round(displayEtaMinutes)} mins`
                  : 'Calculating...'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Your Fare (with pool)</Text>
              <Text className={`font-semibold ${accentText}`}>
                ৳ {displayFare !== undefined
                  ? Math.round(displayFare)
                  : 'Calculating...'}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-600">Pickup</Text>
              <Text className="font-medium text-right flex-1 ml-4" numberOfLines={1}>
              {currentMemberRide?.pickup_address || pickupLocation?.name || pickupLocation?.address || 'N/A'}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-600">Destination</Text>
              <Text className="font-medium text-right flex-1 ml-4" numberOfLines={1}>
                {currentMemberRide?.dropoff_address || destination?.name || destination?.address || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancel Pool Button - Show until ride starts or is completed */}
        {/* When CANCELLED with only 1 person, show "Go Home" instead */}
        {!['STARTED', 'COMPLETED'].includes(poolStatus) && (
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
                  <Text className="text-gray-600 font-semibold">
                    {(poolStatus === 'CANCELLED' || (searchPhase === 'expired' && currentPassengers < 2)) 
                      ? 'Go Home' 
                      : 'Cancel & Leave Pool'}
                  </Text>
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

// Export the safe wrapper as the default export
export default SafeTripProgress;
