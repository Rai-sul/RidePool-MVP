import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, RefreshControl, ActivityIndicator, Alert } from 'react-native-web';
import { Search, UserPlus, X, Check, MessageCircle, Clock, UserX } from './Icons';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { UserProfile } from '../contexts/GlobalContext';
import { useRouter } from 'expo-router';
import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api.config';

type FriendsScreenProps = {
  userProfile: UserProfile | null;
};

type Companion = {
  id: string;
  companion_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  created_at: string;
  companion?: {
    id: string;
    phone?: string;
    full_name?: string;
    average_rating?: number;
  };
};

type PendingRequest = {
  id: string;
  created_at: string;
  requester?: {
    id: string;
    phone?: string;
    full_name?: string;
    average_rating?: number;
  };
};

type CompanionsResponse = {
  success: boolean;
  data: {
    companions: Companion[];
    count: number;
    max_allowed: number;
  };
};

type PendingRequestsResponse = {
  success: boolean;
  data: {
    pending_requests: PendingRequest[];
  };
};

export default function FriendsScreen({ userProfile }: FriendsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendId, setFriendId] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [maxAllowed, setMaxAllowed] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const router = useRouter();
  
  const isFemale = userProfile?.gender === 'female';
  const accentGradient = isFemale ? 'from-pink-600 to-rose-500' : 'from-gray-800 to-gray-700';

  // Fetch companions and pending requests
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [companionsRes, requestsRes] = await Promise.all([
        apiClient.get<CompanionsResponse>(API_ENDPOINTS.PRIYO_SATHI.LIST),
        apiClient.get<PendingRequestsResponse>(API_ENDPOINTS.PRIYO_SATHI.PENDING_REQUESTS),
      ]);

      if (companionsRes.success) {
        setCompanions(companionsRes.data.companions || []);
        setMaxAllowed(companionsRes.data.max_allowed || 5);
      }

      if (requestsRes.success) {
        setPendingRequests(requestsRes.data.pending_requests || []);
      }
    } catch (err: any) {
      console.error('[FriendsScreen] Error fetching data:', err);
      setError(err.message || 'Failed to load friends');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Filter companions based on search query
  const filteredCompanions = companions.filter(companion => {
    const name = companion.companion?.full_name || '';
    const phone = companion.companion?.phone || '';
    const query = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query) ||
      companion.companion_id.toLowerCase().includes(query)
    );
  });

  // Get accepted companions
  const acceptedCompanions = filteredCompanions.filter(c => c.status === 'ACCEPTED');
  const pendingCompanions = filteredCompanions.filter(c => c.status === 'PENDING');

  const handleAddFriend = async () => {
    if (!friendId.trim()) return;
    
    setAddingFriend(true);
    try {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        API_ENDPOINTS.PRIYO_SATHI.ADD,
        { companion_id: friendId.trim() }
      );

      if (response.success) {
        setAddSuccess(true);
        setTimeout(() => {
          setAddSuccess(false);
          setShowAddFriend(false);
          setFriendId('');
          fetchData();
        }, 2000);
      }
    } catch (err: any) {
      console.error('[FriendsScreen] Error adding friend:', err);
      alert(err.message || 'Failed to send friend request');
    } finally {
      setAddingFriend(false);
    }
  };

  const handleRespondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    setRespondingTo(requestId);
    try {
      const response = await apiClient.post<{ success: boolean }>(
        API_ENDPOINTS.PRIYO_SATHI.RESPOND_REQUEST(requestId),
        { action }
      );

      if (response.success) {
        alert(action === 'accept' ? 'Friend request accepted!' : 'Friend request declined');
        fetchData();
      }
    } catch (err: any) {
      console.error('[FriendsScreen] Error responding to request:', err);
      alert(err.message || 'Failed to respond to request');
    } finally {
      setRespondingTo(null);
    }
  };

  const handleRemoveFriend = async (companionId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      await apiClient.delete(API_ENDPOINTS.PRIYO_SATHI.REMOVE(companionId));
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove friend');
    }
  };

  const handleChatPress = (companion: Companion) => {
    router.push({
      pathname: '/chat',
      params: {
        friendId: companion.companion_id,
        friendName: companion.companion?.full_name || companion.companion?.phone || 'Friend',
      }
    });
  };

  const getInitial = (name?: string, phone?: string) => {
    if (name && name.length > 0) return name[0].toUpperCase();
    if (phone && phone.length > 0) return phone[phone.length - 1];
    return '?';
  };

  const getGradientColor = (index: number) => {
    const colors = [
      'from-blue-500 to-cyan-400',
      'from-pink-500 to-rose-400',
      'from-purple-500 to-indigo-400',
      'from-green-500 to-emerald-400',
      'from-orange-500 to-amber-400',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <View className="h-full w-full flex flex-col bg-white items-center justify-center">
        <ActivityIndicator size="large" color={isFemale ? '#ec4899' : '#374151'} />
        <Text className="text-gray-500 mt-4">Loading friends...</Text>
      </View>
    );
  }

  return (
    <View className="h-full w-full flex flex-col bg-white">
      {/* Header */}
      <View className={`bg-gradient-to-br ${accentGradient} p-6 pb-8`}>
        <View className="mb-6">
          <Text className="text-white text-center text-xl font-semibold">Priyo Sathi</Text>
          <Text className="text-white/70 text-center text-sm mt-1">
            {acceptedCompanions.length}/{maxAllowed} friends
          </Text>
        </View>

        {/* Search Bar */}
        <View className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <TextInput
            placeholder="Search friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Add Friend Button */}
        <TouchableOpacity
          onPress={() => setShowAddFriend(true)}
          disabled={acceptedCompanions.length >= maxAllowed}
          className={`mt-4 w-full py-3 rounded-xl flex flex-row items-center justify-center gap-2 active:scale-[0.98] ${
            acceptedCompanions.length >= maxAllowed ? 'bg-white/10' : 'bg-white/20 backdrop-blur-sm'
          }`}
        >
          <UserPlus className="w-5 h-5 text-white" />
          <Text className="text-white">
            {acceptedCompanions.length >= maxAllowed ? 'Max friends reached' : 'Add Friend'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 pb-20">
        {error && (
          <View className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <Text className="text-red-600">{error}</Text>
            <TouchableOpacity onPress={fetchData} className="mt-2">
              <Text className="text-red-600 font-semibold">Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <View className="p-6 pb-0">
            <Text className="text-gray-900 font-semibold mb-4">
              Pending Requests ({pendingRequests.length})
            </Text>
            <View className="space-y-3">
              {pendingRequests.map((request, index) => (
                <View
                  key={request.id}
                  className="flex flex-row items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-400 text-white">
                      {getInitial(request.requester?.full_name, request.requester?.phone)}
                    </AvatarFallback>
                  </Avatar>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">
                      {request.requester?.full_name || request.requester?.phone || 'Unknown'}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      Wants to be your Priyo Sathi
                    </Text>
                  </View>
                  <View className="flex flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleRespondToRequest(request.id, 'accept')}
                      disabled={respondingTo === request.id}
                      className="p-2 bg-green-500 rounded-full hover:bg-green-600"
                    >
                      {respondingTo === request.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Check className="w-5 h-5 text-white" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRespondToRequest(request.id, 'reject')}
                      disabled={respondingTo === request.id}
                      className="p-2 bg-red-500 rounded-full hover:bg-red-600"
                    >
                      <X className="w-5 h-5 text-white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pending Sent Requests */}
        {pendingCompanions.length > 0 && (
          <View className="p-6 pb-0">
            <Text className="text-gray-900 font-semibold mb-4">
              Sent Requests ({pendingCompanions.length})
            </Text>
            <View className="space-y-3">
              {pendingCompanions.map((companion, index) => (
                <View
                  key={companion.id}
                  className="flex flex-row items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className={`bg-gradient-to-br ${getGradientColor(index)} text-white`}>
                      {getInitial(companion.companion?.full_name, companion.companion?.phone)}
                    </AvatarFallback>
                  </Avatar>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">
                      {companion.companion?.full_name || companion.companion?.phone || 'Unknown'}
                    </Text>
                    <View className="flex flex-row items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <Text className="text-sm text-gray-500">Pending approval</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Friends List */}
        <View className="p-6">
          <View className="flex flex-row items-center justify-between mb-4">
            <Text className="text-gray-900 font-semibold">Friends</Text>
            <Text className="text-sm text-gray-500">{acceptedCompanions.length} friends</Text>
          </View>

          {acceptedCompanions.length === 0 ? (
            <View className="items-center py-12">
              <View className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <UserPlus className="w-10 h-10 text-gray-400" />
              </View>
              <Text className="text-gray-500 font-medium">No friends yet</Text>
              <Text className="text-sm text-gray-400 mt-1 text-center">
                Add friends to pool rides together and save more!
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {acceptedCompanions.map((companion, index) => (
                <View
                  key={companion.id}
                  className="flex flex-row items-center gap-4 p-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <View className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className={`bg-gradient-to-br ${getGradientColor(index)} text-white`}>
                        {getInitial(companion.companion?.full_name, companion.companion?.phone)}
                      </AvatarFallback>
                    </Avatar>
                  </View>

                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">
                      {companion.companion?.full_name || companion.companion?.phone || 'Friend'}
                    </Text>
                    {companion.companion?.average_rating && (
                      <Text className="text-sm text-gray-500">
                        ⭐ {companion.companion.average_rating.toFixed(1)}
                      </Text>
                    )}
                  </View>

                  <View className="flex flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() => handleChatPress(companion)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <MessageCircle className="w-5 h-5 text-gray-600" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveFriend(companion.companion_id)}
                      className="p-2 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <UserX className="w-5 h-5 text-red-500" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal
        visible={showAddFriend}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowAddFriend(false);
          setFriendId('');
          setAddSuccess(false);
        }}
      >
        <View className="absolute inset-0 bg-black/50 flex items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="flex flex-row items-center justify-between mb-6">
              <Text className="text-gray-900 text-lg font-semibold">Add Friend</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddFriend(false);
                  setFriendId('');
                  setAddSuccess(false);
                }}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </TouchableOpacity>
            </View>

            {addSuccess ? (
              <View className="items-center py-8">
                <View className={`w-16 h-16 rounded-full bg-gradient-to-br ${accentGradient} flex items-center justify-center mb-4`}>
                  <Check className="w-8 h-8 text-white" />
                </View>
                <Text className="text-gray-900 font-semibold mb-1">Friend Request Sent!</Text>
                <Text className="text-sm text-gray-500">Waiting for approval</Text>
              </View>
            ) : (
              <>
                <View className="space-y-4 mb-6">
                  <View>
                    <Text className="text-sm text-gray-600 mb-2">Friend's User ID</Text>
                    <Input
                      placeholder="Enter User ID (UUID)"
                      value={friendId}
                      onChangeText={setFriendId}
                      className="w-full"
                    />
                  </View>
                  <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <Text className="text-xs text-blue-800">
                      💡 Ask your friend for their User ID from their Profile page.
                    </Text>
                  </View>
                </View>

                <Button
                  onPress={handleAddFriend}
                  disabled={!friendId.trim() || addingFriend}
                  className={`w-full bg-gradient-to-r ${accentGradient} text-white hover:opacity-90`}
                >
                  {addingFriend ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Send Friend Request
                    </>
                  )}
                </Button>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
