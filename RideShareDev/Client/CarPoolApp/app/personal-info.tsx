import PersonalInfo from '../components/PersonalInfo';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router';

export default function PersonalInfoScreen() {
  const { userProfile } = useGlobalContext();
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return <PersonalInfo userProfile={userProfile} onBack={handleBack} />;
}
