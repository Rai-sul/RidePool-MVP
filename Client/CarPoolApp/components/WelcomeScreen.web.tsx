import React from 'react';
import { View, Text } from 'react-native-web';
import LinearGradient from './LinearGradient';
import { Car } from './Icons';
import { Button } from './ui/button';

type WelcomeScreenProps = {
  onSignUp: () => void;
  onLogin?: () => void;
  onGoogleLogin?: () => void;
  onAppleLogin?: () => void;
  onFacebookLogin?: () => void;
};

export default function WelcomeScreen({ onSignUp, onLogin, onGoogleLogin, onAppleLogin, onFacebookLogin }: WelcomeScreenProps) {
  return (
    <LinearGradient
      colors={['#9333ea', '#a855f7', '#8b5cf6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1 p-8 justify-between"
    >
      <View className="flex-1 items-center justify-center gap-8">
        <View className="bg-white/20 rounded-full p-8">
          <Car color="#ffffff" size={96} strokeWidth={1.5} />
        </View>
        
        <View className="items-center gap-3">
          <Text className="text-4xl text-white font-bold">RideShare</Text>
          <Text className="text-xl text-white opacity-90">Share the Road, Share the Cost.</Text>
        </View>
      </View>

      <View className="gap-3">
        <Button 
          onPress={onSignUp}
          className="w-full h-14 bg-white"
        >
          <Text className="text-purple-600 font-semibold">Sign Up</Text>
        </Button>
        
        <Button 
          variant="outline"
          onPress={onLogin}
          className="w-full h-14 bg-transparent border-2 border-white"
        >
          <Text className="text-white font-semibold">Log In</Text>
        </Button>

        <View className="relative py-4">
          <View className="absolute inset-0 items-center justify-center">
            <View className="w-full border-t border-white/30" />
          </View>
          <View className="items-center">
            <Text className="bg-transparent px-4 opacity-70 text-white">or</Text>
          </View>
        </View>

        <View className="gap-3">
          <Button 
            variant="outline"
            onPress={onGoogleLogin}
            className="w-full h-12 bg-white/10 border border-white/30"
          >
            <Text className="text-white">Continue with Google</Text>
          </Button>
          
          <Button 
            variant="outline"
            onPress={onAppleLogin}
            className="w-full h-12 bg-white/10 border border-white/30"
          >
            <Text className="text-white">Continue with Apple</Text>
          </Button>
          
          <Button 
            variant="outline"
            onPress={onFacebookLogin}
            className="w-full h-12 bg-white/10 border border-white/30"
          >
            <Text className="text-white">Continue with Facebook</Text>
          </Button>

          <Button 
            variant="ghost"
            onPress={onSignUp}
            className="w-full h-12"
          >
            <Text className="text-white">Sign up with phone number</Text>
          </Button>
        </View>
      </View>
    </LinearGradient>
  );
}
