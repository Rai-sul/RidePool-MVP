import { motion } from 'motion/react';
import { MapPin, Users } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';

type SearchingDriverProps = {
  onCancel: () => void;
};

const statusMessages = [
  'Finding your driver...',
  'Matching you with co-riders...',
  'Almost there...',
];

export default function SearchingDriver({ onCancel }: SearchingDriverProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-white flex flex-col items-center justify-center p-8">
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {/* Animated Map Pin */}
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 -m-8 bg-blue-500 rounded-full blur-2xl"
          />
          
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative z-10"
          >
            <MapPin className="w-24 h-24 text-blue-600 fill-blue-600" />
          </motion.div>

          {/* Connecting lines animation */}
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0 -m-12"
          >
            <Users className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 text-blue-400" />
            <Users className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 text-blue-400" />
            <Users className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 text-blue-400" />
            <Users className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 text-blue-400" />
          </motion.div>
        </div>

        {/* Status Message */}
        <motion.div
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center space-y-2"
        >
          <h2 className="text-2xl">{statusMessages[messageIndex]}</h2>
          <p className="text-gray-500">This usually takes a few seconds</p>
        </motion.div>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-3 h-3 bg-blue-600 rounded-full"
            />
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        onClick={onCancel}
        className="w-full h-14 border-2 border-red-500 text-red-500 hover:bg-red-50 active:scale-[0.98] transition-transform"
      >
        Cancel Ride
      </Button>
    </div>
  );
}