import { useRouter } from 'expo-router';
import PaymentSummary from '../components/PaymentSummary.native';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function PaymentSummaryScreen() {
  const router = useRouter();
  const { destination, userProfile } = useGlobalContext();
  
  const handleDone = () => {
    // Navigate to home with rating modal parameter
    router.replace('/home?showRating=true');
  };
  
  return <PaymentSummary destination={destination} userProfile={userProfile} onDone={handleDone} />;
}
