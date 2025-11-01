import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, UserPlus, X, Check, MessageCircle } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { UserProfile } from '../contexts/GlobalContext';
import LinearGradient from './LinearGradient';
import { useRouter } from 'expo-router';

type FriendsScreenProps = {
  userProfile: UserProfile | null;
};

type Friend = {
  id: string;
  name: string;
  initial: string;
  isOnline: boolean;
  lastSeen: string;
};

const friendsList: Friend[] = [
  { id: 'RS2024', name: 'Raisul', initial: 'R', isOnline: true, lastSeen: 'Online' },
  { id: 'FM2024', name: 'Fatima', initial: 'F', isOnline: false, lastSeen: '2h ago' },
  { id: 'AH2024', name: 'Ahmed', initial: 'A', isOnline: true, lastSeen: 'Online' },
  { id: 'SR2024', name: 'Sarah', initial: 'S', isOnline: false, lastSeen: '1h ago' },
  { id: 'AL2024', name: 'Ali', initial: 'A', isOnline: true, lastSeen: 'Online' },
  { id: 'ZN2024', name: 'Zara', initial: 'Z', isOnline: false, lastSeen: '5h ago' },
  { id: 'KM2024', name: 'Kamal', initial: 'K', isOnline: true, lastSeen: 'Online' },
  { id: 'NJ2024', name: 'Nadia', initial: 'N', isOnline: false, lastSeen: '30m ago' },
];

export default function FriendsScreen({ userProfile }: FriendsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendId, setFriendId] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);
  const router = useRouter();
  
  const isFemale = userProfile?.gender === 'female';
  const accentColor = isFemale ? 'rose' : 'gray';
  const accentGradientColors = isFemale ? ['#ec4899', '#e11d48'] : ['#1f2937', '#374151'];

  // Filter friends based on search query
  const filteredFriends = friendsList.filter(friend => 
    friend.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFriend = () => {
    if (friendId.trim()) {
      setAddSuccess(true);
      setTimeout(() => {
        setAddSuccess(false);
        setShowAddFriend(false);
        setFriendId('');
      }, 2000);
    }
  };

  const handleChatPress = (friend: Friend) => {
    router.push({
      pathname: '/chat',
      params: {
        friendId: friend.id,
        friendName: friend.name,
      }
    });
  };

  return (
    <SafeAreaView className="h-full w-full flex flex-col bg-white">
      {/* Header */}
      <LinearGradient
        colors={accentGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-6 pb-8"
      >
        <View className="mb-6">
          <Text className="text-white text-center">Priyo Sathi</Text>
        </View>

        {/* Search Bar */}
        <View className="flex flex-row items-center bg-white rounded-xl px-4 py-2">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <TextInput
            placeholder="Search by Friend ID or name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-gray-900 placeholder:text-gray-400 focus:outline-none"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Add Friend Button */}
        <TouchableOpacity
          onPress={() => setShowAddFriend(true)}
          className="mt-4 w-full bg-white/20 py-3 rounded-xl flex flex-row items-center justify-center gap-2 active:scale-[0.98]"
        >
          <UserPlus className="w-5 h-5 text-white" />
          <Text className="text-white">Add Friend by ID</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Friends List */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 96 }}>
        <View className="p-6">
          <View className="flex flex-row items-center justify-between mb-4">
            <Text className="text-gray-900">All Friends</Text>
            <Text className="text-sm text-gray-500">{filteredFriends.length} friends</Text>
          </View>

          <View className="space-y-3">
            {filteredFriends.map((friend) => (
              <View
                key={friend.id}
                className={`flex flex-row items-center gap-4 p-4 rounded-xl bg-white border ${
                  friend.isOnline ? 'border-gray-200' : 'border-gray-100'
                } ${
                  !friend.isOnline ? 'opacity-50' : ''
                }`}
              >
                {/* Avatar with Online Indicator */}
                <View className="relative">
                  <View className="w-12 h-12 rounded-full items-center justify-center bg-gray-300 border-2 border-white shadow-sm">
                    <Text className="text-gray-800 text-lg font-semibold">{friend.initial}</Text>
                  </View>
                  {friend.isOnline && (
                    <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></View>
                  )}
                </View>

                {/* Friend Info */}
                <View className="flex-1">
                  <View className="flex flex-row items-center gap-2">
                    <Text className={`${!friend.isOnline ? 'text-gray-600' : 'text-gray-900'}`}>
                      {friend.name}
                    </Text>
                    {friend.isOnline && (
                      <View className="bg-green-50 px-2 py-0.5 rounded-full">
                        <Text className="text-xs text-green-600">
                          Active
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-sm text-gray-500">ID: {friend.id}</Text>
                </View>

                {/* Chat Button */}
                <TouchableOpacity
                  onPress={() => handleChatPress(friend)}
                  activeOpacity={0.7}
                >
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {filteredFriends.length === 0 && (
            <View className="items-center py-12">
              <View className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </View>
              <Text className="text-gray-500">No friends found</Text>
              <Text className="text-sm text-gray-400 mt-1">Try searching with a different ID or name</Text>
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
              <Text className="text-gray-900">Add Friend</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddFriend(false);
                  setFriendId('');
                  setAddSuccess(false);
                }}
                className="p-1 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </TouchableOpacity>
            </View>

            {addSuccess ? (
              <View className="items-center py-8">
                <LinearGradient
                  colors={accentGradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                >
                  <Check className="w-8 h-8 text-white" />
                </LinearGradient>
                <Text className="text-gray-900 mb-1">Friend Request Sent!</Text>
                <Text className="text-sm text-gray-500">Waiting for approval</Text>
              </View>
            ) : (
              <>
                <View className="space-y-4 mb-6">
                  <View>
                    <Text className="text-sm text-gray-600 mb-2">Friend ID</Text>
                    <Input
                      placeholder="Enter Friend ID (e.g., RS2024)"
                      value={friendId}
                      onChangeText={setFriendId}
                      className="w-full"
                    />
                  </View>
                  <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <Text className="text-xs text-blue-800">
                      💡 Ask your friend for their unique Friend ID. You can find your ID in Profile settings.
                    </Text>
                  </View>
                </View>

                <Button
                  onPress={handleAddFriend}
                  disabled={!friendId.trim()}
                  className={`w-full h-12 ${isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-gray-800 hover:bg-gray-700'} text-white`}
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  <Text>Send Friend Request</Text>
                </Button>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}