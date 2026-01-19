import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRides } from '../hooks/useRides';
import { useLocation } from '../hooks/useLocation';
import { useRouter } from 'expo-router';

export default function CreateRideScreen() {
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [dropoffLat, setDropoffLat] = useState('');
  const [dropoffLng, setDropoffLng] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  const { createRide, loading } = useRides();
  const { location } = useLocation();
  const router = useRouter();

  const useCurrentLocation = () => {
    if (location) {
      setPickupLat(location.latitude.toString());
      setPickupLng(location.longitude.toString());
      setPickupAddress('Current Location');
    }
  };

  const handleCreateRide = async () => {
    const pickup_lat = parseFloat(pickupLat);
    const pickup_lng = parseFloat(pickupLng);
    const dropoff_lat = parseFloat(dropoffLat);
    const dropoff_lng = parseFloat(dropoffLng);

    if (isNaN(pickup_lat) || isNaN(pickup_lng) || isNaN(dropoff_lat) || isNaN(dropoff_lng)) {
      alert('Please enter valid coordinates');
      return;
    }

    const result = await createRide({
      pickup_location: {
        latitude: pickup_lat,
        longitude: pickup_lng,
        address: pickupAddress,
      },
      dropoff_location: {
        latitude: dropoff_lat,
        longitude: dropoff_lng,
        address: dropoffAddress,
      },
      pickup_time: pickupTime || undefined,
    });

    if (result.success) {
      alert('Ride created successfully!');
      router.push('/searching');
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const isFormValid = () => {
    return pickupLat && pickupLng && dropoffLat && dropoffLng;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create New Ride</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={pickupAddress}
            onChangeText={setPickupAddress}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Latitude"
              value={pickupLat}
              onChangeText={setPickupLat}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Longitude"
              value={pickupLng}
              onChangeText={setPickupLng}
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={useCurrentLocation}
          >
            <Text style={styles.locationButtonText}>Use Current Location</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dropoff Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Latitude"
              value={dropoffLat}
              onChangeText={setDropoffLat}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Longitude"
              value={dropoffLng}
              onChangeText={setDropoffLng}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Time (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD HH:MM:SS"
            value={pickupTime}
            onChangeText={setPickupTime}
          />
        </View>

        <TouchableOpacity
          style={[styles.createButton, !isFormValid() && styles.createButtonDisabled]}
          onPress={handleCreateRide}
          disabled={loading || !isFormValid()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Ride</Text>
          )}
        </TouchableOpacity>

        {location && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Current Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  locationButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    color: '#1976D2',
    fontSize: 12,
  },
});
