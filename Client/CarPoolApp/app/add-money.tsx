import AddMoney from '../components/AddMoney';
import { useRouter } from 'expo-router';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function AddMoneyScreen() {
  const router = useRouter();
  const { userProfile } = useGlobalContext();

  const handleBack = () => {
    router.back();
  };

  return <AddMoney onBack={handleBack} userProfile={userProfile} />;
}
