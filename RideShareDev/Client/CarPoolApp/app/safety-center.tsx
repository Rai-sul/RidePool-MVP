import SafetyCenter from '../components/SafetyCenter';
import { useRouter } from 'expo-router';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function SafetyCenterScreen() {
  const router = useRouter();
  const { userProfile } = useGlobalContext();

  const handleBack = () => {
    router.back();
  };

  return <SafetyCenter onBack={handleBack} userProfile={userProfile} />;
}
