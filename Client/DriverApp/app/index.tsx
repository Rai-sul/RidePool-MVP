import { useRouter } from 'expo-router';
import LoginScreen from '../src/components/screens/LoginScreen.native';

export default function Index() {
  const router = useRouter();

  const handleLogin = () => {
    router.replace('/(tabs)/home');
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} />;
}
