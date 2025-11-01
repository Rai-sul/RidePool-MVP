import { useRouter } from 'expo-router';
import TripProgress from '../components/TripProgress.native';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function TripProgressScreen() {
  const router = useRouter();
  const { userProfile } = useGlobalContext();
  
  const handleComplete = () => {
    router.push('/payment-summary');
  };

  const handleChatDriver = () => {
    router.push({
      pathname: '/driver-chat',
      params: {
        driverId: 'DRV001',
        driverName: 'Ahmed Khan'
      }
    });
  };
  
  return <TripProgress userProfile={userProfile} onComplete={handleComplete} onChatDriver={handleChatDriver} />;
}
