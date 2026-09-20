import ScheduledRides from '../components/ScheduledRides';
import { useRouter } from 'expo-router';

export default function ScheduledRidesRoute() {
  const router = useRouter();

  return <ScheduledRides onBack={() => router.back()} />;
}
