import ProfileScreen from '../components/ProfileScreen';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router';

export default function Profile() {
  const { userProfile } = useGlobalContext();
  const router = useRouter();

  const handleMenuItemClick = (item: string) => {
    const route = item.toLowerCase().replace(/ /g, '-');
    router.push(`/${route}`);
  };

  return <ProfileScreen userProfile={userProfile} onMenuItemClick={handleMenuItemClick} />;
}
