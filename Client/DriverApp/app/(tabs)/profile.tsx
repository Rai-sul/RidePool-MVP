import { useRouter } from 'expo-router';
import { ProfileScreen } from '../../src/components/screens/ProfileScreen.native';
import { authService } from '../../src/services/auth.service';
import { useDriverStore } from '../../src/store/useDriverStore';

export default function Profile() {
  const router = useRouter();
  const { logout } = useDriverStore();

  const handleNavigateToSettings = () => {
    router.push('/settings');
  };

  const handleNavigateToContactInfo = () => {
    router.push('/contact-info');
  };

  const handleNavigateToHelp = () => {
    router.push('/help');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue with local logout even if server logout fails
    }
    logout();
    router.replace('/');
  };

  return (
    <ProfileScreen
      onNavigateToSettings={handleNavigateToSettings}
      onNavigateToContactInfo={handleNavigateToContactInfo}
      onNavigateToHelp={handleNavigateToHelp}
      onLogout={handleLogout}
    />
  );
}
