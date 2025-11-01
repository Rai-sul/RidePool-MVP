import YourRatings from '../components/YourRatings';
import { useRouter } from 'expo-router';

export default function YourRatingsScreen() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return <YourRatings onBack={handleBack} />;
}
