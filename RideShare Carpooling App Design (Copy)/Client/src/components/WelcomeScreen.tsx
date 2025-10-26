import { Car } from 'lucide-react';
import { Button } from './ui/button';

type WelcomeScreenProps = {
  onSignUp: () => void;
};

export default function WelcomeScreen({ onSignUp }: WelcomeScreenProps) {
  return (
    <div className="h-full w-full bg-gradient-to-br from-purple-600 via-purple-500 to-violet-400 flex flex-col items-center justify-between p-8 text-white">
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="bg-white/20 backdrop-blur-lg rounded-full p-8">
          <Car className="w-24 h-24" strokeWidth={1.5} />
        </div>
        
        <div className="text-center space-y-3">
          <h1 className="text-4xl">RideShare</h1>
          <p className="text-xl opacity-90">Share the Road, Share the Cost.</p>
        </div>
      </div>

      <div className="w-full space-y-3">
        <Button 
          onClick={onSignUp}
          className="w-full h-14 bg-white text-purple-600 hover:bg-gray-100 active:scale-[0.98] transition-transform"
        >
          Sign Up
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full h-14 bg-transparent border-2 border-white text-white hover:bg-white/10 active:scale-[0.98] transition-transform"
        >
          Log In
        </Button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/30"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-transparent px-4 opacity-70">or</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full h-12 bg-white/10 backdrop-blur border border-white/30 text-white hover:bg-white/20 active:scale-[0.98] transition-transform"
          >
            Continue with Google
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12 bg-white/10 backdrop-blur border border-white/30 text-white hover:bg-white/20 active:scale-[0.98] transition-transform"
          >
            Continue with Apple
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12 bg-white/10 backdrop-blur border border-white/30 text-white hover:bg-white/20 active:scale-[0.98] transition-transform"
          >
            Continue with Facebook
          </Button>

          <Button 
            variant="ghost" 
            className="w-full h-12 text-white hover:bg-white/10 active:scale-[0.98] transition-transform"
          >
            Sign up with phone number
          </Button>
        </div>
      </div>
    </div>
  );
}