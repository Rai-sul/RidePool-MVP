import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Users, X, UserPlus, Check, MapPin, Clock } from './Icons';
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

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible, pickupLat, pickupLng, destinationLat, destinationLng]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch companions list
      const companionsRes = await priyoSathiService.getCompanions();
      if (companionsRes.success) {
        const acceptedCompanions = (companionsRes.data.companions || []).filter(
          (c) => c.status === 'ACCEPTED'
        );
        setCompanions(acceptedCompanions);
      }

      // Fetch nearby companions if we have location data
      if (pickupLat && pickupLng && destinationLat && destinationLng) {
        try {
          const nearbyRes = await priyoSathiService.getNearbyCompanions(
            pickupLat,
            pickupLng,
            destinationLat,
            destinationLng
          );
          if (nearbyRes.success) {
            setNearbyCompanions(nearbyRes.data.candidates || []);
          }
        } catch (nearbyErr) {
          // Nearby is optional - don't fail the whole modal
          console.warn('[PriyoSathiInvite] Could not fetch nearby companions:', nearbyErr);
        }
      }
    } catch (err: any) {
      console.error('[PriyoSathiInvite] Error fetching data:', err);
      setError(err.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

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
                    {nearbyCompanions.length} friend{nearbyCompanions.length !== 1 ? 's' : ''} available nearby
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 bg-white/20 rounded-full items-center justify-center"
              >
                <X size={18} color="#ffffff" />
              </TouchableOpacity>
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
                <TouchableOpacity onPress={fetchData} className="mt-4">
                  <Text className="text-blue-600 font-semibold">Tap to retry</Text>
                </TouchableOpacity>
              </View>
            ) : nearbyCompanions.length === 0 ? (
              <View className="items-center py-12">
                <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                  <UserPlus size={40} color="#9ca3af" />
                </View>
                <Text className="text-gray-900 font-semibold text-lg mb-2">No nearby friends</Text>
                <Text className="text-gray-500 text-center px-4">
                  {companions.length > 0 
                    ? `You have ${companions.length} Priyo Sathi, but none are currently nearby with matching routes.`
                    : 'Add friends from Profile → Priyo Sathi to invite them to ride together!'
                  }
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {/* Nearby Friends Section Header */}
                <View className="mb-2">
                  <View className="flex-row items-center gap-2 mb-3">
                    <MapPin size={16} color="#16a34a" />
                    <Text className="text-green-700 font-semibold">Nearby Friends on Your Route</Text>
                  </View>
                  <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">
                    <Text className="text-green-700 text-sm">
                      {nearbyCompanions.length} friend{nearbyCompanions.length !== 1 ? 's' : ''} found
                      with matching pickup and destination!
                    </Text>
                  </View>
                </View>

                {/* ONLY show nearby companions - users must have active ride with matching locations */}
                {nearbyCompanions.map((nearby) => {
                  const isInvited = invitedIds.has(nearby.companion_id);
                  const isInviting = invitingId === nearby.companion_id;
                  // Find companion details from companions list
                  const companionDetails = companions.find(c => c.companion_id === nearby.companion_id);

                  return (
                    <View
                      key={nearby.companion_id}
                      className="flex-row items-center gap-4 p-4 rounded-xl border bg-green-50 border-green-200"
                    >
                      {/* Avatar */}
                      <View className="w-12 h-12 rounded-full items-center justify-center bg-green-300">
                        <Text className="text-lg font-semibold text-green-800">
                          {getInitial(nearby.name, nearby.phone)}
                        </Text>
                      </View>

                      {/* Info */}
                      <View className="flex-1">
                        <Text className="text-gray-900 font-medium">
                          {nearby.name || nearby.phone || 'Friend'}
                        </Text>
                        <View className="flex-row items-center gap-1 mt-1">
                          <MapPin size={12} color="#16a34a" />
                          <Text className="text-green-600 text-xs">
                            {nearby.distance_km ? `${nearby.distance_km} km away` : 'On your route'}
                          </Text>
                          {nearby.detour_minutes && nearby.detour_minutes > 0 && (
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
                        onPress={() => companionDetails && handleInvite(companionDetails)}
                        disabled={isInviting || isInvited || !companionDetails}
                        className={`px-4 py-2 rounded-lg ${
                          isInvited ? 'bg-green-500' : 'bg-green-600'
                        }`}
                        style={{ opacity: isInviting || !companionDetails ? 0.7 : 1 }}
                      >
                        {isInviting ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : isInvited ? (
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
