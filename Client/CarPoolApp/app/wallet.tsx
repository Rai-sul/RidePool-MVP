import WalletScreen from '../components/WalletScreen';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter, type Href } from 'expo-router';

export default function Wallet() {
  const { userProfile } = useGlobalContext();
  const router = useRouter();

  const handleNavigate = (page: string) => {
    router.push(`/${page}` as Href);
  };

  return <WalletScreen userProfile={userProfile} onNavigate={handleNavigate} />;
}
