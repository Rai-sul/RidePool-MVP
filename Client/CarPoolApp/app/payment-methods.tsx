import PaymentMethods from '../components/PaymentMethods';
import { useRouter } from 'expo-router';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { userProfile } = useGlobalContext();

  const handleBack = () => {
    router.back();
  };

  return <PaymentMethods onBack={handleBack} userProfile={userProfile} />;
}
