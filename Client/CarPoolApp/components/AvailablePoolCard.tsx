import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, Clock, Users, Navigation, Car, Route, Taka } from './Icons';
import LinearGradient from './LinearGradient';

export interface PoolSearchResultData {
  poolId: string;
  score: number;
  routeOverlapPercentage: number;
  estimatedDetour: number;
  estimatedDetourMinutes?: number;
  pickupDetourMinutes?: number;
  exactDistance?: number;
  exactETA?: number;
  poolPickupLocation?: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  poolDropoffLocation?: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  distanceToPoolKm?: number;
  currentPassengers?: number;
  maxPassengers?: number;
}

export interface CoRiderInfo {
  id: string;
  name?: string;
  pickupAddress?: string;
  pickupName?: string;
  dropoffAddress?: string;
  dropoffName?: string;
  distanceFromUser?: number;
}

interface AvailablePoolCardProps {
  pool: PoolSearchResultData;
  isSelected: boolean;
  onPress: () => void;
  coRiders?: CoRiderInfo[];
  userEstimate?: {
    fare: number;
    savings: number;
    durationMinutes: number;
    distanceKm?: number;
  } | null;
  previewLoading?: boolean;
  previewError?: string | null;
}

export default function AvailablePoolCard({
  pool,
  isSelected,
  onPress,
  coRiders = [],
  userEstimate,
  previewLoading = false,
  previewError = null,
}: AvailablePoolCardProps) {
  const currentPassengers = pool.currentPassengers || 1;
  const maxPassengers = pool.maxPassengers || 4;

  const formatDistance = (km: number | undefined): string => {
    if (km === undefined) return '--';
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  // Extract a short location name from the address if name is not available
  // This handles the case where the pool was created before the name field was added
  const getLocationDisplayName = (name?: string, address?: string): string => {
    if (name) return name;
    if (!address) return '';
    // Try to extract the first part of the address (usually the landmark/place name)
    const parts = address.split(',');
    if (parts.length > 0) {
      return parts[0].trim();
    }
    return address;
  };

  const getMatchScoreColor = (score: number): string => {
    if (score >= 0.8) return '#10b981';
    if (score >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getMatchScoreLabel = (score: number): string => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    return 'Fair';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        borderWidth: 2,
        borderColor: isSelected ? '#2563eb' : '#e5e7eb',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
        shadowOpacity: isSelected ? 0.12 : 0.06,
        shadowRadius: isSelected ? 8 : 4,
        elevation: isSelected ? 8 : 3,
      }}
    >
      {/* Header Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        {/* Pool Avatar & Basic Info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LinearGradient
            colors={isSelected ? ['#2563eb', '#06b6d4'] : ['#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={24} color="#ffffff" />
          </LinearGradient>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 }}>
              Pool #{pool.poolId.slice(0, 6)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: getMatchScoreColor(pool.score),
                }}
              />
              <Text style={{ fontSize: 13, color: getMatchScoreColor(pool.score), fontWeight: '500' }}>
                {getMatchScoreLabel(pool.score)} Match ({Math.round(pool.score * 100)}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Selection Indicator & Rider Count */}
        <View style={{ alignItems: 'flex-end' }}>
          {isSelected && (
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#2563eb',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' }} />
            </View>
          )}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              gap: 4,
            }}
          >
            <Users size={14} color="#6b7280" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>
              {currentPassengers}/{maxPassengers}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Row - Key Metrics */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#f9fafb',
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
          gap: 8,
        }}
      >
        {/* Distance to Pool */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <MapPin size={14} color="#2563eb" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2563eb' }}>
              {formatDistance(pool.distanceToPoolKm)}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Distance</Text>
        </View>

        {/* Vertical Divider */}
        <View style={{ width: 1, backgroundColor: '#e5e7eb' }} />

        {/* Detour Time */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <Clock size={14} color="#8b5cf6" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#8b5cf6' }}>
              {pool.pickupDetourMinutes !== undefined ? `+${pool.pickupDetourMinutes}` : '--'} min
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Detour</Text>
        </View>

        {/* Vertical Divider */}
        <View style={{ width: 1, backgroundColor: '#e5e7eb' }} />

        {/* Route Match */}
        {/* <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <Route size={14} color="#10b981" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#10b981' }}>
              {pool.routeOverlapPercentage}%
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Route Match</Text>
        </View> */}
      </View>

      {/* User-specific Estimate */}
      {isSelected && (
        <View
          style={{
            marginBottom: 12,
            backgroundColor: '#f0f9ff',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: '#bae6fd',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#0284c7' }}>
              Your estimate for this pool
            </Text>
            {previewLoading && <ActivityIndicator size="small" color="#0284c7" />}
          </View>

          {previewLoading ? (
            <Text style={{ fontSize: 12, color: '#64748b' }}>Calculating your fare and time...</Text>
          ) : previewError ? (
            <Text style={{ fontSize: 12, color: '#b91c1c' }}>{previewError}</Text>
          ) : userEstimate ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <Taka className="w-4 h-4 text-green-600" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#16a34a' }}>
                    ৳{Math.round(userEstimate.fare)}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#64748b' }}>Your Fare</Text>
              </View>

              <View style={{ width: 1, backgroundColor: '#e2e8f0' }} />

              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <Clock size={14} color="#0ea5e9" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0ea5e9' }}>
                    {Math.round(userEstimate.durationMinutes)} min
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#64748b' }}>Your Time</Text>
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: '#64748b' }}>Tap to load your estimate.</Text>
          )}
        </View>
      )}

      {/* Co-Riders Section */}
      {(coRiders.length > 0 || pool.poolPickupLocation?.name || pool.poolPickupLocation?.address || pool.poolDropoffLocation?.name || pool.poolDropoffLocation?.address) && (
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            overflow: 'hidden',
          }}
        >
          {/* Section Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: '#f9fafb',
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
              gap: 6,
            }}
          >
            <Car size={14} color="#6b7280" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>
              Co-Rider Locations
            </Text>
          </View>

          {/* Co-Rider Stops */}
          <View style={{ padding: 12 }}>
            {/* Pool Creator's Pickup */}
            {(pool.poolPickupLocation?.name || pool.poolPickupLocation?.address) && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                {/* Timeline Indicator */}
                <View style={{ alignItems: 'center', marginRight: 10, width: 24 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#10b981',
                      marginTop: 4,
                    }}
                  />
                  <View
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 20,
                      backgroundColor: '#d1d5db',
                      marginTop: 4,
                    }}
                  />
                </View>
                {/* Location Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '600', marginBottom: 2 }}>
                      PICKUP • Co-Rider
                    </Text>
                    {pool.distanceToPoolKm !== undefined && (
                      <View
                        style={{
                          backgroundColor: '#dbeafe',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: '600' }}>
                          {formatDistance(pool.distanceToPoolKm)} away
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{ fontSize: 13, color: '#111827', fontWeight: '500' }}
                    numberOfLines={2}
                  >
                    {getLocationDisplayName(pool.poolPickupLocation.name, pool.poolPickupLocation.address)}
                  </Text>
                </View>
              </View>
            )}

            {/* Pool Creator's Dropoff */}
            {(pool.poolDropoffLocation?.name || pool.poolDropoffLocation?.address) && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: coRiders.length > 0 ? 12 : 0 }}>
                {/* Timeline Indicator */}
                <View style={{ alignItems: 'center', marginRight: 10, width: 24 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#ef4444',
                      marginTop: 4,
                    }}
                  />
                  {coRiders.length > 0 && (
                    <View
                      style={{
                        width: 2,
                        flex: 1,
                        minHeight: 20,
                        backgroundColor: '#d1d5db',
                        marginTop: 4,
                      }}
                    />
                  )}
                </View>
                {/* Location Info */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600', marginBottom: 2 }}>
                    DROP-OFF • Co-Rider
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: '#111827', fontWeight: '500' }}
                    numberOfLines={2}
                  >
                    {getLocationDisplayName(pool.poolDropoffLocation.name, pool.poolDropoffLocation.address)}
                  </Text>
                </View>
              </View>
            )}

            {/* Additional Co-Riders */}
            {coRiders.map((rider, index) => (
              <View key={rider.id}>
                {/* Pickup */}
                {rider.pickupAddress && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ alignItems: 'center', marginRight: 10, width: 24 }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: '#10b981',
                          marginTop: 4,
                        }}
                      />
                      <View
                        style={{
                          width: 2,
                          minHeight: 20,
                          backgroundColor: '#d1d5db',
                          marginTop: 4,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '600', marginBottom: 2 }}>
                          PICKUP • {rider.name || `Rider ${index + 2}`}
                        </Text>
                        {rider.distanceFromUser !== undefined && (
                          <View
                            style={{
                              backgroundColor: '#dbeafe',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: '600' }}>
                              {formatDistance(rider.distanceFromUser)} away
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={{ fontSize: 13, color: '#111827', fontWeight: '500' }}
                        numberOfLines={1}
                      >
                        {getLocationDisplayName(rider.pickupName, rider.pickupAddress)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Dropoff */}
                {rider.dropoffAddress && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: index < coRiders.length - 1 ? 12 : 0 }}>
                    <View style={{ alignItems: 'center', marginRight: 10, width: 24 }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: '#ef4444',
                          marginTop: 4,
                        }}
                      />
                      {index < coRiders.length - 1 && (
                        <View
                          style={{
                            width: 2,
                            minHeight: 20,
                            backgroundColor: '#d1d5db',
                            marginTop: 4,
                          }}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600', marginBottom: 2 }}>
                        DROP-OFF • {rider.name || `Rider ${index + 2}`}
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: '#111827', fontWeight: '500' }}
                        numberOfLines={1}
                      >
                        {getLocationDisplayName(rider.dropoffName, rider.dropoffAddress)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ETA Badge (if available) */}
      {pool.exactETA !== undefined && (
        <View
          style={{
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ecfdf5',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            gap: 6,
          }}
        >
          <Navigation size={14} color="#059669" />
          <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>
            Estimated arrival: {pool.exactETA} min
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
