import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native-web';
import { MapPin, Home, Briefcase, Dumbbell, Plane, Search } from './Icons';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import DestinationSearch from './DestinationSearch';
import WebMap from './WebMap';
import type { UserProfile, Destination } from '../App';

type HomeMapProps = {
  userProfile: UserProfile | null;
  onDestinationSelect: (destination: Destination, rideType?: 'female-only' | 'regular') => void;
};

const quickDestinations = [
  { name: 'Home', icon: Home, address: '123 Main Street, Dhaka' },
  { name: 'Work', icon: Briefcase, address: 'Gulshan Office Complex' },
  { name: 'Gym', icon: Dumbbell, address: 'Fitness Center, Banani' },
  { name: 'Airport', icon: Plane, address: 'Hazrat Shahjalal Airport' },
];

export default function HomeMap({ userProfile, onDestinationSelect }: HomeMapProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedRideType, setSelectedRideType] = useState<'female-only' | 'regular' | null>(null);
  const [currentLocation, setCurrentLocation] = useState({ latitude: 23.8103, longitude: 90.4125 }); // Default Dhaka
  const initials = userProfile ? `${userProfile.firstName[0]}${userProfile.lastName[0]}` : 'U';
  const isFemale = userProfile?.gender === 'female';

  // Try to get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error.message);
        }
      );
    }
  }, []);

  const handleDestinationClick = () => {
    if (isFemale && !selectedRideType) {
      return;
    }
    setIsSearchOpen(true);
  };

  const handleDestinationSelect = (destination: Destination) => {
    onDestinationSelect(destination, selectedRideType || undefined);
  };

  const handleQuickDestinationSelect = (destination: Destination) => {
    if (isFemale && !selectedRideType) {
      return;
    }
    onDestinationSelect(destination, selectedRideType || undefined);
  };

  return (
    <View style={styles.container}>
      {/* Map Background */}
      <View style={styles.mapContainer}>
        <WebMap
          center={currentLocation}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        />
      </View>

      {/* Top Card */}
      <View style={styles.topCard}>
        <View style={styles.searchCard}>
          <TouchableOpacity
            onPress={handleDestinationClick}
            style={[
              styles.searchTouchable,
              isFemale && !selectedRideType && styles.searchDisabled,
            ]}
            disabled={isFemale && !selectedRideType}
          >
            <Search style={styles.searchIcon} />
            <Text style={styles.searchText}>
              {isFemale && !selectedRideType ? 'Select ride type first' : 'Where to?'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.locationRow}>
            <MapPin style={styles.locationIcon} />
            <Text style={styles.locationText}>Current Location</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Avatar Button */}
      <View style={styles.avatarContainer}>
        <TouchableOpacity>
          <Avatar className="w-12 h-12 border-2 border-white shadow-md">
            <AvatarFallback className="bg-blue-600 text-white">{initials}</AvatarFallback>
          </Avatar>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomContent}>
          {/* Ride Type Selection for Female Users */}
          {isFemale && (
            <View style={styles.rideTypeSection}>
              <Text style={styles.rideTypeLabel}>Select Ride Type</Text>
              <View style={styles.rideTypeButtons}>
                <Button 
                  onPress={() => setSelectedRideType('female-only')}
                  className={`flex-1 h-12 ${
                    selectedRideType === 'female-only'
                      ? 'bg-pink-500 text-white'
                      : 'bg-pink-50 text-pink-700 border-2 border-pink-300'
                  }`}
                >
                  RideShare with Female
                </Button>
                <Button 
                  onPress={() => setSelectedRideType('regular')}
                  variant={selectedRideType === 'regular' ? 'default' : 'outline'}
                  className={`flex-1 h-12 ${
                    selectedRideType === 'regular'
                      ? 'bg-blue-600 text-white'
                      : 'border-2'
                  }`}
                >
                  Regular RideShare
                </Button>
              </View>
              {!selectedRideType && (
                <Text style={styles.rideTypeHint}>
                  Please select a ride type to continue
                </Text>
              )}
            </View>
          )}
          
          <Text style={styles.quickDestLabel}>Quick Destinations</Text>
          
          <View style={styles.quickDestRow}>
            {quickDestinations.map((dest) => {
              const Icon = dest.icon;
              return (
                <Button
                  key={dest.name}
                  variant="outline"
                  className={`flex-shrink-0 h-auto px-6 py-3 rounded-full border-2 ${
                    isFemale && !selectedRideType ? 'opacity-50' : ''
                  }`}
                  onPress={() => handleQuickDestinationSelect({ name: dest.name, address: dest.address })}
                  disabled={isFemale && !selectedRideType}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {dest.name}
                </Button>
              );
            })}
          </View>
        </View>
      </View>

      {/* Destination Search Dialog */}
      <DestinationSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDestination={handleDestinationSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f3f4f6',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 10,
  },
  searchCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  searchDisabled: {
    opacity: 0.5,
  },
  searchIcon: {
    width: 20,
    height: 20,
    color: '#9ca3af',
  },
  searchText: {
    flex: 1,
    color: '#6b7280',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  locationIcon: {
    width: 16,
    height: 16,
    color: '#2563eb',
  },
  locationText: {
    fontSize: 14,
    color: '#4b5563',
  },
  avatarContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  bottomContent: {
    gap: 16,
  },
  rideTypeSection: {
    gap: 12,
  },
  rideTypeLabel: {
    color: '#4b5563',
  },
  rideTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rideTypeHint: {
    fontSize: 14,
    color: '#db2777',
    textAlign: 'center',
  },
  quickDestLabel: {
    color: '#4b5563',
  },
  quickDestRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
});