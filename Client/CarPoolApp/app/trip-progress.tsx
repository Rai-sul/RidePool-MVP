import React, { Component, ErrorInfo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import TripProgress from '../components/TripProgress.native';
import { useGlobalContext } from '../contexts/GlobalContext';

// Expo Router's internal Screen component calls useNavigation() which can throw
// "Couldn't find a navigation context" when Supabase realtime events trigger re-renders
// that race with React Navigation's context propagation. This boundary catches that
// transient error and auto-recovers on the next render cycle.
class TripProgressErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    console.warn('[TripProgress] Navigation context error, recovering:', error.message);
    setTimeout(() => this.setState({ hasError: false }), 0);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>Loading trip...</Text>
        </View>
      );
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
