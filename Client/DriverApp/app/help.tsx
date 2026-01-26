import { useRouter } from 'expo-router';
import HelpScreen from '../src/components/screens/HelpScreen.native';

export default function Help() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return <HelpScreen onBack={handleBack} />;
}
