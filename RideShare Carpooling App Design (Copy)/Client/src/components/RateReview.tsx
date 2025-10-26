import { Star, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useState } from 'react';
import type { Pool, UserProfile } from '../App';

type RateReviewProps = {
  pool: Pool | null;
  userProfile: UserProfile | null;
  onComplete: () => void;
};

const tags = ['Safe Driver', 'Friendly', 'Smooth Ride', 'Clean Car', 'On Time', 'Great Music'];

export default function RateReview({ pool, userProfile, onComplete }: RateReviewProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const isFemale = userProfile?.gender === 'female';

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (!pool) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 animate-in fade-in slide-in-from-bottom-4">
      <div className="w-full bg-white rounded-t-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl">Rate Your Trip</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onComplete}
            className="rounded-full active:scale-95 transition-transform"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Driver Info */}
        <div className="flex flex-col items-center gap-3">
          <Avatar className="w-20 h-20 border-2 border-blue-200">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white text-2xl">
              {pool.photo}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-lg">How was your trip with {pool.driverName}?</h3>
            <p className="text-sm text-gray-500">{pool.carModel}</p>
          </div>
        </div>

        {/* Star Rating */}
        <div className="flex justify-center gap-3 py-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-12 h-12 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <p className="text-sm text-gray-600">What did you like?</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className={`cursor-pointer px-4 py-2 text-sm ${
                  selectedTags.includes(tag)
                    ? isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Additional Comments */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Additional comments (optional)</p>
          <textarea
            className="w-full p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Share more about your experience..."
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={onComplete}
          disabled={rating === 0}
          className={`w-full h-12 ${isFemale ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-300 active:scale-[0.98] transition-transform`}
        >
          Submit Rating
        </Button>
      </div>
    </div>
  );
}