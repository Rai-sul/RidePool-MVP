import NotificationsScreen from '../components/NotificationsScreen';
import { useRouter } from 'expo-router';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function Notifications() {
  const router = useRouter();
  const { userProfile } = useGlobalContext();

  const handleBack = () => {
    router.back();
  };

  return <NotificationsScreen onBack={handleBack} userProfile={userProfile} />;
}
