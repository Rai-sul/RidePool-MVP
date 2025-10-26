import { MapPin, Tag, Users, Search, ArrowRight, Star, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useState } from 'react';
import DestinationSearch from './DestinationSearch';
import type { UserProfile, Destination } from '../App';

type LandingPageProps = {
  userProfile: UserProfile | null;
  onDestinationSelect: (destination: Destination, rideType?: 'female-only' | 'regular') => void;
  onProfileClick: () => void;
};

const closeFriends = [
  { name: 'Raisul', initial: 'R', color: 'from-blue-500 to-cyan-400', lastSeen: 'Online' },
  { name: 'Fatima', initial: 'F', color: 'from-pink-500 to-rose-400', lastSeen: '2h ago' },
  { name: 'Ahmed', initial: 'A', color: 'from-purple-500 to-indigo-400', lastSeen: 'Online' },
  { name: 'Sarah', initial: 'S', color: 'from-green-500 to-emerald-400', lastSeen: '1h ago' },
  { name: 'Ali', initial: 'A', color: 'from-orange-500 to-amber-400', lastSeen: 'Online' },
];

const promos = [
  {
    id: 1,
    title: '50% OFF First Ride',
    description: 'Use code: FIRST50',
    color: 'from-blue-600 to-cyan-500',
    icon: '🎉',
  },
  {
    id: 2,
    title: 'Refer & Earn ৳500',
    description: 'Share with friends',
    color: 'from-pink-600 to-rose-500',
    icon: '💰',
  },
  {
    id: 3,
    title: 'Pool Rides - Save More',
    description: 'Save up to ৳200 per ride',
    color: 'from-purple-600 to-indigo-500',
    icon: '🚗',
  },
];

