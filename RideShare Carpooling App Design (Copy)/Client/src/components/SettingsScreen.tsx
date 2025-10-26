import { ArrowLeft, Volume2, Vibrate, Moon, MapPin, Wifi } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

type SettingsScreenProps = {
  onBack: () => void;
};

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Settings</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Sound & Notifications */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Sound & Notifications</h3>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p>Sound Effects</p>
                <p className="text-sm text-gray-500">Enable in-app sounds</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Vibrate className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p>Vibration</p>
                <p className="text-sm text-gray-500">Haptic feedback</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        {/* Display */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Display</h3>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Moon className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p>Dark Mode</p>
                <p className="text-sm text-gray-500">Use dark theme</p>
              </div>
            </div>
            <Switch />
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Location</h3>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p>Location Services</p>
                <p className="text-sm text-gray-500">Always allow</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        {/* Data & Storage */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Data & Storage</h3>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Wifi className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p>Download Maps</p>
                <p className="text-sm text-gray-500">Only on Wi-Fi</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        <Button variant="destructive" className="w-full">
          Clear Cache
        </Button>
      </div>
    </div>
  );
}
