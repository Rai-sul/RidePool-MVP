import React from 'react';
import { Text } from 'react-native';

type LabelProps = {
  children: React.ReactNode;
  className?: string;
};

export function Label({ children, className = '' }: LabelProps) {
  return (
    <Text className={`text-sm font-medium text-gray-700 mb-1 ${className}`}>
      {children}
    </Text>
  );
}
