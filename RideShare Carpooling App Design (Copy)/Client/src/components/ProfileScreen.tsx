import { User, MapPin, Settings, Shield, HelpCircle, ChevronRight, Heart, Star, Bell, Globe } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import type { UserProfile } from '../App';

type ProfileScreenProps = {
  userProfile: UserProfile | null;
  onMenuItemClick: (item: string) => void;
};

const menuSections = [
  {
    title: 'Personal',
    items: [
      { icon: User, label: 'Personal Info', badge: null },
      { icon: MapPin, label: 'Saved Places', badge: '3' },
      { icon: Star, label: 'Your Ratings', badge: '4.8' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Settings, label: 'Settings', badge: null },
      { icon: Bell, label: 'Notifications', badge: null },
      { icon: Globe, label: 'Language', badge: 'English' },
      { icon: Heart, label: 'Gender Preference', badge: null },
    ],
  },
  {
    title: 'Safety & Support',
    items: [
      { icon: Shield, label: 'Safety Center', badge: null },
      { icon: HelpCircle, label: 'Help & Support', badge: null },
    ],
  },
];

export default function ProfileScreen({ userProfile, onMenuItemClick }: ProfileScreenProps) {
  const initials = userProfile ? `${userProfile.firstName[0]}${userProfile.lastName[0]}` : 'U';
  const fullName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'User';
  const isFemale = userProfile?.gender === 'female';
  const headerGradient = isFemale 
    ? 'bg-gradient-to-br from-pink-500 to-rose-500' 
    : 'bg-gradient-to-br from-blue-600 to-cyan-500';
  const emailColor = isFemale ? 'text-pink-100' : 'text-blue-100';

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className={`${headerGradient} p-8 text-white`}>
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20 border-4 border-white/30">
            <AvatarFallback className="bg-white/20 text-white text-2xl backdrop-blur">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl">{fullName}</h2>
            <p className={emailColor}>{userProfile?.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl">47</p>
            <p className="text-sm text-gray-500">Trips</p>
          </div>
          <Separator orientation="vertical" className="justify-self-center h-12" />
          <div className="text-center">
            <p className="text-2xl">4.8</p>
            <p className="text-sm text-gray-500">Rating</p>
          </div>
          <Separator orientation="vertical" className="justify-self-center h-12" />
          <div className="text-center">
            <p className="text-2xl">2.1k</p>
            <p className="text-sm text-gray-500">Saved</p>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="p-4 space-y-4">
        {menuSections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-gray-50">
              <h3 className="text-sm text-gray-600">{section.title}</h3>
            </div>
            <div className="divide-y">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    onClick={() => onMenuItemClick(item.label)}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer active:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-sm text-gray-500">{item.badge}</span>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Special Safety Note for Female Users */}
        {userProfile?.gender === 'female' && (
          <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium text-pink-900">Female-only pools enabled</span>
              </p>
              <p className="text-xs text-pink-700 mt-1">
                You can choose to ride only with female drivers and co-riders for added safety and comfort.
              </p>
            </div>
          </div>
        )}

        {/* App Info */}
        <div className="text-center py-4 text-sm text-gray-500 space-y-1">
          <p>RideShare v2.4.0</p>
          <p className="text-xs">© 2025 RideShare. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
