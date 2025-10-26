import { Receipt, CreditCard, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import type { Destination, UserProfile } from '../App';

type PaymentSummaryProps = {
  destination: Destination | null;
  userProfile: UserProfile | null;
  onDone: () => void;
};

export default function PaymentSummary({ destination, userProfile, onDone }: PaymentSummaryProps) {
  const tipAmounts = [20, 30, 50];
  const isFemale = userProfile?.gender === 'female';

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Receipt className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl">Trip Complete!</h2>
            <p className="text-gray-500">Thank you for riding with us</p>
          </div>

          {/* Trip Details */}
          <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Route</span>
              <span className="text-right">{destination?.name || 'Your destination'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Date</span>
              <span>Oct 23, 2025</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Time</span>
              <span>2:45 PM</span>
            </div>
          </div>

          {/* Fare Breakdown */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Fare Breakdown
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Fare</span>
                <span>200 taka</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Pool Discount</span>
                <span>-50 taka</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes & Fee</span>
                <span>35 taka</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-xl">
                <span>Total Paid</span>
                <span>185 taka</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <span>Cash</span>
            </div>
            <span className="text-gray-600">185 taka</span>
          </div>

          {/* Add Tip */}
          <div className="space-y-3">
            <h3 className="text-sm text-gray-600">Add Tip (Optional)</h3>
            <div className="flex gap-3">
              {tipAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  className="flex-1 h-12 active:scale-95 transition-transform"
                >
                  {amount}tk
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="p-6 border-t">
        <Button
          onClick={onDone}
          className={`w-full h-14 ${isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'} active:scale-[0.98] transition-transform`}
        >
          Done
        </Button>
      </div>
    </div>
  );
}