import { ArrowLeft, Bell, MessageSquare, Car, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

type NotificationsScreenProps = {
  onBack: () => void;
};

export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Notifications</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Push Notifications */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Push Notifications</h3>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p>All Notifications</p>
                <p className="text-sm text-gray-500">Enable all notifications</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        {/* Ride Updates */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Ride Updates</h3>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p>Driver Matched</p>
                <p className="text-sm text-gray-500">When a driver accepts</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p>Driver Arriving</p>
                <p className="text-sm text-gray-500">When driver is near</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p>Ride Completed</p>
                <p className="text-sm text-gray-500">Trip completion alerts</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Messages</h3>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p>Chat Messages</p>
                <p className="text-sm text-gray-500">Messages from driver</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        {/* Payments & Promos */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Payments & Promos</h3>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p>Payment Updates</p>
                <p className="text-sm text-gray-500">Receipt and refunds</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p>Promotions</p>
                <p className="text-sm text-gray-500">Special offers & discounts</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
}
