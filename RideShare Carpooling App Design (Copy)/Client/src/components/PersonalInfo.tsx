import { ArrowLeft, User, Mail, Phone, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import type { UserProfile } from '../App';

type PersonalInfoProps = {
  userProfile: UserProfile | null;
  onBack: () => void;
};

export default function PersonalInfo({ userProfile, onBack }: PersonalInfoProps) {
  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Personal Info</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 border-b">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">First Name</p>
                <p>{userProfile?.firstName || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border-b">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Last Name</p>
                <p>{userProfile?.lastName || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border-b">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Email</p>
                <p>{userProfile?.email || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border-b">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Phone Number</p>
                <p>+880 1712-345678</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Date of Birth</p>
                <p>January 15, 1995</p>
              </div>
            </div>
          </div>
        </div>

        <Button className="w-full">Edit Personal Info</Button>
      </div>
    </div>
  );
}