export default function LandingPage({ userProfile, onDestinationSelect, onProfileClick }: LandingPageProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const initials = userProfile ? `${userProfile.firstName[0]}${userProfile.lastName[0]}` : 'U';
  const isFemale = userProfile?.gender === 'female';

  // Theme colors based on gender
  const primaryColor = isFemale ? 'rose' : 'gray';
  const accentGradient = isFemale 
    ? 'from-pink-600 to-rose-500' 
    : 'from-gray-800 to-gray-700';

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Header */}
      <div className={`bg-gradient-to-br ${accentGradient} text-white p-6 pb-8`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm opacity-90">Welcome back,</p>
            <h1 className="text-2xl mt-1">{userProfile?.firstName || 'User'}</h1>
          </div>
          <button 
            onClick={onProfileClick}
            className="active:scale-95 transition-transform"
          >
            <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
              <AvatarFallback className={`bg-gradient-to-br ${isFemale ? 'from-rose-500 to-pink-400' : 'from-blue-600 to-cyan-500'} text-white`}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>

        {/* From/To Search Bar with Map Background */}
        <div className="space-y-3">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full rounded-xl overflow-hidden shadow-lg active:scale-[0.98] transition-transform relative"
          >
            {/* Mini Map Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-gray-50 to-blue-50">
              {/* Map grid pattern */}
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(to right, #e2e8f0 1px, transparent 1px),
                  linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
                `,
                backgroundSize: '30px 30px'
              }}></div>
              
              {/* Map streets/roads */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                {/* Horizontal roads */}
                <line x1="0" y1="35%" x2="100%" y2="35%" stroke="#94a3b8" strokeWidth="2" />
                <line x1="0" y1="65%" x2="100%" y2="65%" stroke="#94a3b8" strokeWidth="2" />
                
                {/* Vertical roads */}
                <line x1="30%" y1="0" x2="30%" y2="100%" stroke="#94a3b8" strokeWidth="2" />
                <line x1="70%" y1="0" x2="70%" y2="100%" stroke="#94a3b8" strokeWidth="2" />
                
                {/* Diagonal road for more realistic look */}
                <line x1="0" y1="0" x2="100%" y2="100%" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="5,5" opacity="0.5" />
              </svg>
              
              {/* Map landmarks/blocks */}
              <div className="absolute left-[15%] top-[20%] w-8 h-8 bg-green-200 opacity-60 rounded"></div>
              <div className="absolute left-[45%] top-[15%] w-10 h-10 bg-blue-200 opacity-60 rounded"></div>
              <div className="absolute right-[20%] top-[25%] w-6 h-6 bg-yellow-200 opacity-60 rounded"></div>
              <div className="absolute left-[20%] bottom-[20%] w-7 h-7 bg-purple-200 opacity-60 rounded"></div>
              <div className="absolute right-[25%] bottom-[25%] w-9 h-9 bg-pink-200 opacity-60 rounded"></div>
              
              {/* Current location marker with ripple effect */}
              <div className="absolute left-[40%] top-[45%]">
                <div className="relative">
                  {/* Ripple effect */}
                  <div className={`absolute inset-0 rounded-full ${isFemale ? 'bg-rose-500' : 'bg-blue-600'} opacity-30 animate-ping`}></div>
                  {/* Main marker */}
                  <div className={`relative w-4 h-4 rounded-full ${isFemale ? 'bg-rose-500' : 'bg-blue-600'} border-2 border-white shadow-lg`}></div>
                </div>
              </div>
            </div>

            {/* Search Content Overlay */}
            <div className="relative bg-white/90 backdrop-blur-md p-4">
              <div className="flex items-center gap-3 text-left">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isFemale ? 'bg-rose-500' : 'bg-gray-800'}`}></div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <MapPin className={`w-4 h-4 ${isFemale ? 'text-rose-500' : 'text-gray-800'}`} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">From</span>
                    <div className="flex-1 border-b border-gray-200"></div>
                  </div>
                  <p className="text-gray-900">Current Location</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm text-gray-500">To</span>
                    <div className="flex-1 border-b border-gray-200"></div>
                  </div>
                  <p className="text-gray-400">Where to?</p>
                </div>
                <Search className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Priyo Sathi (Close Friends) */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Priyo Sathi
            </h2>
            <button className="text-sm text-gray-500 flex items-center gap-1 active:opacity-70 transition-opacity">
              See All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
            {closeFriends.map((friend, index) => (
              <button
                key={index}
                className="flex flex-col items-center gap-2 flex-shrink-0 active:scale-95 transition-transform"
              >
                <div className="relative">
                  <Avatar className="w-16 h-16 border-2 border-white shadow-md">
                    <AvatarFallback className={`bg-gradient-to-br ${friend.color} text-white text-lg`}>
                      {friend.initial}
                    </AvatarFallback>
                  </Avatar>
                  {friend.lastSeen === 'Online' && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{friend.name}</p>
                  <p className="text-xs text-gray-500">{friend.lastSeen}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Offers & Promos */}
        <div className="px-6 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Offers & Promos
            </h2>
          </div>

          <div className="space-y-3">
            {promos.map((promo) => (
              <button
                key={promo.id}
                className="w-full bg-gradient-to-r rounded-xl p-4 text-white shadow-lg active:scale-[0.98] transition-transform text-left"
                style={{
                  backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
                  ['--tw-gradient-from' as any]: `var(--tw-gradient-stops, ${promo.color.split(' ')[0].replace('from-', '')})`,
                  ['--tw-gradient-to' as any]: `var(--tw-gradient-stops, ${promo.color.split(' ')[2]})`,
                }}
                className={`w-full bg-gradient-to-r ${promo.color} rounded-xl p-4 text-white shadow-lg active:scale-[0.98] transition-transform text-left`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{promo.icon}</div>
                    <div>
                      <p className="font-semibold">{promo.title}</p>
                      <p className="text-sm opacity-90 mt-1">{promo.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Rides */}
        <div className="px-6 pb-6 space-y-4">
          <h2 className="text-lg">Recent Rides</h2>
          
          <div className="space-y-3">
            <button className="w-full bg-gray-50 rounded-xl p-4 text-left active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className={`w-4 h-4 ${isFemale ? 'text-rose-500' : 'text-gray-800'}`} />
                    <p className="font-medium">Gulshan Office Complex</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>3 days ago</span>
                    <span>•</span>
                    <span>৳185</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>

            <button className="w-full bg-gray-50 rounded-xl p-4 text-left active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className={`w-4 h-4 ${isFemale ? 'text-rose-500' : 'text-gray-800'}`} />
                    <p className="font-medium">Bashundhara City</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>5 days ago</span>
                    <span>•</span>
                    <span>৳210</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Destination Search Dialog */}
      <DestinationSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectDestination={onDestinationSelect}
      />
    </div>
  );
}