import { MapPin, Phone, MessageSquare, Clock, Navigation2 } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import type { Pool } from '../App';
import { motion } from 'motion/react';

type DriverMatchedProps = {
  pool: Pool | null;
  onStartRide: () => void;
};

export default function DriverMatched({ pool, onStartRide }: DriverMatchedProps) {
  if (!pool) return null;

  // Simulate ride starting after a few seconds
  setTimeout(() => {
    onStartRide();
  }, 5000);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Map View */}
      <div className="flex-1 bg-gradient-to-br from-gray-200 via-gray-100 to-blue-50 relative">
        {/* Simulated map with car moving to pickup */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-0 w-full h-1 bg-gray-400 rotate-12"></div>
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-400 -rotate-6"></div>
          <div className="absolute top-3/4 left-0 w-full h-1 bg-gray-400 rotate-3"></div>
        </div>

        {/* Car icon (driver location) */}
        <motion.div
          initial={{ x: -50, y: -50 }}
          animate={{ x: 0, y: 0 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/4"
        >
          <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg">
            <Navigation2 className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Pickup location pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
          <MapPin className="w-10 h-10 text-blue-600 fill-blue-600" />
        </div>

        {/* Pulsing circle around pickup */}
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-blue-400 rounded-full"
        />
      </div>

      {/* Driver Info Bottom Sheet */}
      <div className="bg-white rounded-t-3xl shadow-2xl">
        <div className="p-6 space-y-5">
          {/* Driver arriving banner */}
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              <p className="text-green-800">Arriving in 4 min</p>
            </div>
          </div>

          {/* Driver Card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-blue-200">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white text-xl">
                  {pool.photo}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <h3 className="text-xl">{pool.driverName}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span>⭐ {pool.rating}</span>
                </div>
                <p className="text-sm text-gray-600">{pool.carModel}</p>
                <p className="text-sm text-gray-500">{pool.licensePlate}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="rounded-full w-12 h-12 active:scale-95 transition-transform">
                <Phone className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="outline" className="rounded-full w-12 h-12 active:scale-95 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Pickup Note */}
          <div className="bg-blue-50 p-4 rounded-xl space-y-2">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Pickup Location</p>
                <p>Meet at the corner of Northend Coffee</p>
              </div>
            </div>
          </div>

          {/* Pool info */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Seats in pool</span>
              <span>{pool.seatsLeft} available</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Your savings</span>
              <span className="text-green-600">{pool.savings} taka</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}