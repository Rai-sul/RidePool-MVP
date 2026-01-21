import { useRouter } from 'expo-router';
import WelcomeScreen from '../../components/WelcomeScreen';
import { useAuthContext } from '../../contexts/AuthContext';

export default function App() {
  const router = useRouter();
  const { loginWithOAuth } = useAuthContext();

  const handleSignUp = () => {
    router.push('/login?mode=signup');
  };

  const handleLogin = () => {
    router.push('/login?mode=login');
  };

  const handleGoogleLogin = async () => {
    const result = await loginWithOAuth('google');
    if (result.success) {
      router.replace('/home');
    }
  };

  const handleFacebookLogin = async () => {
    const result = await loginWithOAuth('facebook');
    if (result.success) {
      router.replace('/home');
    }
  };

  return (
    <WelcomeScreen 
      onSignUp={handleSignUp} 
      onLogin={handleLogin}
      onGoogleLogin={handleGoogleLogin}
      onFacebookLogin={handleFacebookLogin}
    />
  );
}