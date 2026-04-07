import React, { Component, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import TripProgress from '../components/TripProgress.native';
import { useGlobalContext } from '../contexts/GlobalContext';

// Error boundary for TripProgress — catches transient navigation context errors
// that can occur when Supabase realtime events trigger rapid re-renders.
// Uses exponential backoff to avoid infinite crash loops (React 19 logs all caught errors).
class TripProgressErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; retryCount: number }
> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private static MAX_RETRIES = 3;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    if (this.state.retryCount < TripProgressErrorBoundary.MAX_RETRIES) {
      const delay = Math.min(500 * Math.pow(2, this.state.retryCount), 4000);
      this.retryTimer = setTimeout(() => {
        this.setState(prev => ({ hasError: false, retryCount: prev.retryCount + 1 }));
      }, delay);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  handleManualRetry = () => {
    this.setState({ hasError: false, retryCount: 0 });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.retryCount >= TripProgressErrorBoundary.MAX_RETRIES) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text style={{ fontSize: 16, color: '#374151', fontWeight: '600', marginBottom: 8 }}>
              Something went wrong
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
              Trip progress failed to load. Please try again.
            </Text>
            <TouchableOpacity
              onPress={this.handleManualRetry}
              style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return null;
    }
    return this.props.children;
  }
}

export default function TripProgressScreen() {
  const {
    userProfile,
    pickupLocation,
    selectedDestination,
    selectedPool,
    setSelectedPool,
    activeTrip,
    updateTripStatus,
    endTrip,
    cancelTrip,
  } = useGlobalContext();

  const handleComplete = () => {
    // Update trip status to completed and end the trip
    updateTripStatus('completed');
    endTrip();
    router.push('/payment-summary');
  };

  const handleChatDriver = () => {
    router.push({
      pathname: '/driver-chat',
      params: {
        driverId: 'DRV001',
        driverName: selectedPool?.driverName || 'Ahmed Khan'
      }
    });
  };

  const handleChatCoRider = (userId: string, userName: string) => {
    router.push({
      pathname: '/chat',
      params: {
        recipientId: userId,
        recipientName: userName,
        poolId: selectedPool?.id,
      }
    });
  };

  const handleCreateNewPool = () => {
    // End the current trip and create a new one
    endTrip();
    setSelectedPool(null);
    router.replace('/ride-confirmation');
  };

  const handleCancelPool = async () => {
    // Cancel the trip and leave the pool
    const success = await cancelTrip();
    if (success) {
      // Navigate to home screen, not root, to avoid auth redirect issues
      router.replace('/home');
    }
  };

  const handlePoolCancelled = () => {
    // Pool was auto-cancelled (e.g., not enough riders)
    endTrip();
    setSelectedPool(null);
    // Navigate to home screen, not root, to avoid auth redirect issues
    router.replace('/home');
  };

  return (
    <TripProgressErrorBoundary>
      <TripProgress
        userProfile={userProfile}
        pickupLocation={activeTrip?.pickupLocation || pickupLocation}
        destination={activeTrip?.destination || selectedDestination}
        selectedPool={activeTrip?.pool || selectedPool}
        onComplete={handleComplete}
        onChatDriver={handleChatDriver}
        onChatCoRider={handleChatCoRider}
        onCreateNewPool={handleCreateNewPool}
        onCancelPool={handleCancelPool}
        onPoolCancelled={handlePoolCancelled}
      />
    </TripProgressErrorBoundary>
  );
}
