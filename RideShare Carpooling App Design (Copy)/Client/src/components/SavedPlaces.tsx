import { ArrowLeft, Home, Briefcase, Heart, MapPin, Plus } from 'lucide-react';
import { Button } from './ui/button';

type SavedPlacesProps = {
  onBack: () => void;
};

const savedPlaces = [
  {
    id: '1',
    icon: Home,
    label: 'Home',
    address: 'House 12, Road 5, Dhanmondi, Dhaka',
  },
  {
    id: '2',
    icon: Briefcase,
    label: 'Work',
    address: 'Level 10, Navana Tower, Gulshan 1, Dhaka',
  },
  {
    id: '3',
    icon: Heart,
    label: 'Favorite Spot',
    address: 'Cafe Mango, Banani 11, Dhaka',
  },
];

export default function SavedPlaces({ onBack }: SavedPlacesProps) {
  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Saved Places</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="bg-white rounded-2xl p-5 space-y-3">
          {savedPlaces.map((place) => {
            const Icon = place.icon;
            return (
              <div
                key={place.id}
                className="flex items-start gap-3 p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer rounded-lg"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p>{place.label}</p>
                  <p className="text-sm text-gray-500">{place.address}</p>
                </div>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
            );
          })}
        </div>

        <Button className="w-full" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add New Place
        </Button>
      </div>
    </div>
  );
}
