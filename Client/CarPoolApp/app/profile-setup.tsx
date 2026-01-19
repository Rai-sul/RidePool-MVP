import { useRouter } from 'expo-router';
import ProfileSetup from '../components/ProfileSetup';
import { useGlobalContext, UserProfile } from '../contexts/GlobalContext';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { setUserProfile } = useGlobalContext();

  const handleComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    router.push('/home');
  };

  return <ProfileSetup onComplete={handleComplete} />;
}