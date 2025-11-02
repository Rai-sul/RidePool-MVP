import HelpSupport from '../components/HelpSupport';
import { useRouter } from 'expo-router';

export default function HelpSupportScreen() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleChatPress = () => {
    router.push('/support-chat');
  };

  return <HelpSupport onBack={handleBack} onChatPress={handleChatPress} />;
}
