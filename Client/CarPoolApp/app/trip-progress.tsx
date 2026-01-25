import { useRouter } from 'expo-router';
import TripProgress from '../components/TripProgress.native';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function TripProgressScreen() {
  const router = useRouter();
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
      router.replace('/');
    }
  };
  
  return (
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
    />
  );
}
