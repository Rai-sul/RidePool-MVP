import WalletScreen from '../components/WalletScreen';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router';

export default function Wallet() {
  const { userProfile } = useGlobalContext();
  const router = useRouter();

  const handleNavigate = (page: string) => {
    router.push(`/${page}`);
  };

  return <WalletScreen userProfile={userProfile} onNavigate={handleNavigate} />;
}
