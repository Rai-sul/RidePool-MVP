import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRides } from '../hooks/useRides';
import { useAuthContext } from '../contexts/AuthContext';

export default function RidesScreen() {
  const { rides, loading, error, fetchRides, cancelRide } = useRides();
  const { user } = useAuthContext();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchRides();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRides();
    setRefreshing(false);
  };

  const handleCancelRide = async (rideId: string) => {
    const result = await cancelRide(rideId, 'User cancelled');
    if (result.success) {
      alert('Ride cancelled successfully');
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'accepted':
        return '#4CAF50';
      case 'in_progress':
        return '#2196F3';
      case 'completed':
        return '#8BC34A';
      case 'cancelled':
        return '#F44336';
      default:
        return '#999';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading rides...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Rides</Text>
        <Text style={styles.subtitle}>Welcome, {user?.full_name || 'User'}</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No rides found</Text>
          <Text style={styles.emptySubtext}>Create a new ride to get started</Text>
        </View>
      ) : (
        rides.map((ride) => (
          <View key={ride.id} style={styles.rideCard}>
            <View style={styles.rideHeader}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(ride.status) },
                ]}
              >
                <Text style={styles.statusText}>{ride.status.toUpperCase()}</Text>
              </View>
              {ride.fare && (
                <Text style={styles.fareText}>₹{ride.fare.toFixed(2)}</Text>
              )}
            </View>

            <View style={styles.locationContainer}>
              <View style={styles.locationRow}>
                <View style={styles.locationDot} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {ride.pickup_location.address || 'Pickup location'}
                </Text>
              </View>
              <View style={styles.locationLine} />
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, styles.locationDotEnd]} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {ride.dropoff_location.address || 'Dropoff location'}
                </Text>
              </View>
            </View>

            {ride.pickup_time && (
              <Text style={styles.timeText}>
                {new Date(ride.pickup_time).toLocaleString()}
              </Text>
            )}

            {(ride.status === 'pending' || ride.status === 'accepted') && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelRide(ride.id)}
              >
                <Text style={styles.cancelButtonText}>Cancel Ride</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 15,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  rideCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fareText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  locationContainer: {
    marginBottom: 15,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 10,
  },
  locationDotEnd: {
    backgroundColor: '#F44336',
  },
  locationLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e0e0e0',
    marginLeft: 4,
    marginVertical: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
