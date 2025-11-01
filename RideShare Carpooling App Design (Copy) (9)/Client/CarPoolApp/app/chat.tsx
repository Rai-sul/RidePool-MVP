import ChatScreen from '../components/ChatScreen';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function Chat() {
  const { userProfile } = useGlobalContext();
  const router = useRouter();
  const params = useLocalSearchParams();

  return (
    <ChatScreen 
      userProfile={userProfile} 
      friendId={params.friendId as string}
      friendName={params.friendName as string}
      onBack={() => router.back()}
    />
  );
}
