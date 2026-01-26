import AllTransactions from '../components/AllTransactions';
import { useRouter } from 'expo-router';

export default function AllTransactionsScreen() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return <AllTransactions onBack={handleBack} />;
}
