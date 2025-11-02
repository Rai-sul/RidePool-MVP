import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

type ButtonProps = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  textClassName?: string; // New prop for text styling
  disabled?: boolean;
  loading?: boolean;
};

export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  className = '',
  textClassName = '', // Initialize new prop
  disabled = false,
  loading = false
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return 'border-2 border-gray-300 bg-transparent';
      case 'ghost':
        return 'bg-transparent';
      case 'destructive':
        return 'bg-red-600';
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

  const renderChildren = () => {
    if (loading) {
      return <ActivityIndicator color={variant === 'default' ? '#ffffff' : '#000000'} />;
    }

    return React.Children.map(children, (child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return (
          <Text className={`font-medium ${getTextVariantStyles()} ${textClassName}`}>
            {child}
          </Text>
        );
      }
      return child;
    });
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
      {renderChildren()}
    </TouchableOpacity>
  );
}