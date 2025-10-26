import { MapPin, Search, Clock, Star, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Destination } from '../App';

type DestinationSearchProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination: (destination: Destination) => void;
};

const recentDestinations = [
  { name: 'Gulshan Office Complex', address: 'Gulshan 2, Dhaka 1212' },
  { name: 'Bashundhara City', address: 'Panthapath, Dhaka 1215' },
  { name: 'Uttara Sector 7', address: 'Uttara, Dhaka 1230' },
];

const popularDestinations = [
  { name: 'Airport', address: 'Hazrat Shahjalal International Airport' },
  { name: 'Dhanmondi Lake', address: 'Dhanmondi, Dhaka 1209' },
  { name: 'Banani 11', address: 'Banani, Dhaka 1213' },
  { name: 'Mirpur 10', address: 'Mirpur, Dhaka 1216' },
  { name: 'Mohakhali DOHS', address: 'Mohakhali, Dhaka 1206' },
];

export default function DestinationSearch({ isOpen, onClose, onSelectDestination }: DestinationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDestinations = searchQuery
    ? popularDestinations.filter(
        (dest) =>
          dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dest.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : popularDestinations;

  const handleSelect = (destination: Destination) => {
    onSelectDestination(destination);
    onClose();
    setSearchQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Search Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-w-md mx-auto"
            style={{ maxHeight: '90vh' }}
          >
            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b sticky top-0 bg-white rounded-t-3xl">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full h-10 w-10 active:scale-95 transition-transform"
                >
                  <X className="w-5 h-5" />
                </Button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <Input
                    autoFocus
                    type="text"
                    placeholder="Where to?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                  />
                </div>
              </div>

              {/* Current Location */}
              <div className="border-b">
                <button
                  onClick={() =>
                    handleSelect({ name: 'Current Location', address: 'Your current position' })
                  }
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Use Current Location</p>
                    <p className="text-sm text-gray-500">Via GPS</p>
                  </div>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Recent Searches */}
                {!searchQuery && recentDestinations.length > 0 && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <h3 className="text-sm">Recent</h3>
                    </div>
                    <div className="space-y-2">
                      {recentDestinations.map((dest, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelect(dest)}
                          className="w-full p-3 flex items-start gap-3 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{dest.name}</p>
                            <p className="text-sm text-gray-500">{dest.address}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular/Search Results */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Star className="w-4 h-4" />
                    <h3 className="text-sm">
                      {searchQuery ? 'Search Results' : 'Popular Destinations'}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {filteredDestinations.length > 0 ? (
                      filteredDestinations.map((dest, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelect(dest)}
                          className="w-full p-3 flex items-start gap-3 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{dest.name}</p>
                            <p className="text-sm text-gray-500">{dest.address}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No destinations found</p>
                        <p className="text-sm">Try a different search</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
