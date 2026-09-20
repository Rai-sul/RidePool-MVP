import { View, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Wallet, User } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

type TabId = 'home' | 'earnings' | 'profile';

const tabs: { id: TabId; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'earnings', icon: Wallet, label: 'Earnings' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function DriverBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const activeTab = tabs.find(t => pathname.startsWith(`/${t.id}`))?.id || 'home';

  const handleTabChange = (tab: TabId) => {
    router.push(`/(tabs)/${tab}`);
  };

  const activeColor = colors.primary;
  const inactiveColor = colors.textSecondary;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom,
        zIndex: 100,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: 60,
          paddingHorizontal: 8,
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => handleTabChange(tab.id)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingVertical: 8,
              }}
            >
              <Icon
                color={isActive ? activeColor : inactiveColor}
                size={24}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: isActive ? activeColor : inactiveColor,
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
