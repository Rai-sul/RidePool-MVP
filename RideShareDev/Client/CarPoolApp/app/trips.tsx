import TripsScreen from '../components/TripsScreen';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router';

export default function Trips() {
  const { userProfile } = useGlobalContext();
  const router = useRouter();

  const handleBookRide = () => {
    router.push('/home');
  };

  return <TripsScreen userProfile={userProfile} onBookRide={handleBookRide} />;
}
