import { MapPin, Clock, DollarSign, Users, Navigation, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { motion } from 'motion/react';
import type { Destination, UserProfile, Pool } from '../App';

type RideConfirmationProps = {
  destination: Destination | null;
  userProfile: UserProfile | null;
  rideType: 'female-only' | 'regular' | null;
  onPoolSelect: (pool: Pool) => void;
  onBack: () => void;
};

type PoolStop = {
  type: 'pickup' | 'dropoff';
  name: string;
  rider: string;
  x: number;
  y: number;
};

const mockPools: Pool[] = [
  {
    id: '1',
    driverName: 'Raisul',
    seatsLeft: 2,
    savings: 145,
    eta: 5,
    walkDistance: 150,
    rating: 4.92,
    carModel: 'Black Honda Civic',
    licensePlate: 'DHK METRO GA-12-36-36',
    photo: 'R'
  },
  {
    id: '2',
    driverName: 'Fatima',
    seatsLeft: 3,
    savings: 120,
    eta: 8,
    walkDistance: 200,
    rating: 4.88,
    carModel: 'White Toyota Corolla',
    licensePlate: 'DHK METRO HA-45-12-89',
    photo: 'F'
  },
  {
    id: '3',
    driverName: 'Ahmed',
    seatsLeft: 1,
    savings: 160,
    eta: 3,
    walkDistance: 100,
    rating: 4.95,
    carModel: 'Silver Honda City',
    licensePlate: 'DHK METRO BA-78-23-45',
    photo: 'A'
  },
  {
    id: '4',
    driverName: 'Aisha',
    seatsLeft: 2,
    savings: 155,
    eta: 4,
    walkDistance: 120,
    rating: 4.93,
    carModel: 'Red Toyota Yaris',
    licensePlate: 'DHK METRO CA-56-78-90',
    photo: 'A'
  },
  {
    id: '5',
    driverName: 'Nadia',
    seatsLeft: 3,
    savings: 135,
    eta: 6,
    walkDistance: 180,
    rating: 4.90,
    carModel: 'Blue Honda Fit',
    licensePlate: 'DHK METRO DA-23-45-67',
    photo: 'N'
  },
];

// Female driver names for filtering
const femaleDrivers = ['Fatima', 'Aisha', 'Nadia'];

export default function RideConfirmation({ destination, userProfile, rideType, onPoolSelect, onBack }: RideConfirmationProps) {
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [activeRideType, setActiveRideType] = useState<'female-only' | 'regular'>(rideType || 'regular');
  const isFemale = userProfile?.gender === 'female';
  
  // Mock stops for each pool showing other riders' pickups and drop-offs
  const poolStops: Record<string, PoolStop[]> = {
    '1': [
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 25, y: 30 },
      { type: 'pickup', name: 'Gulshan Circle', rider: 'Sarah', x: 40, y: 45 },
      { type: 'dropoff', name: 'Banani Office', rider: 'Sarah', x: 55, y: 60 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 75, y: 75 },
    ],
    '2': [
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 20, y: 35 },
      { type: 'pickup', name: 'Bashundhara', rider: 'Ali', x: 35, y: 50 },
      { type: 'pickup', name: 'Niketon', rider: 'Fatima', x: 50, y: 55 },
      { type: 'dropoff', name: 'Mohakhali', rider: 'Ali', x: 60, y: 65 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 70, y: 80 },
      { type: 'dropoff', name: 'Uttara', rider: 'Fatima', x: 80, y: 85 },
    ],
    '3': [
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 30, y: 25 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 70, y: 75 },
    ],
    '4': [
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 25, y: 30 },
      { type: 'pickup', name: 'Gulshan Circle', rider: 'Sarah', x: 40, y: 45 },
      { type: 'dropoff', name: 'Banani Office', rider: 'Sarah', x: 55, y: 60 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 75, y: 75 },
    ],
    '5': [
      { type: 'pickup', name: 'Your Pickup', rider: 'You', x: 20, y: 35 },
      { type: 'pickup', name: 'Bashundhara', rider: 'Ali', x: 35, y: 50 },
      { type: 'pickup', name: 'Niketon', rider: 'Fatima', x: 50, y: 55 },
      { type: 'dropoff', name: 'Mohakhali', rider: 'Ali', x: 60, y: 65 },
      { type: 'dropoff', name: destination?.name || 'Your Destination', rider: 'You', x: 70, y: 80 },
      { type: 'dropoff', name: 'Uttara', rider: 'Fatima', x: 80, y: 85 },
    ],
  };
  
  // Filter pools based on user gender and ride type selection
  const filteredPools = (() => {
    if (isFemale && activeRideType === 'female-only') {
      // Female users with female-only selection: show only female driver pools
      return mockPools.filter(p => femaleDrivers.includes(p.driverName));
    } else if (isFemale && activeRideType === 'regular') {
      // Female users with regular selection: show all pools
      return mockPools;
    } else {
      // Male users: show only non-female-only pools (male drivers)
      return mockPools.filter(p => !femaleDrivers.includes(p.driverName));
    }
  })();
  
  const handlePoolClick = (pool: Pool) => {
    setSelectedPoolId(pool.id);
  };

  const handleConfirm = () => {
    if (selectedPoolId) {
      const pool = mockPools.find(p => p.id === selectedPoolId);
      if (pool) {
        onPoolSelect(pool);
      }
    }
  };

  const currentStops = selectedPoolId ? poolStops[selectedPoolId] || [] : [];

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Map Preview */}
      <div className="h-1/3 bg-gradient-to-br from-gray-200 via-gray-100 to-blue-50 relative overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-10 bg-white shadow-md rounded-full w-10 h-10 active:scale-95 transition-transform"
          onClick={onBack}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Simulated route and stops */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Show route path when pool is selected */}
            {selectedPoolId && currentStops.length > 0 && (
              <>
                {/* Route line connecting all stops */}
                <svg className="absolute inset-0 w-full h-full">
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    d={`M ${currentStops[0].x}% ${currentStops[0].y}% ${currentStops
                      .slice(1)
                      .map(stop => `L ${stop.x}% ${stop.y}%`)
                      .join(' ')}`}
                    stroke="#3B82F6"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="8,4"
                  />
                </svg>

                {/* Driver car icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute"
                  style={{ left: `${currentStops[0].x}%`, top: `${currentStops[0].y - 8}%` }}
                >
                  <div className="relative -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg">
                      <Navigation className="w-5 h-5" />
                    </div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <div className="bg-white px-2 py-1 rounded shadow-md text-xs">
                        Driver here
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* All stops with labels */}
                {currentStops.map((stop, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="absolute"
                    style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
                  >
                    <div className="relative -translate-x-1/2 -translate-y-full">
                      {stop.type === 'pickup' ? (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${
                          stop.rider === 'You' ? 'bg-blue-600' : 'bg-green-500'
                        }`}>
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      ) : (
                        <MapPin className={`w-6 h-6 shadow-lg ${
                          stop.rider === 'You' ? 'text-red-600 fill-red-600' : 'text-orange-500 fill-orange-500'
                        }`} />
                      )}
                      
                      {/* Stop label */}
                      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <div className={`text-xs px-2 py-1 rounded shadow-md ${
                          stop.rider === 'You' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border border-gray-200'
                        }`}>
                          <div className="font-medium">{stop.rider}</div>
                          <div className={stop.rider === 'You' ? 'text-blue-100' : 'text-gray-500'}>
                            {stop.type === 'pickup' ? 'Pickup' : 'Drop-off'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {/* Default view when no pool selected */}
            {!selectedPoolId && (
              <>
                <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <div className="absolute bottom-1/4 right-1/4">
                  <MapPin className="w-8 h-8 text-red-600 fill-red-600" />
                </div>
                <svg className="absolute inset-0 w-full h-full">
                  <path
                    d="M 100 80 Q 200 120 280 200"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="8,4"
                  />
                </svg>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        {selectedPoolId && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 text-xs space-y-1"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span>Your stops</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Co-rider pickups</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-orange-500 fill-orange-500" />
              <span>Co-rider drops</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Sheet */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="p-5 space-y-5">
          {/* Ride Type Selector for Female Users */}
          {isFemale && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Ride Type
              </h3>
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setActiveRideType('female-only');
                    setSelectedPoolId(null); // Reset selection when switching
                  }}
                  className={`flex-1 h-12 transition-all ${
                    activeRideType === 'female-only'
                      ? 'bg-pink-500 text-white border-2 border-pink-500 hover:bg-pink-600'
                      : 'bg-pink-50 text-pink-700 border-2 border-pink-300 hover:bg-pink-100'
                  } active:scale-[0.98]`}
                >
                  RideShare with Female
                </Button>
                <Button 
                  onClick={() => {
                    setActiveRideType('regular');
                    setSelectedPoolId(null); // Reset selection when switching
                  }}
                  variant={activeRideType === 'regular' ? 'default' : 'outline'}
                  className={`flex-1 h-12 transition-all ${
                    activeRideType === 'regular'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-2'
                  } active:scale-[0.98]`}
                >
                  Regular RideShare
                </Button>
              </div>
              {activeRideType === 'female-only' && (
                <p className="text-sm text-pink-600 bg-pink-50 border border-pink-200 rounded-lg p-3">
                  Showing pools with female drivers and riders only for your safety and comfort.
                </p>
              )}
            </div>
          )}

          {/* Route Summary */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-blue-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Pickup</p>
                <p>Current Location</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-red-600 fill-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Drop-off</p>
                <p>{destination?.name}</p>
                <p className="text-sm text-gray-500">{destination?.address}</p>
              </div>
            </div>
          </div>

          {/* Cost & Time */}
          <div className="flex items-center gap-4 py-3 px-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span>185 taka</span>
            </div>
            <div className="w-px h-6 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>28 mins</span>
            </div>
          </div>

          {/* Available Pools */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Available Pools
            </h3>
            
            {!selectedPoolId && (
              <p className="text-sm text-gray-500">Tap a pool to see the route and other riders</p>
            )}
            
            <div className="space-y-3">
              {filteredPools.map((pool) => (
                <div
                  key={pool.id}
                  onClick={() => handlePoolClick(pool)}
                  className={`border-2 rounded-2xl p-4 space-y-3 transition-all cursor-pointer ${
                    selectedPoolId === pool.id
                      ? 'border-blue-500 shadow-lg bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white">
                        {pool.photo}
                      </div>
                      <div>
                        <p className="font-medium">{pool.driverName}'s Pool</p>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <span>⭐ {pool.rating}</span>
                        </div>
                      </div>
                    </div>
                    {selectedPoolId === pool.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center"
                      >
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </motion.div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{pool.seatsLeft} seats left</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <DollarSign className="w-4 h-4" />
                      <span>Save {pool.savings} taka</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{pool.eta} min away</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Navigation className="w-4 h-4" />
                      <span>Walk {pool.walkDistance}m</span>
                    </div>
                  </div>

                  {selectedPoolId === pool.id && poolStops[pool.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-3 border-t border-blue-200 space-y-2"
                    >
                      <p className="text-sm font-medium text-blue-900">Route Stops:</p>
                      <div className="space-y-1 text-sm">
                        {poolStops[pool.id].map((stop, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-gray-600">
                            {stop.type === 'pickup' ? (
                              <div className={`w-2 h-2 rounded-full ${
                                stop.rider === 'You' ? 'bg-blue-600' : 'bg-green-500'
                              }`}></div>
                            ) : (
                              <MapPin className={`w-3 h-3 ${
                                stop.rider === 'You' ? 'text-red-600 fill-red-600' : 'text-orange-500 fill-orange-500'
                              }`} />
                            )}
                            <span className={stop.rider === 'You' ? 'text-blue-900 font-medium' : ''}>
                              {stop.rider} - {stop.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-600">Payment Method</span>
              <div className="flex items-center gap-2">
                <span>Cash</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Spacer for fixed button */}
          <div className="h-20"></div>
        </div>
      </div>

      {/* Fixed Confirm Button above bottom nav */}
      {selectedPoolId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-16 left-0 right-0 px-5 pb-3 bg-white border-t border-gray-200"
        >
          <Button
            onClick={handleConfirm}
            className={`w-full h-14 ${isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'} active:scale-[0.98] transition-transform`}
          >
            Confirm RideShare Pool
          </Button>
        </motion.div>
      )}
    </div>
  );
}