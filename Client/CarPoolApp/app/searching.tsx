import { useRouter } from 'expo-router';
import SearchingDriver from '../components/SearchingDriver.native';

export default function SearchingScreen() {
  const router = useRouter();
  
  const handleCancel = () => {
    router.back();
  };

  const handleDriverFound = () => {
    router.replace('/trip-progress');
  };
  
  return <SearchingDriver onCancel={handleCancel} onDriverFound={handleDriverFound} />;
}