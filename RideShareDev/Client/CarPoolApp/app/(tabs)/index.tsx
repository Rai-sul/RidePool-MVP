import { useRouter } from 'expo-router';
import WelcomeScreen from '../../components/WelcomeScreen';

export default function App() {
  const router = useRouter();

  const handleSignUp = () => {
    router.push('/profile-setup');
  };

  return <WelcomeScreen onSignUp={handleSignUp} />;
}