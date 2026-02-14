import { useState, useEffect, useCallback } from 'react';
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
    priorityLocation,
    setPriorityLocation,
    setLoading,
    setError,
  } = useDriverStore();

  const [selectedPoolForDetails, setSelectedPoolForDetails] = useState<Pool | null>(null);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [showPromotions, setShowPromotions] = useState(false);

  const fetchAvailablePools = useCallback(async () => {
    try {
      const response = await driverService.getAvailablePools();
      if (response.success && response.data) {
        setAvailablePools(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pools');
    }
  }, [setAvailablePools, setError]);

  const initLocation = useCallback(async () => {
    const permissions = await locationService.requestAllPermissions();
    if (permissions.foreground) {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
    }
  }, [setCurrentLocation]);

  useEffect(() => {
    initLocation();
    fetchAvailablePools();

    const interval = setInterval(() => {
      fetchAvailablePools();
    }, 30000);

    return () => clearInterval(interval);
  }, [initLocation, fetchAvailablePools]);

  useEffect(() => {
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
  }, [setCurrentLocation]);

  const handlePoolSelect = (pool: Pool | null) => {
    setSelectedPoolForDetails(pool);
  };

  const handleAcceptPool = async (poolId: string) => {
    try {
      setLoading(true);
      const response = await driverService.acceptPool(poolId);
      if (response.success) {
        setSelectedPoolForDetails(null);
        await fetchAvailablePools();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept pool');
    } finally {
      setLoading(false);
    }
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

  const driverLocation = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : null;

  return (
    <HomeScreen
      pools={availablePools}
      driverLocation={driverLocation}
      selectedPoolForDetails={selectedPoolForDetails}
      onPoolSelect={handlePoolSelect}
      onAcceptPool={handleAcceptPool}
      priorityLocation={priorityLocation?.address || null}
      showPriorityDialog={showPriorityDialog}
      setShowPriorityDialog={setShowPriorityDialog}
      onSetPriority={handleSetPriority}
      onClearPriority={handleClearPriority}
      showPromotions={showPromotions}
      setShowPromotions={setShowPromotions}
    />
  );
}
