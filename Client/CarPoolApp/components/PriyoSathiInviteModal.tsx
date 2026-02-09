import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Users, X, UserPlus, Check, MapPin, Clock, RefreshCw } from './Icons';
import { priyoSathiService, Companion, NearbyCompanion } from '../services/priyoSathi.service';
import LinearGradient from './LinearGradient';

interface PriyoSathiInviteProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (companionId: string, companionName: string) => void;
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  isFemale?: boolean;
}

export default function PriyoSathiInviteModal({
  visible,
  onClose,
  onInvite,
  pickupLat,
  pickupLng,
  destinationLat,
  destinationLng,
  isFemale = false,
}: PriyoSathiInviteProps) {
  const [loading, setLoading] = useState(true);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [nearbyCompanions, setNearbyCompanions] = useState<NearbyCompanion[]>([]);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const accentColor = isFemale ? '#ec4899' : '#2563eb';
  const accentGradient: [string, string] = isFemale ? ['#ec4899', '#e11d48'] : ['#2563eb', '#1d4ed8'];

  const isMountedRef = useRef(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      // Only fetch nearby companions - these are the ONLY ones who are online and can be invited
      // We no longer fetch ALL companions because offline users should not be shown at all
      if (pickupLat && pickupLng && destinationLat && destinationLng) {
        const nearbyRes = await priyoSathiService.getNearbyCompanions(
          pickupLat,
          pickupLng,
          destinationLat,
          destinationLng
        );
        if (nearbyRes.success && isMountedRef.current) {
          const onlineCompanions = nearbyRes.data.candidates || [];
          setNearbyCompanions(onlineCompanions);
          
          // Convert nearby companions to Companion format for display
          // Only show companions who are actually online and nearby
          const onlineCompanionList: Companion[] = onlineCompanions.map(nc => ({
            id: nc.companion_id,
            companion_id: nc.companion_id,
            status: 'ACCEPTED' as const,
            created_at: new Date().toISOString(),
            companion: {
              id: nc.companion_id,
              phone: nc.phone,
              full_name: nc.name,
              average_rating: nc.rating,
            },
          }));
          setCompanions(onlineCompanionList);
        }
      } else if (isMountedRef.current) {
        // No location data - can't determine who is nearby, show empty
        setCompanions([]);
        setNearbyCompanions([]);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error('[PriyoSathiInvite] Error fetching data:', err);
        if (!silent) {
          setError(err.message || 'Failed to load friends');
        }
      }
    } finally {
      if (isMountedRef.current && !silent) {
        setLoading(false);
      }
    }
  }, [pickupLat, pickupLng, destinationLat, destinationLng]);

  // Initial fetch + polling every 5 seconds when modal is visible
  useEffect(() => {
    isMountedRef.current = true;

    if (visible) {
      fetchData(false);
      pollingRef.current = setInterval(() => {
        fetchData(true);
      }, 5000);
    }

    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [visible, fetchData]);

  

  const handleInvite = async (companion: Companion) => {
    const companionId = companion.companion_id;
    const companionName = companion.companion?.full_name || companion.companion?.phone || 'Friend';

    setInvitingId(companionId);
    try {
      // Call the parent callback - actual invite happens when pool/ride is created
      onInvite(companionId, companionName);
      setInvitedIds((prev) => new Set(prev).add(companionId));
    } catch (err) {
      console.error('[PriyoSathiInvite] Error inviting:', err);
    } finally {
      setInvitingId(null);
    }
  };

  const getInitial = (name?: string, phone?: string) => {
    if (name && name.length > 0) return name[0].toUpperCase();
    if (phone && phone.length > 0) return phone[phone.length - 1];
    return '?';
  };

  const isNearby = (companionId: string): NearbyCompanion | undefined => {
    return nearbyCompanions.find((nc) => nc.companion_id === companionId);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[80%]">
          {/* Header */}
          <LinearGradient
            colors={accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-5 rounded-t-3xl"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                  <Users size={20} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-white text-lg font-semibold">Invite Priyo Sathi</Text>
                  <Text className="text-white/70 text-sm">
                    {companions.length} friend{companions.length !== 1 ? 's' : ''} online nearby
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => fetchData()}
                  disabled={loading}
                  className="w-8 h-8 bg-white/20 rounded-full items-center justify-center"
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  <RefreshCw size={16} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-8 h-8 bg-white/20 rounded-full items-center justify-center"
                >
                  <X size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 24 }}>
            {loading ? (
              <View className="items-center py-12">
                <ActivityIndicator size="large" color={accentColor} />
                <Text className="text-gray-500 mt-4">Loading friends...</Text>
              </View>
            ) : error ? (
              <View className="items-center py-12">
                <Text className="text-red-500">{error}</Text>
                <TouchableOpacity onPress={() => fetchData()} className="mt-4">
                  <Text className="text-blue-600 font-semibold">Tap to retry</Text>
                </TouchableOpacity>
              </View>
            ) : companions.length === 0 ? (
              <View className="items-center py-12">
                <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                  <UserPlus size={40} color="#9ca3af" />
                </View>
                <Text className="text-gray-900 font-semibold text-lg mb-2">No friends online</Text>
                <Text className="text-gray-500 text-center px-4">
                  None of your Priyo Sathi friends are currently looking for a ride nearby.
                </Text>
                <TouchableOpacity
                  onPress={() => fetchData()}
                  className="mt-4 px-4 py-2 bg-gray-100 rounded-lg"
                  disabled={loading}
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  <Text className="text-gray-700 font-semibold">Reload</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="space-y-3">
                {/* Online/Nearby Friends Section */}
                <View className="mb-4">
                  <View className="flex-row items-center gap-2 mb-3">
                    <MapPin size={16} color="#16a34a" />
                    <Text className="text-green-700 font-semibold">Online & Nearby</Text>
                  </View>
                  <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">
                    <Text className="text-green-700 text-sm">
                      {companions.length} friend{companions.length !== 1 ? 's' : ''} online
                      and near your route!
                    </Text>
                  </View>
                </View>

                {/* Friends List - Only showing online/nearby friends */}
                {companions.map((companion) => {
                  const nearby = isNearby(companion.companion_id);
                  const isInvited = invitedIds.has(companion.companion_id);
                  const isInviting = invitingId === companion.companion_id;
                  const hasInviteFrom = nearby?.has_pending_invite_from ?? false;
                  const hasInviteTo = nearby?.has_pending_invite_to ?? false;
                  const isInviteLocked = isInvited || hasInviteFrom || hasInviteTo;

                  return (
                    <View
                      key={companion.id}
                      className="flex-row items-center gap-4 p-4 rounded-xl border bg-green-50 border-green-200"
                    >
                      {/* Avatar */}
                      <View className="w-12 h-12 rounded-full items-center justify-center bg-green-300">
                        <Text className="text-lg font-semibold text-green-800">
                          {getInitial(companion.companion?.full_name, companion.companion?.phone)}
                        </Text>
                      </View>

                      {/* Info */}
                      <View className="flex-1">
                        <Text className="font-medium text-gray-900">
                          {companion.companion?.full_name || companion.companion?.phone || 'Friend'}
                        </Text>
                        <View className="flex-row items-center gap-1 mt-1">
                          <MapPin size={12} color="#16a34a" />
                          <Text className="text-green-600 text-xs">
                            {nearby?.distance_km ? `${nearby.distance_km} km away` : 'On your route'}
                          </Text>
                          {nearby?.detour_minutes && nearby.detour_minutes > 0 && (
                            <>
                              <Text className="text-gray-400 text-xs mx-1">•</Text>
                              <Clock size={12} color="#6b7280" />
                              <Text className="text-gray-500 text-xs">
                                +{nearby.detour_minutes} min detour
                              </Text>
                            </>
                          )}
                        </View>
                      </View>

                      {/* Invite Button */}
                      <TouchableOpacity
                        onPress={() => handleInvite(companion)}
                        disabled={isInviting || isInviteLocked}
                        className={`px-4 py-2 rounded-lg ${
                          hasInviteFrom ? 'bg-amber-500' : isInvited || hasInviteTo ? 'bg-green-500' : 'bg-green-600'
                        }`}
                        style={{ opacity: isInviting || isInviteLocked ? 0.7 : 1 }}
                      >
                        {isInviting ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : hasInviteFrom ? (
                          <Text className="text-white font-medium text-sm">Invited You</Text>
                        ) : isInvited || hasInviteTo ? (
                          <View className="flex-row items-center gap-1">
                            <Check size={16} color="#ffffff" />
                            <Text className="text-white font-medium text-sm">Invited</Text>
                          </View>
                        ) : (
                          <Text className="text-white font-medium text-sm">Invite</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {invitedIds.size > 0 && (
            <View className="p-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={onClose}
                className={`w-full py-3 rounded-xl items-center ${
                  isFemale ? 'bg-pink-500' : 'bg-blue-600'
                }`}
              >
                <Text className="text-white font-semibold">
                  Done ({invitedIds.size} invited)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
