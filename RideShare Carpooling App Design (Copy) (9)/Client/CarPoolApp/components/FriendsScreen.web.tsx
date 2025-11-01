import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native-web';
import { Search, UserPlus, X, Check } from './Icons';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { UserProfile } from '../App';

type FriendsScreenProps = {
  userProfile: UserProfile | null;
};

type Friend = {
  id: string;
  name: string;
  initial: string;
  color: string;
  isOnline: boolean;
  lastSeen: string;
};

const friendsList: Friend[] = [
  { id: 'RS2024', name: 'Raisul', initial: 'R', color: 'from-blue-500 to-cyan-400', isOnline: true, lastSeen: 'Online' },
  { id: 'FM2024', name: 'Fatima', initial: 'F', color: 'from-pink-500 to-rose-400', isOnline: false, lastSeen: '2h ago' },
  { id: 'AH2024', name: 'Ahmed', initial: 'A', color: 'from-purple-500 to-indigo-400', isOnline: true, lastSeen: 'Online' },
  { id: 'SR2024', name: 'Sarah', initial: 'S', color: 'from-green-500 to-emerald-400', isOnline: false, lastSeen: '1h ago' },
  { id: 'AL2024', name: 'Ali', initial: 'A', color: 'from-orange-500 to-amber-400', isOnline: true, lastSeen: 'Online' },
  { id: 'ZN2024', name: 'Zara', initial: 'Z', color: 'from-rose-500 to-pink-400', isOnline: false, lastSeen: '5h ago' },
  { id: 'KM2024', name: 'Kamal', initial: 'K', color: 'from-teal-500 to-cyan-400', isOnline: true, lastSeen: 'Online' },
  { id: 'NJ2024', name: 'Nadia', initial: 'N', color: 'from-violet-500 to-purple-400', isOnline: false, lastSeen: '30m ago' },
];

export default function FriendsScreen({ userProfile }: FriendsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendId, setFriendId] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);
  
  const isFemale = userProfile?.gender === 'female';
  const accentColor = isFemale ? 'rose' : 'gray';
  const accentGradient = isFemale ? 'from-pink-600 to-rose-500' : 'from-gray-800 to-gray-700';

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

  return (
    <View className="h-full w-full flex flex-col bg-white">
      {/* Header */}
      <View className={`bg-gradient-to-br ${accentGradient} p-6 pb-8`}>
        <View className="mb-6">
          <Text className="text-white text-center">Priyo Sathi</Text>
        </View>

        {/* Search Bar */}
        <View className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <TextInput
            placeholder="Search by Friend ID or name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Add Friend Button */}
        <TouchableOpacity
          onPress={() => setShowAddFriend(true)}
          className="mt-4 w-full bg-white/20 backdrop-blur-sm py-3 rounded-xl flex flex-row items-center justify-center gap-2 active:scale-[0.98]"
        >
          <UserPlus className="w-5 h-5 text-white" />
          <Text className="text-white">Add Friend by ID</Text>
        </TouchableOpacity>
      </View>

      {/* Friends List */}
      <ScrollView className="flex-1 pb-20">
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
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className={`bg-gradient-to-br ${friend.color} text-white`}>
                      {friend.initial}
                    </AvatarFallback>
                  </Avatar>
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

                {/* Status */}
                <View>
                  <Text className={`text-xs ${friend.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                    {friend.lastSeen}
                  </Text>
                </View>
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
                <View className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                  isFemale ? 'from-pink-600 to-rose-500' : 'from-gray-800 to-gray-700'
                } flex items-center justify-center mb-4`}>
                  <Check className="w-8 h-8 text-white" />
                </View>
                <Text className="text-gray-900 mb-1">Friend Request Sent!</Text>
                <Text className="text-sm text-gray-500">Waiting for approval</Text>
              </View>
            ) : (
              <>
                <View className="space-y-4 mb-6">
                  <View>
                    <Text className="text-sm text-gray-600 mb-2">Friend ID</Text>
                    <Input
                      type="text"
                      placeholder="Enter Friend ID (e.g., RS2024)"
                      value={friendId}
                      onChange={(e) => setFriendId(e.target.value)}
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
                  onClick={handleAddFriend}
                  disabled={!friendId.trim()}
                  className={`w-full bg-gradient-to-r ${
                    isFemale ? 'from-pink-600 to-rose-500' : 'from-gray-800 to-gray-700'
                  } text-white hover:opacity-90`}
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Send Friend Request
                </Button>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
