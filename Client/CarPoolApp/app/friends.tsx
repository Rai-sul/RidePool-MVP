import FriendsScreen from '../components/FriendsScreen';
import { useGlobalContext } from '../contexts/GlobalContext';

export default function Friends() {
  const { userProfile } = useGlobalContext();

  return <FriendsScreen userProfile={userProfile} />;
}
