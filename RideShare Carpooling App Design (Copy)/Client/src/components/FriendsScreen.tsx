import { useState } from 'react';
import { Search, UserPlus, X, Check } from 'lucide-react';
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
    <div className="h-full w-full flex flex-col bg-white">
      {/* Header */}
      <div className={`bg-gradient-to-br ${accentGradient} text-white p-6 pb-8`}>
        <div className="mb-6">
          <h1 className="text-center">Priyo Sathi</h1>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Friend ID or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>

        {/* Add Friend Button */}
        <button
          onClick={() => setShowAddFriend(true)}
          className="mt-4 w-full bg-white/20 backdrop-blur-sm text-white py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Friend by ID</span>
        </button>
      </div>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">All Friends</h2>
            <span className="text-sm text-gray-500">{filteredFriends.length} friends</span>
          </div>

          <div className="space-y-3">
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className={`flex items-center gap-4 p-4 rounded-xl bg-white border ${
                  friend.isOnline ? 'border-gray-200' : 'border-gray-100'
                } active:scale-[0.98] transition-transform ${
                  !friend.isOnline ? 'opacity-50' : ''
                }`}
              >
                {/* Avatar with Online Indicator */}
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className={`bg-gradient-to-br ${friend.color} text-white`}>
                      {friend.initial}
                    </AvatarFallback>
                  </Avatar>
                  {friend.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                {/* Friend Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`${!friend.isOnline ? 'text-gray-600' : 'text-gray-900'}`}>
                      {friend.name}
                    </h3>
                    {friend.isOnline && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">ID: {friend.id}</p>
                </div>

                {/* Status */}
                <div className="text-right">
                  <p className={`text-xs ${friend.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                    {friend.lastSeen}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredFriends.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500">No friends found</p>
              <p className="text-sm text-gray-400 mt-1">Try searching with a different ID or name</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-gray-900">Add Friend</h2>
              <button
                onClick={() => {
                  setShowAddFriend(false);
                  setFriendId('');
                  setAddSuccess(false);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {addSuccess ? (
              <div className="text-center py-8">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                  isFemale ? 'from-pink-600 to-rose-500' : 'from-gray-800 to-gray-700'
                } flex items-center justify-center mx-auto mb-4`}>
                  <Check className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-900 mb-1">Friend Request Sent!</p>
                <p className="text-sm text-gray-500">Waiting for approval</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Friend ID</label>
                    <Input
                      type="text"
                      placeholder="Enter Friend ID (e.g., RS2024)"
                      value={friendId}
                      onChange={(e) => setFriendId(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      💡 Ask your friend for their unique Friend ID. You can find your ID in Profile settings.
                    </p>
                  </div>
                </div>

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
          </div>
        </div>
      )}
    </div>
  );
}
