import React, { Component, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Navigation, Users, ChevronRight } from './Icons';
import { useEffect, useRef } from 'react';
import { usePoolRealtime } from '../hooks/usePoolRealtime';

// Error boundary to prevent ActiveTripButton from crashing the app
class ActiveTripButtonErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ActiveTripButton] Error caught:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return null; // Don't show anything if there's an error
    }
    return this.props.children;
  }
}

/**
 * Floating button that appears when user has an active trip
 * Allows quick navigation back to trip-progress page from anywhere in the app
 * Shows real-time pool status updates
 */
export default function ActiveTripButton() {
  return (
    <ActiveTripButtonErrorBoundary>
      <ActiveTripButtonInner />
    </ActiveTripButtonErrorBoundary>
  );
}

function ActiveTripButtonInner() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { activeTrip, hasActiveTrip, userProfile, endTrip } = useGlobalContext();

  // Always call hooks unconditionally
  const poolId = activeTrip?.poolId || null;
  const userId = userProfile?.id || null;

  // Get real-time pool updates - hook is always called but with null values when no trip
  const { pool: realtimePool, poolStatus, members, error: poolError, isConnected } = usePoolRealtime(poolId, userId);

  // Animation for pulsing effect
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Calculate bottom position: above bottom nav (64px) + system nav bar inset
  const bottomPosition = 64 + 16 + insets.bottom; // 64 = nav height, 16 = gap

  // Clear active trip ONLY when pool is genuinely completed
  // NEVER auto-clear on CANCELLED status or pool errors - let user stay on trip-progress page
  // User can only leave via explicit cancel/leave button tap in TripProgress component
  useEffect(() => {
    if (hasActiveTrip && poolId) {
      // Pool was completed - trip is done
      if (poolStatus === 'COMPLETED') {
        console.log('[ActiveTripButton] Pool completed - clearing trip');
        endTrip();
        return;
      }
      // Do NOT clear on CANCELLED status or pool errors
      // Let user navigate to trip-progress and see the "No Riders Found" card
      // or decide to create a new pool or leave explicitly
    }
  }, [hasActiveTrip, poolId, poolStatus, endTrip]);

  useEffect(() => {
    if (hasActiveTrip) {
      // Create pulsing animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [hasActiveTrip, pulseAnim]);

  // Don't show if no active trip
  if (!hasActiveTrip || !activeTrip) {
    return null;
  }

  // Don't show on certain pages
  if (pathname === '/trip-progress' || pathname === '/searching' ||
    pathname === '/chat' || pathname === '/driver-chat' || pathname === '/support-chat') {
    return null;
  }

  const isFemale = userProfile?.gender === 'female';
  const bgColor = isFemale ? '#ec4899' : '#2563eb';

  const handlePress = () => {
    router.push('/trip-progress');
  };

  // Use realtime passenger count if available, with members array as fallback
  const passengerCount = realtimePool?.current_passengers ||
    (members && members.length > 0 ? members.length : null) ||
    activeTrip.pool.current_passengers || 1;

  // Calculate if search time has expired for this pool
  const TOTAL_SEARCH_SECONDS = 40; // 30 initial + 10 extended
  const isSearchExpired = (() => {
    if (!realtimePool?.created_at && !activeTrip.pool.created_at) return false;
    const createdAt = realtimePool?.created_at || activeTrip.pool.created_at;
    const poolCreatedAt = new Date(createdAt).getTime();
    const elapsedSeconds = (Date.now() - poolCreatedAt) / 1000;
    return elapsedSeconds >= TOTAL_SEARCH_SECONDS;
  })();

  // Get status text based on realtime pool status
  const getStatusText = () => {
    // Use realtime pool status if available
    if (poolStatus) {
      switch (poolStatus) {
        case 'WAITING_FOR_RIDERS':
          // Check if search time expired with no riders
          if (isSearchExpired && passengerCount < 2) {
            return 'No riders joined';
          }
          return 'Waiting for riders...';
        case 'WAITING_FOR_DRIVER':
          return 'Waiting for driver';
        case 'READY_TO_START':
          return 'Driver assigned';
        case 'STARTED':
          return 'Trip in progress';
        case 'COMPLETED':
          return 'Trip completed';
        case 'CANCELLED':
          return 'Pool cancelled';
        default:
          return 'Active trip';
      }
    }

    // Fallback to stored status
    switch (activeTrip.status) {
      case 'searching':
        return 'Searching for riders...';
      case 'waiting':
        return 'Waiting for driver';
      case 'in_progress':
        return 'Trip in progress';
      default:
        return 'Active trip';
    }
  };

  // Get destination name (truncated)
  const destinationName = activeTrip.destination?.name || 'Your destination';
  const truncatedDestination = destinationName.length > 20
    ? destinationName.substring(0, 20) + '...'
    : destinationName;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: bottomPosition, // Above bottom nav + system nav bar
        left: 16,
        right: 16,
        transform: [{ scale: pulseAnim }],
        zIndex: 1000,
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        style={{
          backgroundColor: bgColor,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: bgColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        {/* Left: Icon */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Navigation color="#ffffff" size={24} />
        </View>

        {/* Center: Trip info */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>
            {getStatusText()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
              To: {truncatedDestination}
            </Text>
            {passengerCount > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                <Users color="rgba(255,255,255,0.85)" size={14} />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginLeft: 4 }}>
                  {passengerCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Right: Arrow */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight color="#ffffff" size={20} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
