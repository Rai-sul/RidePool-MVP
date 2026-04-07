import DriverChatScreen from '../components/DriverChatScreen';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function DriverChat() {
  const { userProfile } = useGlobalContext();
  const router = useRouter();
  const params = useLocalSearchParams();

  return (
    <DriverChatScreen 
      userProfile={userProfile} 
      driverId={params.driverId as string}
      driverName={params.driverName as string}
      onBack={() => router.back()}
    />
  );
}
