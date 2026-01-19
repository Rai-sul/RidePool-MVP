import PromoCode from '../components/PromoCode';
import { useRouter } from 'expo-router';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function PromoCodeScreen() {
  const router = useRouter();
  const { userProfile } = useGlobalContext();

  const handleBack = () => {
    router.back();
  };

  return <PromoCode onBack={handleBack} userProfile={userProfile} />;
}
