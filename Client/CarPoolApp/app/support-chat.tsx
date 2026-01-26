import SupportChatScreen from '../components/SupportChatScreen';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router';

export default function SupportChat() {
  const { userProfile } = useGlobalContext();
  const router = useRouter();

  return (
    <SupportChatScreen 
      userProfile={userProfile} 
      onBack={() => router.back()}
    />
  );
}
