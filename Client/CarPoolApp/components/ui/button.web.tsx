import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native-web';

type ButtonProps = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ 
  children, 
  onPress, 
  variant = 'default', 
  size = 'default',
  className = '',
  disabled = false,
  loading = false 
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return 'border-2 border-gray-300 bg-transparent';
      case 'ghost':
        return 'bg-transparent';
      default:
        return 'bg-blue-600';
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return 'text-gray-900';
      default:
        return 'text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-9 px-3';
      case 'lg':
        return 'h-12 px-8';
      case 'icon':
        return 'h-10 w-10';
      default:
        return 'h-11 px-4';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex items-center justify-center rounded-lg ${getVariantStyles()} ${getSizeStyles()} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'default' ? '#ffffff' : '#000000'} />
      ) : (
        typeof children === 'string' ? (
          <Text className={`font-medium ${getTextVariantStyles()}`}>
            {children}
          </Text>
        ) : (
          children
        )
      )}
    </TouchableOpacity>
  );
}
