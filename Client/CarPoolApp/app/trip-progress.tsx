import { useRouter } from 'expo-router';
import TripProgress from '../components/TripProgress.native';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function TripProgressScreen() {
  const router = useRouter();
  const { userProfile, pickupLocation, selectedDestination, selectedPool } = useGlobalContext();
  
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
  
  return (
    <TripProgress 
      userProfile={userProfile} 
      pickupLocation={pickupLocation}
      destination={selectedDestination}
      selectedPool={selectedPool}
      onComplete={handleComplete} 
      onChatDriver={handleChatDriver} 
    />
  );
}
