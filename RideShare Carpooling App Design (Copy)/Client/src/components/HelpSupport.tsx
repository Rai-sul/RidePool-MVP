import { ArrowLeft, HelpCircle, MessageCircle, Phone, Mail, FileText, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

type HelpSupportProps = {
  onBack: () => void;
};

const helpTopics = [
  { icon: FileText, title: 'Trip Issues', items: ['Cancel a trip', 'Report a problem', 'Lost items'] },
  { icon: FileText, title: 'Payment & Billing', items: ['Payment methods', 'Refunds', 'Promo codes'] },
  { icon: FileText, title: 'Account', items: ['Update profile', 'Verify account', 'Delete account'] },
  { icon: FileText, title: 'Safety', items: ['Report safety issue', 'Emergency help', 'Privacy settings'] },
];

export default function HelpSupport({ onBack }: HelpSupportProps) {
  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Help & Support</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-50 active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm">Chat</p>
          </div>

          <div className="bg-white rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-50 active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm">Call</p>
          </div>

          <div className="bg-white rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-50 active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm">Email</p>
          </div>
        </div>

        {/* Help Topics */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Browse Help Topics</h3>
          {helpTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <div key={topic.title}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <p>{topic.title}</p>
                </div>
                <div className="ml-11 space-y-1">
                  {topic.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <p className="text-sm text-gray-600">{item}</p>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <h3>Frequently Asked Questions</h3>
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
              <p className="text-sm">How do I cancel a ride?</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
              <p className="text-sm">What is the cancellation policy?</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
              <p className="text-sm">How do I add a payment method?</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
              <p className="text-sm">How are pool mates selected?</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h3 className="text-blue-900 mb-3">Contact Information</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>📞 Hotline: +880 9612-345678</p>
            <p>📧 Email: support@rideshare.com</p>
            <p>🕐 Available: 24/7</p>
          </div>
        </div>
      </div>
    </div>
  );
}
