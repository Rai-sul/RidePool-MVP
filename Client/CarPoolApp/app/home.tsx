import { useState, useEffect } from 'react';
import LandingPage from '../components/LandingPage';
import RatingModal from '../components/RatingModal.native';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function HomeScreen() {
  const { userProfile, setPickupLocation, setSelectedDestination, setSelectedRideType } = useGlobalContext();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    // Show rating modal if coming from payment
    if (params.showRating === 'true') {
      setShowRatingModal(true);
    }
  }, [params.showRating]);

  const handleDestinationSelect = (destination, rideType) => {
    setSelectedDestination(destination);
    setSelectedRideType(rideType);
    router.push('/ride-confirmation');
  };

  const handlePickupSelect = (location) => {
    setPickupLocation(location);
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  const handleFriendsClick = () => {
    router.push('/friends');
  };

  const handleCloseRating = () => {
    setShowRatingModal(false);
  };

  return (
    <>
      <LandingPage 
        userProfile={userProfile} 
        onDestinationSelect={handleDestinationSelect}
        onPickupSelect={handlePickupSelect}
        onProfileClick={handleProfileClick}
        onFriendsClick={handleFriendsClick}
      />
      <RatingModal
        visible={showRatingModal}
        onClose={handleCloseRating}
        userProfile={userProfile}
      />
    </>
  );
}