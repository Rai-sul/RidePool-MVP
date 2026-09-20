import React from 'react';
import { View } from 'react-native';
import { cn } from './utils';

type SeparatorProps = {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

export function Separator({ orientation = 'horizontal', className }: SeparatorProps) {
  return (
    <View
      className={cn(
        'bg-gray-200',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
    />
  );
}
