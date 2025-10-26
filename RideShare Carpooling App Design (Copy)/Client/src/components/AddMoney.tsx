import { ArrowLeft, Wallet, CreditCard, Smartphone, Building } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';

type AddMoneyProps = {
  onBack: () => void;
};

const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

const paymentOptions = [
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, description: 'Add using your card' },
  { id: 'mobile', name: 'Mobile Banking', icon: Smartphone, description: 'bKash, Nagad, Rocket' },
  { id: 'bank', name: 'Bank Transfer', icon: Building, description: 'Direct bank transfer' },
];

export default function AddMoney({ onBack }: AddMoneyProps) {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleAddMoney = () => {
    if (amount && selectedMethod) {
      // Handle add money logic
      alert(`Adding ${amount} taka via ${selectedMethod}`);
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Add Money</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Current Balance */}
        <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5" />
            <p className="text-sm opacity-90">Current Balance</p>
          </div>
          <p className="text-4xl">0 taka</p>
        </div>

        {/* Enter Amount */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Enter Amount</h3>
          <div className="relative">
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-16 text-2xl pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">taka</span>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map((value) => (
              <Button
                key={value}
                variant="outline"
                onClick={() => handleQuickAmount(value)}
                className={amount === value.toString() ? 'border-blue-600 bg-blue-50' : ''}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Select Payment Method</h3>
          <div className="space-y-2">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedMethod(option.id)}
                  className={`w-full flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                    selectedMethod === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedMethod === option.id ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      selectedMethod === option.id ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p>{option.name}</p>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                  {selectedMethod === option.id && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Money Button */}
        <Button
          onClick={handleAddMoney}
          disabled={!amount || !selectedMethod}
          className="w-full h-14"
        >
          Add {amount || '0'} taka
        </Button>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">
            🔒 All transactions are secured with 256-bit encryption. No transaction fees applied.
          </p>
        </div>
      </div>
    </div>
  );
}
