import GenderPreference from '../components/GenderPreference';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router';

export default function GenderPreferenceScreen() {
  const { userProfile } = useGlobalContext();
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return <GenderPreference userProfile={userProfile} onBack={handleBack} />;
}
