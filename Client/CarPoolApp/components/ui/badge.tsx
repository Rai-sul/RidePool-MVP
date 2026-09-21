import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type BadgeProps = {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  textClassName?: string;
  onPress?: () => void;
};

// Follows the same shape as ./button: plain variant switches and NativeWind
// class names, rather than the web-only cva/react-native-web pairing this
// component was originally generated with.
export function Badge({
  children,
  variant = 'default',
  className = '',
  textClassName = '',
  onPress,
}: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-100 border-transparent';
      case 'destructive':
        return 'bg-red-600 border-transparent';
      case 'outline':
        return 'bg-transparent border border-gray-300';
      default:
        return 'bg-blue-600 border-transparent';
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'text-gray-900';
      case 'outline':
        return 'text-gray-900';
      default:
        return 'text-white';
    }
  };

  const renderChildren = () =>
    React.Children.map(children, (child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return (
          <Text className={`text-xs font-medium ${getTextVariantStyles()} ${textClassName}`}>
            {child}
          </Text>
        );
      }
      return child;
    });

  const content = (
    <View
      className={`flex flex-row items-center justify-center rounded-md px-2 py-0.5 ${getVariantStyles()} ${className}`}
    >
      {renderChildren()}
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

export default Badge;
