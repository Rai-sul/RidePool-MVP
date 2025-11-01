import { useRouter } from 'expo-router';
import TripProgress from '../components/TripProgress.native';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function TripProgressScreen() {
  const router = useRouter();
  const { userProfile } = useGlobalContext();
  
  const handleComplete = () => {
    // Navigate to payment summary
    router.push('/payment-summary');
  };
  
  return <TripProgress userProfile={userProfile} onComplete={handleComplete} />;
}
