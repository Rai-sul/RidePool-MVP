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
      recipientId={params.recipientId as string || params.friendId as string}
      recipientName={params.recipientName as string || params.friendName as string || 'User'}
      poolId={params.poolId as string}
      onBack={() => router.back()}
    />
  );
}
