import { useRouter } from 'expo-router';
import RegisterScreen from '../src/components/screens/RegisterScreen.native';

export default function Register() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleSuccess = () => {
    router.replace('/(tabs)/home');
  };

  return <RegisterScreen onBack={handleBack} onSuccess={handleSuccess} />;
}
