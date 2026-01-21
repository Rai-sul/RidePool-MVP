import ProfileScreen from '../components/ProfileScreen';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function Profile() {
  const { userProfile } = useGlobalContext();

  return <ProfileScreen userProfile={userProfile} />;
}
