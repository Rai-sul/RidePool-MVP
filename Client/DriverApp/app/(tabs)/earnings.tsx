import { useRouter } from 'expo-router';
import { EarningsScreen } from '../../src/components/screens/EarningsScreen.native';

export default function Earnings() {
  const router = useRouter();

  return <EarningsScreen />;
}
