import { useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { TripProgress } from '../src/components/pool/TripProgress.native';
import { useDriverStore } from '../src/store/useDriverStore';

export default function TripProgressPage() {
  const router = useRouter();
  const { activePool, setActivePool, currentLocation } = useDriverStore();

  const poolId = activePool?.id;

  const handleComplete = useCallback(() => {
    setActivePool(null);
    router.replace('/(tabs)/home' as any);
  }, [setActivePool, router]);

  const handleCancel = useCallback(() => {
    setActivePool(null);
    router.replace('/(tabs)/home' as any);
  }, [setActivePool, router]);

  // Redirect to home if no active pool
  useEffect(() => {
    if (!poolId) {
      router.replace('/(tabs)/home' as any);
    }
  }, [poolId, router]);

  if (!poolId) {
    return null;
  }

  const initialLocation = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : null;

  return (
    <TripProgress
      poolId={poolId}
      initialLocation={initialLocation}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
