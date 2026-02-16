import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { HomeScreen } from '../../src/components/home/HomeScreen.native';
import { driverService } from '../../src/services/driver.service';
import { locationService } from '../../src/services/location.service';
import { useDriverStore } from '../../src/store/useDriverStore';
import type { Pool, Location } from '../../src/types';

interface PoolRequestData {
  pool_id: string;
  vehicle_type?: string;
  passengers?: number;
  estimated_earnings?: number;
  pickup_lat?: number;
  pickup_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  destination_address?: string;
  pickup_address?: string;
}

export default function Home() {
  const {
    availablePools,
    setAvailablePools,
    currentLocation,
    setCurrentLocation,
    driverStatus,
    setDriverStatus,
    priorityLocation,
    setPriorityLocation,
    searchZone,
    setSearchZone,
    incomingPoolRequest,
    setIncomingPoolRequest,
    setLoading,
    setError,
  } = useDriverStore();

  const [selectedPoolForDetails, setSelectedPoolForDetails] = useState<Pool | null>(null);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [showSearchZoneDialog, setShowSearchZoneDialog] = useState(false);
  const [showPromotions, setShowPromotions] = useState(false);
  const isOnline = driverStatus === 'ONLINE';
  const goingOnlineRef = useRef(false);

  const fetchAvailablePools = useCallback(async () => {
    if (!isOnline) return;
    try {
      const response = await driverService.getAvailablePools();
      if (response.success && response.data) {
        setAvailablePools(response.data);
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
      // Try to get location first
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        await handleGoOnline(location);
      } else {
        setError('Unable to get your location. Please enable location services.');
      }
    }
  }, [isOnline, currentLocation, handleGoOnline, handleGoOffline, setCurrentLocation, setError]);

  // Initialize: request location permissions and get current position (do NOT auto go-online)
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
    const interval = setInterval(fetchAvailablePools, 30000);
    return () => clearInterval(interval);
  }, [isOnline, fetchAvailablePools]);

  // Listen for push notifications
  useEffect(() => {
    const notificationSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, any> | undefined;
      if (!data) return;

      if (data.action === 'VIEW_POOL' && data.pool_id) {
        const poolRequest: PoolRequestData = {
          pool_id: String(data.pool_id),
          vehicle_type: data.vehicle_type ? String(data.vehicle_type) : undefined,
          passengers: data.passengers ? Number(data.passengers) : undefined,
          estimated_earnings: data.estimated_earnings ? Number(data.estimated_earnings) : undefined,
          pickup_lat: data.pickup_lat ? Number(data.pickup_lat) : undefined,
          pickup_lng: data.pickup_lng ? Number(data.pickup_lng) : undefined,
          pickup_address: data.pickup_address ? String(data.pickup_address) : undefined,
          destination_lat: data.destination_lat ? Number(data.destination_lat) : undefined,
          destination_lng: data.destination_lng ? Number(data.destination_lng) : undefined,
          destination_address: data.destination_address ? String(data.destination_address) : undefined,
        };
        setIncomingPoolRequest(poolRequest as any);
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
      if (response.success) {
        setSelectedPoolForDetails(null);
        setIncomingPoolRequest(null);
        await fetchAvailablePools();
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

  const handleSetPriority = async (locationAddress: string) => {
    if (currentLocation) {
      try {
        const priorityLoc: Location = {
          ...currentLocation,
          address: locationAddress,
        };
        await driverService.setPriorityLocation(priorityLoc);
        setPriorityLocation(priorityLoc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set priority');
      }
    }
    setShowPriorityDialog(false);
  };

  const handleClearPriority = async () => {
    try {
      await driverService.clearPriorityLocation();
      setPriorityLocation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear priority');
    }
    setShowPriorityDialog(false);
  };

  const handleSetSearchZone = async (destinationAddress: string) => {
    if (currentLocation) {
      try {
        await driverService.setSearchZone({
          destination_lat: currentLocation.latitude,
          destination_lng: currentLocation.longitude,
          destination_address: destinationAddress,
        });
        setSearchZone({
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
          address: destinationAddress,
        });
        // Refresh pools with new search zone
        await fetchAvailablePools();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set search zone');
      }
    }
    setShowSearchZoneDialog(false);
  };

  const handleClearSearchZone = async () => {
    try {
      await driverService.clearSearchZone();
      setSearchZone(null);
      await fetchAvailablePools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear search zone');
    }
    setShowSearchZoneDialog(false);
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
      priorityLocation={priorityLocation?.address || null}
      showPriorityDialog={showPriorityDialog}
      setShowPriorityDialog={setShowPriorityDialog}
      onSetPriority={handleSetPriority}
      onClearPriority={handleClearPriority}
      searchZone={searchZone}
      showSearchZoneDialog={showSearchZoneDialog}
      setShowSearchZoneDialog={setShowSearchZoneDialog}
      onSetSearchZone={handleSetSearchZone}
      onClearSearchZone={handleClearSearchZone}
      showPromotions={showPromotions}
      setShowPromotions={setShowPromotions}
      incomingPoolRequest={incomingPoolRequest as any}
      onAcceptIncoming={handleAcceptIncoming}
      onDismissIncoming={handleDismissIncoming}
    />
  );
}
