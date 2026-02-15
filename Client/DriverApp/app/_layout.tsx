import '../styles/globals.css';
import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { DriverBottomNav } from '../src/components/layout/DriverBottomNav.native';
import { useDriverStore } from '../src/store/useDriverStore';
import { notificationService } from '../src/services/notification.service';

function AppLayout() {
  const pathname = usePathname();
  const { isAuthenticated } = useDriverStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    notificationService.registerForPushNotifications();
    const cleanup = notificationService.setupNotificationListeners();
    return cleanup;
  }, [isAuthenticated]);

  const showBottomNav =
    isAuthenticated &&
    pathname !== '/' &&
    pathname !== '/register' &&
    ['/home', '/earnings', '/profile'].some(p => pathname.startsWith(p));

  return (
    <View style={{ flex: 1 }}>
      <Stack initialRouteName="(tabs)">
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="safety" options={{ headerShown: false }} />
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="contact-info" options={{ headerShown: false }} />
      </Stack>
      {showBottomNav && <DriverBottomNav />}
      <StatusBar style="auto" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppLayout />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
