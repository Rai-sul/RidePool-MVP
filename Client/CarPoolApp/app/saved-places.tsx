import SavedPlaces from '../components/SavedPlaces';
import { useRouter } from 'expo-router';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function SavedPlacesScreen() {
  const router = useRouter();
  const { userProfile } = useGlobalContext();

  const handleBack = () => {
    router.back();
  };

  return <SavedPlaces onBack={handleBack} userProfile={userProfile} />;
}
