import { useState, useEffect, useCallback, useRef } from 'react';
import { Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { HomeScreen } from '../../src/components/home/HomeScreen.native';
import { driverService } from '../../src/services/driver.service';
import { locationService } from '../../src/services/location.service';
import { useDriverStore } from '../../src/store/useDriverStore';
import type { Pool, Location } from '../../src/types';

export default function Home() {
  const {
    availablePools,
    setAvailablePools,
    currentLocation,
    setCurrentLocation,
    driverStatus,
    setDriverStatus,
    setActivePool,
    incomingPoolRequest,
    setIncomingPoolRequest,
    setLoading,
    setError,
  } = useDriverStore();

  const [selectedPoolForDetails, setSelectedPoolForDetails] = useState<Pool | null>(null);
  const isOnline = driverStatus === 'ONLINE';
  const goingOnlineRef = useRef(false);

  const fetchAvailablePools = useCallback(async () => {
    if (!isOnline) return;
    try {
      const response = await driverService.getAvailablePools();
      if (response.success && response.data?.pools) {
        setAvailablePools(response.data.pools);
      }
    } catch (err) {
      // Silently fail — driver may not be online yet
    }
  }, [isOnline, setAvailablePools]);

  const handleGoOnline = useCallback(async (location: Location) => {
    if (goingOnlineRef.current) return;
    goingOnlineRef.current = true;
    try {
      const response = await driverService.goOnline({
        current_location: location,
      });
      if (response.success) {
        setDriverStatus('ONLINE');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to go online');
    } finally {
      goingOnlineRef.current = false;
    }
  }, [setDriverStatus, setError]);

  const handleGoOffline = useCallback(async () => {
    try {
      const response = await driverService.goOffline();
      if (response.success) {
        setDriverStatus('OFFLINE');
        setAvailablePools([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to go offline');
    }
  }, [setDriverStatus, setAvailablePools, setError]);

  const handleToggleOnline = useCallback(async () => {
    if (isOnline) {
      await handleGoOffline();
    } else if (currentLocation) {
      await handleGoOnline(currentLocation);
    } else {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        await handleGoOnline(location);
      } else {
        setError('Unable to get your location. Please enable location services.');
      }
    }
  }, [isOnline, currentLocation, handleGoOnline, handleGoOffline, setCurrentLocation, setError]);

  // Initialize: request location permissions and get current position
  useEffect(() => {
    const init = async () => {
      const permissions = await locationService.requestAllPermissions();
      if (permissions.foreground) {
        const location = await locationService.getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
        }
      }
    };
    init();
  }, [setCurrentLocation]);

  // Poll for available pools when online
  useEffect(() => {
    if (!isOnline) return;

    fetchAvailablePools();
    const interval = setInterval(fetchAvailablePools, 15000);
    return () => clearInterval(interval);
  }, [isOnline, fetchAvailablePools]);

  // Listen for push notifications
  useEffect(() => {
    const notificationSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, any> | undefined;
      if (!data) return;

      if (data.action === 'VIEW_POOL' && data.pool_id) {
        setIncomingPoolRequest({
          id: String(data.pool_id),
          passengers: [],
          total_earnings: data.estimated_earnings ? Number(data.estimated_earnings) : 0,
          fare_per_person: 0,
          current_passengers: data.passengers ? Number(data.passengers) : 0,
          max_passengers: 4,
          nearest_pickup_km: null,
          destination: data.destination_address ? {
            lat: Number(data.destination_lat || 0),
            lng: Number(data.destination_lng || 0),
            address: String(data.destination_address),
          } : undefined,
        } as Pool);
        fetchAvailablePools();
      }
    });

    return () => notificationSub.remove();
  }, [setIncomingPoolRequest, fetchAvailablePools]);

  // Watch location and send updates to server
  useEffect(() => {
    if (!isOnline) return;

    let subscription: { remove: () => void } | null = null;

    const startWatching = async () => {
      try {
        subscription = await locationService.watchLocation(
          (location) => {
            setCurrentLocation(location);
            driverService.updateLocation(location).catch(() => {});
          },
          { distanceInterval: 50, timeInterval: 10000 }
        );
      } catch (error) {
        console.log('Error starting location watch:', error);
      }
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isOnline, setCurrentLocation]);

  const handlePoolSelect = (pool: Pool | null) => {
    setSelectedPoolForDetails(pool);
  };

  const handleAcceptPool = async (poolId: string) => {
    try {
      setLoading(true);
      const response = await driverService.acceptPool(poolId);
      if (response.success && response.data) {
        setSelectedPoolForDetails(null);
        setIncomingPoolRequest(null);
        setActivePool({ id: poolId } as Pool);
        setAvailablePools([]);

        // Open Google Maps navigation to nearest pickup
        const navUrl = response.data.navigation_url;
        if (navUrl) {
          const canOpen = await Linking.canOpenURL(navUrl);
          if (canOpen) {
            await Linking.openURL(navUrl);
          } else {
            Alert.alert('Navigation', 'Could not open Google Maps. Please navigate manually.');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept pool');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptIncoming = async (poolId: string) => {
    setIncomingPoolRequest(null);
    await handleAcceptPool(poolId);
  };

  const handleDismissIncoming = () => {
    setIncomingPoolRequest(null);
  };

  const driverLocation = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : null;

  return (
    <HomeScreen
      pools={availablePools ?? []}
      driverLocation={driverLocation}
      isOnline={isOnline}
      onToggleOnline={handleToggleOnline}
      selectedPoolForDetails={selectedPoolForDetails}
      onPoolSelect={handlePoolSelect}
      onAcceptPool={handleAcceptPool}
      incomingPoolRequest={incomingPoolRequest as any}
      onAcceptIncoming={handleAcceptIncoming}
      onDismissIncoming={handleDismissIncoming}
    />
  );
}
