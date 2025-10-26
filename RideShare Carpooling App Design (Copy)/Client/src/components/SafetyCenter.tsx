import { ArrowLeft, Shield, Phone, Users, AlertCircle, Share2, Lock } from 'lucide-react';
import { Button } from './ui/button';

type SafetyCenterProps = {
  onBack: () => void;
};

const safetyFeatures = [
  {
    icon: Phone,
    title: 'Emergency Contacts',
    description: 'Add trusted contacts who can track your trips',
    action: 'Manage',
  },
  {
    icon: Share2,
    title: 'Share My Trip',
    description: 'Share live location with friends and family',
    action: 'Share',
  },
  {
    icon: AlertCircle,
    title: '24/7 Safety Line',
    description: 'Call our safety team anytime',
    action: 'Call',
  },
  {
    icon: Lock,
    title: 'Verify Your Ride',
    description: 'Match driver details before you ride',
    action: 'Learn More',
  },
];

const emergencyContacts = [
  { id: '1', name: 'Mom', phone: '+880 1712-111111' },
  { id: '2', name: 'Dad', phone: '+880 1712-222222' },
];

export default function SafetyCenter({ onBack }: SafetyCenterProps) {
  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Safety Center</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Emergency Button */}
        <Button
          variant="destructive"
          className="w-full h-16 bg-red-600 hover:bg-red-700"
        >
          <AlertCircle className="w-6 h-6 mr-2" />
          Emergency Alert
        </Button>

        {/* Safety Features */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <h3>Safety Features</h3>
          {safetyFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex items-center justify-between p-3 border rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p>{feature.title}</p>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  {feature.action}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3>Emergency Contacts</h3>
            <Button variant="ghost" size="sm">
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {emergencyContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p>{contact.name}</p>
                    <p className="text-sm text-gray-500">{contact.phone}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-blue-900">Safety Tips</h3>
          </div>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Always verify driver details before entering the vehicle</li>
            <li>• Share your trip with trusted contacts</li>
            <li>• Sit in the back seat when riding alone</li>
            <li>• Trust your instincts - cancel if something feels wrong</li>
            <li>• Keep your phone charged and accessible</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
