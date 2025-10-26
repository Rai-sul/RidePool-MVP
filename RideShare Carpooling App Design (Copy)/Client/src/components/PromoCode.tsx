import { ArrowLeft, Gift, Tag, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';

type PromoCodeProps = {
  onBack: () => void;
};

const availablePromos = [
  {
    id: '1',
    code: 'FIRST50',
    title: '50% OFF First Ride',
    description: 'Valid for first-time users only',
    discount: '50% off',
    expiry: 'Expires: Dec 31, 2025',
  },
  {
    id: '2',
    code: 'POOL20',
    title: '৳20 OFF Pool Rides',
    description: 'Valid on all pool rides',
    discount: '৳20 off',
    expiry: 'Expires: Nov 30, 2025',
  },
  {
    id: '3',
    code: 'WEEKEND100',
    title: 'Weekend Special',
    description: 'Valid on weekends only',
    discount: '৳100 off',
    expiry: 'Expires: Oct 31, 2025',
  },
];

export default function PromoCode({ onBack }: PromoCodeProps) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleApply = () => {
    if (promoCode.trim()) {
      setAppliedCode(promoCode.toUpperCase());
      setPromoCode('');
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Promo Code</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Apply Promo Code */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Enter Promo Code</h3>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="h-12 flex-1"
            />
            <Button onClick={handleApply} className="h-12 px-6">
              Apply
            </Button>
          </div>
          
          {appliedCode && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-900">
                Promo code "{appliedCode}" applied successfully!
              </p>
            </div>
          )}
        </div>

        {/* Available Promo Codes */}
        <div className="space-y-3">
          <h3>Available Offers</h3>
          
          {availablePromos.map((promo) => (
            <div
              key={promo.id}
              className="bg-white rounded-2xl p-5 space-y-3 border-2 border-dashed border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{promo.title}</p>
                    <p className="text-sm text-gray-500 mt-1">{promo.description}</p>
                    <p className="text-xs text-gray-400 mt-2">{promo.expiry}</p>
                  </div>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  {promo.discount}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-dashed">
                <div className="flex items-center gap-2 flex-1 bg-gray-50 px-3 py-2 rounded-lg">
                  <Tag className="w-4 h-4 text-gray-600" />
                  <code className="text-sm font-mono font-semibold">{promo.code}</code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(promo.code)}
                  className="gap-1"
                >
                  {copiedCode === promo.code ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">
            💡 Promo codes are applied automatically at checkout. Only one promo code can be used per ride.
          </p>
        </div>
      </div>
    </div>
  );
}
