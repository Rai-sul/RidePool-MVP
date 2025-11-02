import LanguageScreen from '../components/LanguageScreen';
import { useRouter } from 'expo-router';

export default function Language() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return <LanguageScreen onBack={handleBack} />;
}
