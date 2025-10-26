import { useState } from 'react';
import { Calendar, MapPin, ChevronRight, AlertCircle, X, User, Phone, Car, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { UserProfile } from '../App';

const pastTrips = [
  {
    id: '1',
    date: 'Oct 23, 2025',
    time: '2:45 PM',
    from: 'Current Location',
    fromAddress: 'House 45, Road 12, Gulshan 1, Dhaka',
    to: 'Airport',
    toAddress: 'Hazrat Shahjalal International Airport, Dhaka',
    driver: 'Raisul',
    driverPhone: '+880 1711-123456',
    carModel: 'Toyota Corolla',
    licensePlate: 'Dhaka Metro Ka 12-3456',
    amount: 185,
    distance: '12.5 km',
    duration: '25 min',
    status: 'completed',
  },
  {
    id: '2',
    date: 'Oct 22, 2025',
    time: '8:30 AM',
    from: 'Home',
    fromAddress: 'House 23, Road 8, Dhanmondi, Dhaka',
    to: 'Work',
    toAddress: 'Gulshan Avenue, Gulshan 2, Dhaka',
    driver: 'Fatima',
    driverPhone: '+880 1712-234567',
    carModel: 'Honda Civic',
    licensePlate: 'Dhaka Metro Ga 45-6789',
    amount: 120,
    distance: '8.2 km',
    duration: '18 min',
    status: 'completed',
  },
  {
    id: '3',
    date: 'Oct 21, 2025',
    time: '6:15 PM',
    from: 'Gym',
    fromAddress: 'Fitness Zone, Banani, Dhaka',
    to: 'Home',
    toAddress: 'House 23, Road 8, Dhanmondi, Dhaka',
    driver: 'Ahmed',
    driverPhone: '+880 1713-345678',
    carModel: 'Toyota Axio',
    licensePlate: 'Dhaka Metro Kha 78-9012',
    amount: 95,
    distance: '5.8 km',
    duration: '15 min',
    status: 'completed',
  },
  {
    id: '4',
    date: 'Oct 20, 2025',
    time: '9:00 AM',
    from: 'Home',
    fromAddress: 'House 23, Road 8, Dhanmondi, Dhaka',
    to: 'Airport',
    toAddress: 'Hazrat Shahjalal International Airport, Dhaka',
    driver: 'Raisul',
    driverPhone: '+880 1711-123456',
    carModel: 'Toyota Corolla',
    licensePlate: 'Dhaka Metro Ka 12-3456',
    amount: 210,
    distance: '14.3 km',
    duration: '28 min',
    status: 'completed',
  },
];

interface TripsScreenProps {
  userProfile: UserProfile | null;
  onBookRide?: () => void;
}

export default function TripsScreen({ userProfile, onBookRide }: TripsScreenProps) {
  const [selectedTrip, setSelectedTrip] = useState<typeof pastTrips[0] | null>(null);
  const isFemale = userProfile?.gender === 'female';

  return (
    <div className="h-full w-full bg-white flex flex-col pb-20">
      <div className="p-6 border-b">
        <h1 className="text-2xl">Your Trips</h1>
      </div>

      <Tabs defaultValue="past" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b h-12">
          <TabsTrigger value="past" className="flex-1">Past Trips</TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="past" className="flex-1 overflow-y-auto mt-0">
          <div className="divide-y">
            {pastTrips.map((trip) => (
              <div 
                key={trip.id} 
                className="p-5 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedTrip(trip)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{trip.date}</span>
                      <span>•</span>
                      <span>{trip.time}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500">Pickup</p>
                          <p>{trip.from}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-600 fill-red-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-500">Drop-off</p>
                          <p>{trip.to}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">Driver: {trip.driver}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>{trip.amount} taka</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-8" />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="flex-1 overflow-y-auto mt-0">
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl mb-2">No upcoming trips</h3>
            <p className="text-gray-500 mb-6">Book a ride to get started</p>
            <Button 
              className={isFemale 
                ? 'bg-pink-500 hover:bg-pink-600' 
                : 'bg-blue-600 hover:bg-blue-700'
              }
              onClick={onBookRide}
            >
              Book a Ride
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Report Issue Button */}
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full gap-2">
          <AlertCircle className="w-4 h-4" />
          Report an Issue
        </Button>
      </div>

      {/* Trip Details Dialog */}
      <Dialog open={selectedTrip !== null} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="w-[90%] max-w-md rounded-2xl p-0 gap-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-start justify-between">
              <DialogTitle className="text-xl">Trip Details</DialogTitle>
              <button 
                onClick={() => setSelectedTrip(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </DialogHeader>

          {selectedTrip && (
            <div className="px-6 pb-6 space-y-5">
              {/* Date and Time */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{selectedTrip.date}</span>
                <span>•</span>
                <span>{selectedTrip.time}</span>
              </div>

              {/* Trip Route */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Pickup Location</p>
                    <p className="text-sm">{selectedTrip.fromAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-red-600 fill-red-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Drop-off Location</p>
                    <p className="text-sm">{selectedTrip.toAddress}</p>
                  </div>
                </div>
              </div>

              {/* Trip Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">Distance</span>
                  </div>
                  <p className="text-sm">{selectedTrip.distance}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Duration</span>
                  </div>
                  <p className="text-sm">{selectedTrip.duration}</p>
                </div>
              </div>

              {/* Driver Info */}
              <div className="border-t pt-4">
                <h4 className="text-sm text-gray-500 mb-3">Driver Details</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p>{selectedTrip.driver}</p>
                      <p className="text-sm text-gray-500">{selectedTrip.driverPhone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm">{selectedTrip.carModel}</p>
                      <p className="text-xs text-gray-500">{selectedTrip.licensePlate}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Fare</span>
                  <span className="text-2xl">{selectedTrip.amount} ৳</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">Paid via RideShare Wallet</p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" className="w-full">
                  Get Receipt
                </Button>
                <Button 
                  className={isFemale 
                    ? 'bg-pink-500 hover:bg-pink-600' 
                    : 'bg-blue-600 hover:bg-blue-700'
                  }
                >
                  Rebook
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
