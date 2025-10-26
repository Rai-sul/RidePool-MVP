import { Wallet, CreditCard, Plus, ChevronRight, DollarSign, Gift, History } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import type { UserProfile } from '../App';

type WalletScreenProps = {
  userProfile: UserProfile | null;
  onNavigate: (page: string) => void;
};

const paymentMethods = [
  { id: '1', type: 'Cash', icon: DollarSign, primary: true },
  { id: '2', type: 'Credit Card', last4: '4242', icon: CreditCard },
  { id: '3', type: 'Debit Card', last4: '8888', icon: CreditCard },
];

const transactions = [
  { id: '1', type: 'Trip Payment', amount: -185, date: 'Oct 23, 2025', time: '2:45 PM' },
  { id: '2', type: 'Trip Payment', amount: -120, date: 'Oct 22, 2025', time: '8:30 AM' },
  { id: '3', type: 'Refund', amount: 50, date: 'Oct 21, 2025', time: '4:20 PM' },
  { id: '4', type: 'Trip Payment', amount: -95, date: 'Oct 21, 2025', time: '6:15 PM' },
];

export default function WalletScreen({ userProfile, onNavigate }: WalletScreenProps) {
  const isFemale = userProfile?.gender === 'female';
  const balanceGradient = isFemale 
    ? 'bg-gradient-to-br from-pink-500 to-rose-500' 
    : 'bg-gradient-to-br from-blue-600 to-cyan-500';
  const buttonTextColor = isFemale ? 'text-pink-600' : 'text-blue-600';

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      <div className="p-6 bg-white border-b">
        <h1 className="text-2xl">Wallet</h1>
      </div>

      <div className="p-6 space-y-6">
        {/* Balance Card */}
        <Card className={`${balanceGradient} text-white border-0`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Wallet className="w-5 h-5" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-4xl">0 taka</p>
              <Button 
                onClick={() => onNavigate('add-money')}
                className={`w-full bg-white ${buttonTextColor} hover:bg-gray-100`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Money
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3>Payment Methods</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={() => onNavigate('payment-methods')}
            >
              <Plus className="w-4 h-4" />
              Add New
            </Button>
          </div>

          <div className="space-y-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div
                  key={method.id}
                  onClick={() => onNavigate('payment-methods')}
                  className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p>{method.type}</p>
                      {method.last4 && (
                        <p className="text-sm text-gray-500">•••• {method.last4}</p>
                      )}
                      {method.primary && (
                        <p className="text-xs text-blue-600">Default</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Promo Code */}
        <div 
          onClick={() => onNavigate('promo-code')}
          className="bg-white rounded-2xl p-5 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Gift className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p>Promo Code</p>
                <p className="text-sm text-gray-500">Add a promo code</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <h3>Transaction History</h3>
          </div>

          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <div key={transaction.id}>
                {index > 0 && <Separator />}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm">{transaction.type}</p>
                    <p className="text-xs text-gray-500">
                      {transaction.date} • {transaction.time}
                    </p>
                  </div>
                  <p
                    className={`${
                      transaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                    }`}
                  >
                    {transaction.amount > 0 ? '+' : ''}
                    {transaction.amount} taka
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onNavigate('all-transactions')}
          >
            View All Transactions
          </Button>
        </div>
      </div>
    </div>
  );
}
