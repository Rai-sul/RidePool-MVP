import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, Users, Trash2, ChevronLeft } from './Icons';
import { Button } from './ui/button';
import { useAdvanceBookings } from '../hooks/useAdvanceBookings';
import type { AdvanceBooking } from '../services/advanceBooking.service';

type ScheduledRidesProps = {
  onBack?: () => void;
  /** Rendered inside a tab that already provides a header and safe area. */
  embedded?: boolean;
  /** Shown in the empty state so a rider with nothing booked can start one. */
  onBookRide?: () => void;
  isFemale?: boolean;
};

/**
 * Upcoming scheduled rides.
 *
 * Shortly before pickup each pool opens a confirmation step; a rider who does
 * not confirm in time is removed from the pool. Once two riders confirm, the
 * pool is live and the driver search begins.
 */
export default function ScheduledRides({
  onBack,
  embedded = false,
  onBookRide,
  isFemale = false,
}: ScheduledRidesProps) {
  const { bookings, loading, error, fetchBookings, cancelBooking, confirmBooking } = useAdvanceBookings();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Keep the countdowns and the confirm button honest without a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirm = useCallback(
    async (booking: AdvanceBooking) => {
      if (!booking.pool_id) return;

      setBusyId(booking.id);
      const result = await confirmBooking(booking.pool_id);
      setBusyId(null);

      if (!result.success) {
        Alert.alert('Could not confirm', result.error || 'Please try again.');
        return;
      }

      Alert.alert(
        'Confirmed',
        result.poolConfirmed
          ? 'Your pool is confirmed. We are finding you a driver.'
          : 'Waiting for another rider to confirm.'
      );
      fetchBookings();
    },
    [confirmBooking, fetchBookings]
  );

  const handleCancel = useCallback(
    (booking: AdvanceBooking) => {
      Alert.alert('Cancel this ride?', 'Your seat will be released and the pool recalculated.', [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel ride',
          style: 'destructive',
          onPress: async () => {
            setBusyId(booking.id);
            const result = await cancelBooking(booking.id);
            setBusyId(null);
            if (!result.success) {
              Alert.alert('Could not cancel', result.error || 'Please try again.');
            }
          },
        },
      ]);
    },
    [cancelBooking]
  );

  function renderBooking(booking: AdvanceBooking) {
    const pool = booking.pools;
    const pickupAt = new Date(pool?.scheduled_pickup_at || booking.scheduled_pickup_at);
    const opensAt = pool?.confirmation_opens_at ? new Date(pool.confirmation_opens_at) : null;
    const deadlineAt = pool?.confirmation_deadline_at ? new Date(pool.confirmation_deadline_at) : null;

    const confirmationOpen = !!opensAt && now >= opensAt.getTime() && !!deadlineAt && now < deadlineAt.getTime();
    const isConfirmed = !!booking.confirmed_at;
    const poolLive = !!pool?.active_range_start_at;
    const busy = busyId === booking.id;

    const secondsToDeadline = deadlineAt ? Math.max(0, Math.round((deadlineAt.getTime() - now) / 1000)) : null;

    return (
      <View
        key={booking.id}
        className="mb-4 p-4 bg-white rounded-2xl border-2 border-gray-200"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <Text className="text-base font-semibold text-gray-900">
              {pickupAt.toLocaleString([], {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full">
            <Users size={12} color="#4b5563" />
            <Text className="text-xs font-medium text-gray-600">
              {pool?.current_passengers ?? 1}/{pool?.max_passengers ?? 2}
            </Text>
          </View>
        </View>

        <View className="gap-2 mb-3">
          <View className="flex-row items-center gap-2">
            <View className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
            <Text className="flex-1 text-sm text-gray-700" numberOfLines={1}>
              {booking.pickup_address || 'Pickup'}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <MapPin className="w-3 h-3 text-red-600" />
            <Text className="flex-1 text-sm text-gray-700" numberOfLines={1}>
              {booking.dropoff_address || 'Destination'}
            </Text>
          </View>
        </View>

        {pool?.fare_per_person != null && (
          <Text className="text-sm text-gray-600 mb-3">
            Estimated fare ৳{Math.round(pool.fare_per_person)} per person
          </Text>
        )}

        {/* Status line */}
        <View className="flex-row items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <Text className="text-xs text-gray-600 flex-1">
            {poolLive
              ? 'Pool confirmed. Finding a driver.'
              : isConfirmed
                ? 'Confirmed. Waiting for another rider.'
                : confirmationOpen
                  ? `Confirm now${secondsToDeadline !== null ? ` - ${secondsToDeadline}s left` : ''}`
                  : opensAt
                    ? `Confirmation opens ${opensAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Waiting for co-riders'}
          </Text>
        </View>

        <View className="flex-row gap-3">
          {confirmationOpen && !isConfirmed && (
            <Button
              onPress={() => handleConfirm(booking)}
              disabled={busy}
              className={`flex-1 h-11 bg-green-600 hover:bg-green-700 rounded-xl ${busy ? 'opacity-70' : ''}`}
              textClassName="text-white font-semibold"
            >
              {busy ? <ActivityIndicator size="small" color="#ffffff" /> : "I'm still going"}
            </Button>
          )}
          <TouchableOpacity
            onPress={() => handleCancel(booking)}
            disabled={busy}
            className="h-11 px-4 flex-row items-center justify-center gap-2 border-2 border-gray-300 rounded-xl"
            activeOpacity={0.7}
          >
            <Trash2 size={16} color="#dc2626" />
            <Text className="text-sm font-medium text-red-600">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const content = (
    <>
      {!embedded && (
        <View className="flex-row items-center gap-3 px-4 py-4 bg-white border-b border-gray-200">
          {onBack && (
            <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </TouchableOpacity>
          )}
          <Text className="text-lg font-semibold text-gray-900">Scheduled Rides</Text>
        </View>
      )}

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBookings} />}
      >
        {error && (
          <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}

        {!loading && bookings.length === 0 && (
          <View className="items-center py-16">
            <Calendar className="w-10 h-10 text-gray-300" />
            <Text className="text-base font-medium text-gray-500 mt-3">No scheduled rides</Text>
            <Text className="text-sm text-gray-400 mt-1 text-center px-8">
              Book a ride ahead of time and we will pool you with riders going the same way.
            </Text>
            {onBookRide && (
              <Button
                onPress={onBookRide}
                className={`mt-6 h-11 px-6 rounded-xl ${isFemale ? 'bg-pink-500' : 'bg-blue-600'}`}
                textClassName="text-white font-semibold"
              >
                Book a Ride
              </Button>
            )}
          </View>
        )}

        {bookings.map(renderBooking)}
      </ScrollView>
    </>
  );

  if (embedded) {
    return <View className="flex-1 bg-gray-50">{content}</View>;
  }

  return <SafeAreaView className="flex-1 bg-gray-50">{content}</SafeAreaView>;
}
