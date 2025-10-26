import { ArrowLeft, Users, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import type { UserProfile } from '../App';

type GenderPreferenceProps = {
  userProfile: UserProfile | null;
  onBack: () => void;
};

export default function GenderPreference({ userProfile, onBack }: GenderPreferenceProps) {
  const isFemale = userProfile?.gender === 'female';

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Gender Preference</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Safety Info */}
        {isFemale && (
          <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium text-pink-900">Your Safety Matters</span>
              </p>
              <p className="text-xs text-pink-700 mt-1">
                As a female rider, you have the option to ride exclusively with female drivers and co-riders for enhanced safety and comfort.
              </p>
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Pool Preferences</h3>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p>Female-Only Pools</p>
                <p className="text-sm text-gray-500">Ride with female drivers only</p>
              </div>
            </div>
            <Switch defaultChecked={isFemale} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p>Female Co-Riders Only</p>
                <p className="text-sm text-gray-500">Share rides with females only</p>
              </div>
            </div>
            <Switch defaultChecked={isFemale} />
          </div>
        </div>

        {/* General Preferences */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>General Preferences</h3>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p>Quiet Rides</p>
                <p className="text-sm text-gray-500">Prefer minimal conversation</p>
              </div>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p>Verified Riders Only</p>
                <p className="text-sm text-gray-500">Higher safety standard</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-600">
            Note: Enabling gender-specific preferences may increase wait times but provides enhanced safety and comfort.
          </p>
        </div>
      </div>
    </div>
  );
}
