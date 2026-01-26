import { useRouter } from 'expo-router';
import SafetyScreen from '../src/components/screens/SafetyScreen.native';

export default function Safety() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return <SafetyScreen onBack={handleBack} />;
}
