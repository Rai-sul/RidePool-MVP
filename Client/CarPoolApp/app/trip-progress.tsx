import { useRouter } from 'expo-router';
import TripProgress from '../components/TripProgress.native';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function TripProgressScreen() {
  const router = useRouter();
  const { userProfile, pickupLocation, selectedDestination, selectedPool, setSelectedPool } = useGlobalContext();
  
  const handleComplete = () => {
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
    // Clear the current pool and go back to ride confirmation to create a new pool
    setSelectedPool(null);
    router.replace('/ride-confirmation');
  };
  
  return (
    <TripProgress 
      userProfile={userProfile} 
      pickupLocation={pickupLocation}
      destination={selectedDestination}
      selectedPool={selectedPool}
      onComplete={handleComplete} 
      onChatDriver={handleChatDriver}
      onChatCoRider={handleChatCoRider}
      onCreateNewPool={handleCreateNewPool}
    />
  );
}
