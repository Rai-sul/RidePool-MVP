import { ArrowLeft, Download, Filter, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { useState } from 'react';

type AllTransactionsProps = {
  onBack: () => void;
};

const allTransactions = [
  { id: '1', type: 'Trip Payment', amount: -185, date: 'Oct 23, 2025', time: '2:45 PM', status: 'Completed' },
  { id: '2', type: 'Trip Payment', amount: -120, date: 'Oct 22, 2025', time: '8:30 AM', status: 'Completed' },
  { id: '3', type: 'Refund', amount: 50, date: 'Oct 21, 2025', time: '4:20 PM', status: 'Completed' },
  { id: '4', type: 'Trip Payment', amount: -95, date: 'Oct 21, 2025', time: '6:15 PM', status: 'Completed' },
  { id: '5', type: 'Wallet Top-up', amount: 500, date: 'Oct 20, 2025', time: '10:00 AM', status: 'Completed' },
  { id: '6', type: 'Trip Payment', amount: -150, date: 'Oct 19, 2025', time: '5:30 PM', status: 'Completed' },
  { id: '7', type: 'Trip Payment', amount: -200, date: 'Oct 18, 2025', time: '9:15 AM', status: 'Completed' },
  { id: '8', type: 'Promo Credit', amount: 100, date: 'Oct 17, 2025', time: '12:00 PM', status: 'Completed' },
  { id: '9', type: 'Trip Payment', amount: -175, date: 'Oct 16, 2025', time: '7:45 PM', status: 'Completed' },
  { id: '10', type: 'Trip Payment', amount: -130, date: 'Oct 15, 2025', time: '8:00 AM', status: 'Completed' },
];

export default function AllTransactions({ onBack }: AllTransactionsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = allTransactions.filter((transaction) =>
    transaction.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpent = allTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalEarned = allTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl">All Transactions</h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4">
            <p className="text-sm text-gray-500 mb-1">Total Spent</p>
            <p className="text-2xl text-red-600">-{totalSpent} taka</p>
          </div>
          <div className="bg-white rounded-2xl p-4">
            <p className="text-sm text-gray-500 mb-1">Total Earned</p>
            <p className="text-2xl text-green-600">+{totalEarned} taka</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <h3>Transaction History</h3>
          <Separator />
          
          {filteredTransactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transactions found</p>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction, index) => (
                <div key={transaction.id}>
                  {index > 0 && <Separator />}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm">{transaction.type}</p>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {transaction.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {transaction.date} • {transaction.time}
                      </p>
                    </div>
                    <p
                      className={`font-medium ${
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
          )}
        </div>
      </div>
    </div>
  );
}
