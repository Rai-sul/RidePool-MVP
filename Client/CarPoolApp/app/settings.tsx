import SettingsScreen from '../components/SettingsScreen';
import { useRouter } from 'expo-router';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function Settings() {
  const router = useRouter();
  const { userProfile } = useGlobalContext();

  const handleBack = () => {
    router.back();
  };

  return <SettingsScreen onBack={handleBack} userProfile={userProfile} />;
}
