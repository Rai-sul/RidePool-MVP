import * as React from "react";
import { Animated } from "react-native";
import { cn } from "./utils";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className, ...props }: SkeletonProps) {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className={cn("bg-gray-200 rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
