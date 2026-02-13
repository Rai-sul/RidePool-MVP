import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native-web';
import { MapPin, Tag, Users, Search, ChevronRight, Navigation } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import LocationSearch from './LocationSearch.web';
import type { UserProfile, Destination, Location } from '../contexts/GlobalContext';

const WebMap = React.lazy(() => import('./WebMap'));

type LandingPageProps = {
  userProfile: UserProfile | null;
  onDestinationSelect: (destination: Destination, rideType?: 'female-only' | 'regular') => void;
  onPickupSelect?: (location: Location) => void;
  onProfileClick: () => void;
  onFriendsClick?: () => void;
};

const closeFriends = [
  { name: 'Raisul', initial: 'R', lastSeen: 'Online' },
  { name: 'Fatima', initial: 'F', lastSeen: '2h ago' },
  { name: 'Ahmed', initial: 'A', lastSeen: 'Online' },
];

export default function LandingPage({ userProfile, onDestinationSelect, onPickupSelect, onProfileClick, onFriendsClick }: LandingPageProps) {
  const [isPickupSearchOpen, setIsPickupSearchOpen] = useState(false);
  const [isDestinationSearchOpen, setIsDestinationSearchOpen] = useState(false);
  const [pickupLocation, setPickupLocationState] = useState<Location | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<Location | null>(null);
  const [currentLocation, setCurrentLocation] = useState({ latitude: 23.8103, longitude: 90.4125 });
  
  const initials = userProfile ? `${userProfile.firstName?.[0] || 'U'}${userProfile.lastName?.[0] || ''}` : 'U';
  const isFemale = userProfile?.gender === 'female';

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCurrentLocation(loc);
          // Auto-set pickup to current location
          if (!pickupLocation) {
            const currentLoc = {
              name: 'Current Location',
              address: 'Your current position',
              ...loc
            };
            setPickupLocationState(currentLoc);
            onPickupSelect?.(currentLoc);
          }
        },
        (error) => console.log('Geolocation error:', error.message)
      );
    }
  }, []);

  const handlePickupSelect = (location: Location) => {
    setPickupLocationState(location);
    // Also pass to parent to store in global context
    onPickupSelect?.(location);
  };

  const handleDestinationSelect = (location: Location) => {
    setDestinationLocation(location);
    // Pass to parent with pickup info
    onDestinationSelect({
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  // Calculate map center based on pickup and destination
  const mapCenter = pickupLocation || currentLocation;
  const showRoute = pickupLocation && destinationLocation;

  return (
    <View style={styles.container}>
      {/* Map Background */}
      <View style={styles.mapContainer}>
        <React.Suspense fallback={<View style={styles.mapPlaceholder}><Text>Loading map...</Text></View>}>
          <WebMap 
            center={mapCenter} 
            zoom={showRoute ? 12 : 14}
            pickupLocation={pickupLocation || undefined}
            dropoffLocation={destinationLocation || undefined}
            showDirections={showRoute}
          />
        </React.Suspense>
      </View>

      {/* Top Search Card */}
      <View style={styles.topCard}>
        <View style={styles.searchCard}>
          <View style={styles.welcomeRow}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{userProfile?.firstName || 'User'}</Text>
            </View>
            <TouchableOpacity onPress={onProfileClick}>
              <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                <AvatarFallback className={isFemale ? 'bg-pink-500' : 'bg-blue-600'}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </AvatarFallback>
              </Avatar>
            </TouchableOpacity>
          </View>
          
          {/* Pickup and Destination Inputs */}
          <View style={styles.locationInputs}>
            {/* Pickup Location */}
            <TouchableOpacity onPress={() => setIsPickupSearchOpen(true)} style={styles.locationRow}>
              <View style={[styles.locationIcon, { backgroundColor: '#dcfce7' }]}>
                <Navigation style={{ width: 16, height: 16, color: '#22c55e' }} />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationValue} numberOfLines={1}>
                  {pickupLocation?.name || 'Set pickup location'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Divider with dots */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDots}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>

            {/* Destination */}
            <TouchableOpacity onPress={() => setIsDestinationSearchOpen(true)} style={styles.locationRow}>
              <View style={[styles.locationIcon, { backgroundColor: '#fee2e2' }]}>
                <MapPin style={{ width: 16, height: 16, color: '#ef4444' }} />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Destination</Text>
                <Text style={styles.locationValue} numberOfLines={1}>
                  {destinationLocation?.name || 'Where to?'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Find Ride Button */}
          {pickupLocation && destinationLocation && (
            <Button 
              onPress={() => onDestinationSelect(destinationLocation)}
              className={`w-full h-12 mt-4 ${isFemale ? 'bg-pink-500' : 'bg-blue-600'}`}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Find a Ride</Text>
            </Button>
          )}
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: isFemale ? '#fce7f3' : '#dbeafe' }]}>
              <Tag style={{ width: 20, height: 20, color: isFemale ? '#ec4899' : '#2563eb' }} />
            </View>
            <Text style={styles.quickActionText}>Promotions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction} onPress={onFriendsClick}>
            <View style={[styles.quickActionIcon, { backgroundColor: isFemale ? '#fce7f3' : '#dbeafe' }]}>
              <Users style={{ width: 20, height: 20, color: isFemale ? '#ec4899' : '#2563eb' }} />
            </View>
            <Text style={styles.quickActionText}>Friends</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Close Friends */}
        <View style={styles.friendsSection}>
          <View style={styles.friendsHeader}>
            <Text style={styles.friendsTitle}>Close Friends</Text>
            <TouchableOpacity onPress={onFriendsClick}>
              <Text style={[styles.seeAllText, { color: isFemale ? '#ec4899' : '#2563eb' }]}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsScroll}>
            {closeFriends.map((friend, idx) => (
              <TouchableOpacity key={idx} style={styles.friendCard}>
                <Avatar className="w-12 h-12">
                  <AvatarFallback className={isFemale ? 'bg-pink-100' : 'bg-blue-100'}>
                    <Text style={[styles.friendInitial, { color: isFemale ? '#ec4899' : '#2563eb' }]}>{friend.initial}</Text>
                  </AvatarFallback>
                </Avatar>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.friendStatus}>{friend.lastSeen}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Location Search Modals */}
      <LocationSearch
        isOpen={isPickupSearchOpen}
        onClose={() => setIsPickupSearchOpen(false)}
        onSelectLocation={handlePickupSelect}
        title="Set Pickup Location"
        placeholder="Search pickup location..."
        type="pickup"
      />

      <LocationSearch
        isOpen={isDestinationSearchOpen}
        onClose={() => setIsDestinationSearchOpen(false)}
        onSelectLocation={handleDestinationSelect}
        title="Set Destination"
        placeholder="Where do you want to go?"
        type="destination"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 48,
  },
  searchCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  avatarText: {
    color: 'white',
    fontWeight: '600',
  },
  locationInputs: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 28,
  },
  dividerLine: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 24,
  },
  dividerDots: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  quickActionsScroll: {
    gap: 12,
    marginBottom: 20,
  },
  quickAction: {
    alignItems: 'center',
    marginRight: 16,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  friendsSection: {
    marginTop: 8,
  },
  friendsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  friendsScroll: {
    gap: 16,
  },
  friendCard: {
    alignItems: 'center',
    marginRight: 16,
  },
  friendInitial: {
    fontWeight: '600',
  },
  friendName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 6,
  },
  friendStatus: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
});
