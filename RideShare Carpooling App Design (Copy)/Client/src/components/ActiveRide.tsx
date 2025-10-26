import { MapPin, Shield, Phone, Share2, Navigation2, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import type { Pool, Destination } from '../App';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

type ActiveRideProps = {
  pool: Pool | null;
  destination: Destination | null;
  onComplete: () => void;
};

export default function ActiveRide({ pool, destination, onComplete }: ActiveRideProps) {
  const [progress, setProgress] = useState(30);
  const [eta, setEta] = useState(18);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => onComplete(), 1000);
          return 100;
        }
        return next;
      });
      setEta((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [onComplete]);

  if (!pool || !destination) return null;

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Map View */}
      <div className="flex-1 bg-gradient-to-br from-gray-200 via-gray-100 to-blue-50 relative">
        {/* Simulated map */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-0 w-full h-1 bg-gray-400 rotate-12"></div>
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-400 -rotate-6"></div>
          <div className="absolute top-3/4 left-0 w-full h-1 bg-gray-400 rotate-3"></div>
        </div>

        {/* Route with multiple pins */}
        <div className="absolute inset-0">
          {/* Car position (moving) */}
          <motion.div
            animate={{
              x: [50, 200, 300],
              y: [100, 200, 300],
            }}
            transition={{
              duration: 15,
              ease: "linear",
            }}
            className="absolute top-1/4 left-1/4"
          >
            <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg">
              <Navigation2 className="w-6 h-6" />
            </div>
          </motion.div>

          {/* Drop-off points */}
          <div className="absolute top-1/3 right-1/3">
            <div className="bg-gray-400 p-2 rounded-full">
              <MapPin className="w-5 h-5 text-white fill-white" />
            </div>
            <p className="text-xs mt-1 bg-white px-2 py-1 rounded shadow text-center">Stop 1</p>
          </div>

          <div className="absolute bottom-1/3 right-1/4">
            <div className="bg-red-600 p-2 rounded-full shadow-lg">
              <MapPin className="w-6 h-6 text-white fill-white" />
            </div>
            <p className="text-xs mt-1 bg-white px-2 py-1 rounded shadow text-center">Your Stop</p>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="bg-white rounded-t-3xl shadow-2xl">
        <div className="p-6 space-y-5">
          {/* Driver Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
                  {pool.photo}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{pool.driverName}</p>
                <p className="text-sm text-gray-500">{pool.carModel}</p>
              </div>
            </div>
          </div>

          {/* ETA */}
          <div className="bg-blue-50 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Your ETA</p>
                <p className="text-xl">{eta} min</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Destination</p>
              <p className="text-sm">{destination.name}</p>
            </div>
          </div>

          {/* Trip Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Trip Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Picked Up</span>
              <span>Drop Off 1</span>
              <span>Your Drop Off</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-12 gap-2 active:scale-95 transition-transform">
              <Shield className="w-5 h-5" />
              Safety Shield
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 active:scale-95 transition-transform">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 active:scale-95 transition-transform">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}