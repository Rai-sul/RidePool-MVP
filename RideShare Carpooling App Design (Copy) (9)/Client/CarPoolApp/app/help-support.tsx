import HelpSupport from '../components/HelpSupport';
import { useRouter } from 'expo-router';

export default function HelpSupportScreen() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return <HelpSupport onBack={handleBack} />;
}
