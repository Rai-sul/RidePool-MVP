import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';
import { router } from 'expo-router';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  async registerForPushNotifications(): Promise<string | null> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('pool-requests', {
          name: 'Pool Requests',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      await apiClient.post(API_ENDPOINTS.USER.DEVICE_TOKEN, {
        token,
        platform: Platform.OS,
      });

      return token;
    } catch (error) {
      console.log('Failed to register for push notifications:', error);
      return null;
    }
  },

  setupNotificationListeners() {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.action === 'VIEW_POOL' && data?.pool_id) {
          router.navigate('/(tabs)/home');
        }
      }
    );

    return () => {
      responseSubscription.remove();
    };
  },
};
