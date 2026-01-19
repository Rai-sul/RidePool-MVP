import React from 'react';
import { View, Text } from 'react-native-web';

type AvatarProps = {
  children: React.ReactNode;
  className?: string;
};

export function Avatar({ children, className = '' }: AvatarProps) {
  return (
    <View className={`rounded-full overflow-hidden ${className}`}>
      {children}
    </View>
  );
}

type AvatarFallbackProps = {
  children: React.ReactNode;
  className?: string;
};

export function AvatarFallback({ children, className = '' }: AvatarFallbackProps) {
  return (
    <View className={`w-full h-full items-center justify-center ${className}`}>
      <Text className="text-white font-semibold">{children}</Text>
    </View>
  );
}
