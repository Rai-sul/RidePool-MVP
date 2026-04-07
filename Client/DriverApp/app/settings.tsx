import { useRouter } from 'expo-router';
import { SettingsScreen } from '../src/components/screens/SettingsScreen.native';

export default function Settings() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return <SettingsScreen onBack={handleBack} />;
}
