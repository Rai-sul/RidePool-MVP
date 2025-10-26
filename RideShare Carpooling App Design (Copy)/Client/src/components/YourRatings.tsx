import { ArrowLeft, Star, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';

type YourRatingsProps = {
  onBack: () => void;
};

const ratings = [
  { period: 'Overall', rating: 4.8, total: 47 },
  { period: 'Last 30 days', rating: 4.9, total: 12 },
  { period: 'Last 7 days', rating: 5.0, total: 3 },
];

const recentFeedback = [
  { id: '1', rider: 'Ahmed K.', rating: 5, comment: 'Great co-rider! Very friendly and punctual.', date: 'Oct 23, 2025' },
  { id: '2', rider: 'Sarah M.', rating: 5, comment: 'Pleasant journey, respectful and quiet.', date: 'Oct 22, 2025' },
  { id: '3', rider: 'Karim R.', rating: 4, comment: 'Good experience overall.', date: 'Oct 21, 2025' },
];

export default function YourRatings({ onBack }: YourRatingsProps) {
  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Your Ratings</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Rating Cards */}
        <div className="grid grid-cols-3 gap-3">
          {ratings.map((item) => (
            <div key={item.period} className="bg-white rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl">{item.rating}</span>
              </div>
              <p className="text-xs text-gray-500">{item.period}</p>
              <p className="text-xs text-gray-400">{item.total} trips</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5" />
            <h3>Performance</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl">96%</p>
              <p className="text-sm text-blue-100">Acceptance Rate</p>
            </div>
            <div>
              <p className="text-2xl">98%</p>
              <p className="text-sm text-blue-100">On-Time Rate</p>
            </div>
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h3>Recent Feedback</h3>
          <div className="space-y-3">
            {recentFeedback.map((feedback) => (
              <div key={feedback.id} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p>{feedback.rider}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: feedback.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">"{feedback.comment}"</p>
                <p className="text-xs text-gray-400">{feedback.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
