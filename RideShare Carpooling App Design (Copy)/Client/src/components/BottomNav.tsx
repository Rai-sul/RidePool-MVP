import { MapPin, Receipt, Wallet, User, Users } from 'lucide-react';

type BottomNavProps = {
  activeTab: 'home' | 'trips' | 'wallet' | 'profile' | 'friends';
  onTabChange: (tab: 'home' | 'trips' | 'wallet' | 'profile' | 'friends') => void;
  isFemale?: boolean;
};

export default function BottomNav({ activeTab, onTabChange, isFemale = false }: BottomNavProps) {
  const activeColor = isFemale ? 'text-rose-600' : 'text-gray-900';
  const activeFill = isFemale ? 'fill-rose-600' : 'fill-gray-900';
  const activeBg = isFemale ? 'bg-gradient-to-br from-pink-600 to-rose-500' : 'bg-gradient-to-br from-gray-800 to-gray-700';
  
  const leftTabs = [
    { id: 'trips' as const, icon: Receipt, label: 'Trips' },
    { id: 'friends' as const, icon: Users, label: 'Friends' },
  ];
  
  const rightTabs = [
    { id: 'wallet' as const, icon: Wallet, label: 'Wallet' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];
  
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex items-center justify-between h-16 px-2">
        {/* Left Tabs */}
        <div className="flex items-center flex-1 justify-around">
          {leftTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all active:scale-95"
              >
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive
                      ? `${activeColor} ${activeFill}`
                      : 'text-gray-400'
                  }`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span
                  className={`text-xs transition-colors ${
                    isActive ? activeColor : 'text-gray-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center Home Button */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center transition-all active:scale-95 ${
            activeTab === 'home' ? 'scale-110' : ''
          }`}
        >
          <div className={`${
            activeTab === 'home' 
              ? `${activeBg} shadow-lg` 
              : 'bg-gray-100'
          } w-14 h-14 rounded-full flex items-center justify-center transition-all`}>
            <MapPin
              className={`w-6 h-6 transition-colors ${
                activeTab === 'home' ? 'text-white' : 'text-gray-400'
              }`}
              strokeWidth={activeTab === 'home' ? 2 : 1.5}
            />
          </div>
          <span
            className={`text-xs mt-1 transition-colors ${
              activeTab === 'home' ? activeColor : 'text-gray-400'
            }`}
          >
            
          </span>
        </button>

        {/* Right Tabs */}
        <div className="flex items-center flex-1 justify-around">
          {rightTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all active:scale-95"
              >
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive
                      ? `${activeColor} ${activeFill}`
                      : 'text-gray-400'
                  }`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span
                  className={`text-xs transition-colors ${
                    isActive ? activeColor : 'text-gray-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}