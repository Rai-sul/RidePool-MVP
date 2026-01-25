
import RideConfirmation from '../components/RideConfirmation.native';
import { useGlobalContext, toDisplayPool } from '../contexts/GlobalContext';
import { useRouter, router as staticRouter } from 'expo-router';
import { Pool } from '../types';

export default function RideConfirmationScreen() {
  const { userProfile, pickupLocation, selectedDestination, selectedRideType, setSelectedPool, startTrip } = useGlobalContext();
  const router = useRouter();

  const handlePoolSelect = (pool: Pool) => {
    // Convert API pool to display pool and start the trip
    const displayPool = toDisplayPool(pool);
    setSelectedPool(displayPool);
    startTrip(displayPool);
    
    // WORKAROUND for Expo Router bug #38423: Use static router import
    // Static router doesn't rely on React context, avoiding the navigation context error
    requestAnimationFrame(() => {
      staticRouter.replace('/searching');
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <RideConfirmation
      pickupLocation={pickupLocation}
      destination={selectedDestination}
      userProfile={userProfile}
      rideType={selectedRideType}
      onPoolSelect={handlePoolSelect}
      onBack={handleBack}
    />
  );
}
