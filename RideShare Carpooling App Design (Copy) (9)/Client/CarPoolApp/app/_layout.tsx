import '../styles/globals.css';
import { Stack, usePathname } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomNav from '../components/BottomNav';
import { GlobalProvider, useGlobalContext } from '../contexts/GlobalContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ArrowLeft } from '../components/Icons';

function AppLayout() {
  const pathname = usePathname();
  const { userProfile } = useGlobalContext();

  const showBottomNav =
    pathname !== '/' &&
    pathname !== '/profile-setup' &&
    pathname !== '/chat' &&
    pathname !== '/support-chat' &&
    pathname !== '/driver-chat';

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
              {showBottomNav && <BottomNav isFemale={userProfile?.gender === 'female'} />}
            </View>
        );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // Provider order is important: ThemeProvider must be outermost for Expo Router navigation to work properly
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <GlobalProvider>
          <AppLayout />
        </GlobalProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
