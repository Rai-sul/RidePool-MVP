import { Tabs } from 'expo-router';
import { Home, Wallet, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function TabLayout() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }} 
      />
      <Tabs.Screen 
        name="earnings" 
        options={{ 
          title: 'Earnings',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: colors.text,
          },
          headerLeft: () => (
            <Pressable 
              onPress={() => router.back()}
              style={{ 
                marginLeft: 16,
                padding: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: colors.text,
          },
          headerLeft: () => (
            <Pressable 
              onPress={() => router.back()}
              style={{ 
                marginLeft: 16,
                padding: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }} 
      />
    </Tabs>
  );
}
