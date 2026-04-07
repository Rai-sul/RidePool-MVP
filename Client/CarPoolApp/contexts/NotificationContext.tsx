import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuthContext } from './AuthContext';
import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';

// Configure notification handler - show notification even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PriyoSathiInvite {
  rideId: string;
  inviterName: string;
  notificationId?: string;
}

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  priyoSathiInvite: PriyoSathiInvite | null;
  clearPriyoSathiInvite: () => void;
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [priyoSathiInvite, setPriyoSathiInvite] = useState<PriyoSathiInvite | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { user, isAuthenticated } = useAuthContext();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Push notifications not supported on web');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return null;
      }

      // Get Expo push token using project ID from constants
      // Note: This requires Firebase to be configured for Android
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || process.env.EXPO_PUBLIC_PROJECT_ID;
      
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        
        const token = tokenData.data;
        console.log('[Notifications] Push token obtained:', token.substring(0, 20) + '...');

        // Configure Android channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2563eb',
          });

          // Create a separate high-priority channel for ride invites
          await Notifications.setNotificationChannelAsync('ride-invites', {
            name: 'Ride Invites',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 500, 250, 500],
            lightColor: '#10b981',
            sound: 'default',
          });
        }

        return token;
      } catch (tokenError: any) {
        // Firebase not configured or other token error - this is expected in dev
        console.log('[Notifications] Could not get push token (Firebase may not be configured):', tokenError.message);
        return null;
      }
    } catch (error: any) {
      console.log('[Notifications] Error during push notification setup:', error.message);
      return null;
    }
  }, []);

  // Send push token to server
  const sendTokenToServer = useCallback(async (token: string) => {
    if (!isAuthenticated) return;

    try {
      await apiClient.post(API_ENDPOINTS.USER.DEVICE_TOKEN, {
        token,
        platform: Platform.OS,
        app_type: 'rider',
      });
      console.log('[Notifications] Token registered with server');
    } catch (error) {
      // Silently fail - network errors are expected, especially during dev
      // Token registration will be retried on next app start
    }
  }, [isAuthenticated]);

  // Handle incoming notification
  const handleNotification = useCallback((notification: Notifications.Notification) => {
    console.log('[Notifications] Received notification:', notification.request.content);
    setNotification(notification);

    const data = notification.request.content.data;
    
    // Check if this is a Priyo Sathi ride invite
    if (data?.ride_id && data?.inviter) {
      console.log('[Notifications] Priyo Sathi ride invite detected');
      setPriyoSathiInvite({
        rideId: data.ride_id as string,
        inviterName: data.inviter as string,
        notificationId: notification.request.identifier,
      });
    }

    // Increment unread count
    setUnreadCount(prev => prev + 1);
  }, []);

  // Handle notification response (user tapped on notification)
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    console.log('[Notifications] User interacted with notification');
    const data = response.notification.request.content.data;

    // Check if this is a Priyo Sathi ride invite
    if (data?.ride_id && data?.inviter) {
      console.log('[Notifications] User tapped on Priyo Sathi invite');
      setPriyoSathiInvite({
        rideId: data.ride_id as string,
        inviterName: data.inviter as string,
        notificationId: response.notification.request.identifier,
      });
    }
  }, []);

  // Clear Priyo Sathi invite and mark the notification as read
  const clearPriyoSathiInvite = useCallback(async () => {
    // Get the notification ID before clearing
    const notificationId = priyoSathiInvite?.notificationId;
    
    // Clear the local state immediately
    setPriyoSathiInvite(null);
    
    // Mark the notification as read on the server to prevent it from showing again
    if (notificationId) {
      try {
        await apiClient.post(API_ENDPOINTS.USER.NOTIFICATION_READ(notificationId), {});
      } catch (error) {
        // Silently fail - not critical
      }
    }
  }, [priyoSathiInvite?.notificationId]);

  // Track already shown notification IDs to prevent duplicates across polling cycles
  const shownNotificationIds = useRef<Set<string>>(new Set());

  // Poll for Priyo Sathi ride invites (fallback when push notifications aren't available)
  const checkForPriyoSathiInvites = useCallback(async () => {
    if (!isAuthenticated) return;
    
    // Don't poll if we're already showing an invite
    if (priyoSathiInvite) return;

    try {
      // Fetch recent unread notifications
      const response = await apiClient.get<{ 
        success: boolean; 
        data: { 
          notifications: Array<{
            id: string;
            type: string;
            title: string;
            message: string;
            metadata: any;
            is_read: boolean;
            created_at: string;
          }>;
          unread: number;
        } 
      }>(
        API_ENDPOINTS.USER.NOTIFICATIONS,
        { limit: 10 }
      );

      if (response.success && response.data?.notifications) {
        // Look for unread Priyo Sathi invite notifications
        // Filter out notifications we've already shown in this session
        const inviteNotification = response.data.notifications.find(
          n => !n.is_read && 
               n.metadata?.ride_id && 
               n.metadata?.ride_id !== 'preview' && // Skip preview notifications
               n.metadata?.inviter &&
               !shownNotificationIds.current.has(n.id) // Skip already shown
        );

        if (inviteNotification) {
          console.log('[Notifications] Found Priyo Sathi invite via polling:', inviteNotification.id);
          // Add to shown set to prevent showing again
          shownNotificationIds.current.add(inviteNotification.id);
          setPriyoSathiInvite({
            rideId: inviteNotification.metadata.ride_id,
            inviterName: inviteNotification.metadata.inviter,
            notificationId: inviteNotification.id,
          });
        }

        // Update unread count
        setUnreadCount(response.data.unread || 0);
      }
    } catch (error) {
      // Silently fail - polling errors shouldn't spam console
    }
  }, [isAuthenticated, priyoSathiInvite]);

  // Fetch unread notification count from server
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await apiClient.get<{ success: boolean; data: { unread: number } }>(
        API_ENDPOINTS.USER.NOTIFICATIONS,
        { limit: 1 }
      );
      if (response.success && response.data) {
        setUnreadCount(response.data.unread || 0);
      }
    } catch (error) {
      // Silently fail - network errors are expected and shouldn't spam console
      // The unread count is not critical functionality
    }
  }, [isAuthenticated]);

  // Polling interval ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Register for notifications when user logs in
  useEffect(() => {
    if (!isAuthenticated) {
      // User logged out - clear state and stop polling
      setExpoPushToken(null);
      setNotification(null);
      setPriyoSathiInvite(null);
      setUnreadCount(0);
      shownNotificationIds.current.clear(); // Clear shown IDs on logout
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const setupNotifications = async () => {
      const token = await registerForPushNotifications();
      if (token) {
        setExpoPushToken(token);
        await sendTokenToServer(token);
      }
      
      // Initial check for invites
      await checkForPriyoSathiInvites();
      
      // Start polling for invites every 10 seconds (fallback for when push doesn't work)
      pollingIntervalRef.current = setInterval(() => {
        checkForPriyoSathiInvites();
      }, 10000);
    };

    setupNotifications();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, registerForPushNotifications, sendTokenToServer, checkForPriyoSathiInvites]);

  // Set up notification listeners
  useEffect(() => {
    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(handleNotification);

    // Listen for notification interactions (user tap)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Check for any notifications that launched the app
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        handleNotificationResponse(response);
      }
    }).catch(() => {
      // Ignore errors when checking for last notification
    });

    return () => {
      // Use .remove() method on the subscription object (newer expo-notifications API)
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotification, handleNotificationResponse]);

  // Refresh unread count when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isAuthenticated) {
        refreshUnreadCount();
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        priyoSathiInvite,
        clearPriyoSathiInvite,
        unreadCount,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
