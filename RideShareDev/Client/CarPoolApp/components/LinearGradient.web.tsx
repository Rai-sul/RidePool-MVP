import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native-web';

type LinearGradientProps = ViewProps & {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  children?: React.ReactNode;
};

export default function LinearGradient({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
  style,
  children,
  ...props
}: LinearGradientProps) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) + 90;
  const gradient = `linear-gradient(${angle}deg, ${colors.join(', ')})`;

  return (
    <View
      {...props}
      // @ts-ignore - web specific style
      style={[
        style,
        {
          backgroundImage: gradient,
        },
      ]}
    >
      {children}
    </View>
  );
}
