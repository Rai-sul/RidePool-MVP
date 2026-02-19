import '../styles/globals.css';
import React, { Component, ErrorInfo } from 'react';
import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import BottomNav from '../components/BottomNav';
import ActiveTripButton from '../components/ActiveTripButton';
import PriyoSathiRideInviteHandler from '../components/PriyoSathiRideInviteHandler';
import { GlobalProvider, useGlobalContext } from '../contexts/GlobalContext';
import { AuthProvider, useAuthContext } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Error boundary: prevents navigation context errors in overlays from crashing the Stack/screens.
// Realtime updates (e.g. Supabase pool events) can briefly invalidate the navigation context
// during re-renders — this boundary isolates that failure to the overlay layer only.
class OverlayErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    console.warn('[OverlayErrorBoundary] Caught (will auto-recover):', error.message);
    // Auto-recover: navigation context is available again on the next render cycle
    setTimeout(() => this.setState({ hasError: false }), 0);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const HIDE_BOTTOM_NAV = ['/', '/login', '/profile-setup', '/chat', '/support-chat', '/driver-chat'];
const HIDE_TRIP_BUTTON = ['/', '/login', '/profile-setup'];

// Overlay components (BottomNav, ActiveTripButton, etc.) depend on usePathname which
// requires navigation context. Isolated here so a context failure doesn't crash screens.
function LayoutOverlays() {
  const pathname = usePathname();
  const { userProfile } = useGlobalContext();
  const { isAuthenticated } = useAuthContext();

  const showBottomNav = isAuthenticated && !HIDE_BOTTOM_NAV.includes(pathname);
  const showActiveTripButton = isAuthenticated && !HIDE_TRIP_BUTTON.includes(pathname);

  return (
    <>
      {showBottomNav && <BottomNav isFemale={userProfile?.gender === 'female'} />}
      {showActiveTripButton && <ActiveTripButton />}
      <PriyoSathiRideInviteHandler />
    </>
  );
}

function AppLayout() {
        return (
            <View style={{ flex: 1 }}>
              <Stack initialRouteName='(tabs)'>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
                <Stack.Screen name="home" options={{ headerShown: false }} />
                <Stack.Screen name="wallet" options={{ headerShown: false }} />
                <Stack.Screen name="add-money" options={{ headerShown: true, headerTitle: 'Add Money' }} />
                <Stack.Screen name="payment-methods" options={{ headerShown: true, headerTitle: 'Payment Methods' }} />
                <Stack.Screen name="promo-code" options={{ headerShown: true, headerTitle: 'Promo Code' }} />
                <Stack.Screen name="all-transactions" options={{ headerShown: true, headerTitle: 'All Transactions' }} />
                <Stack.Screen name="friends" options={{ headerShown: false }} />
                <Stack.Screen name="trips" options={{ headerShown: false }} />
                <Stack.Screen name="help-support" options={{ headerShown: true, headerTitle: 'Help & Support' }} />
                <Stack.Screen name="personal-info" options={{ headerShown: true, headerTitle: 'Personal Info' }} />
                <Stack.Screen name="saved-places" options={{ headerShown: true, headerTitle: 'Saved Places' }} />
                <Stack.Screen name="your-ratings" options={{ headerShown: true, headerTitle: 'All Ratings' }} />
                <Stack.Screen name="settings" options={{ headerShown: true, headerTitle: 'Settings' }} />
                <Stack.Screen name="notifications" options={{ headerShown: true, headerTitle: 'Notifications' }} />
                <Stack.Screen name="language" options={{ headerShown: true, headerTitle: 'Language' }} />
                <Stack.Screen name="gender-preference" options={{ headerShown: true, headerTitle: 'Gender Preference' }} />
                <Stack.Screen name="safety-center" options={{ headerShown: true, headerTitle: 'Safety Center' }} />
                <Stack.Screen name="profile" options={{ headerShown: false }} />
                <Stack.Screen name="ride-confirmation" options={{ headerShown: false }} />
                <Stack.Screen name="searching" options={{ headerShown: false }} />
                <Stack.Screen name="trip-progress" options={{ headerShown: true, headerTitle: 'Trip Progress' }} />
                <Stack.Screen name="payment-summary" options={{ headerShown: true, headerTitle: 'Payment Summary' }} />
                <Stack.Screen name="chat" options={{ headerShown: false }} />
                <Stack.Screen name="support-chat" options={{ headerShown: false }} />
                <Stack.Screen name="driver-chat" options={{ headerShown: false }} />
              </Stack>
              <OverlayErrorBoundary>
                <LayoutOverlays />
              </OverlayErrorBoundary>
            </View>
        );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // Provider order is important: ThemeProvider must be outermost for Expo Router navigation to work properly
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <GlobalProvider>
              <AppLayout />
            </GlobalProvider>
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
