import * as React from "react";
import { Text, StyleProp, TextStyle } from "react-native";
import { cn } from "./utils";

export interface LabelProps {
  className?: string;
  children?: React.ReactNode;
  htmlFor?: string;
  style?: StyleProp<TextStyle>;
}

function Label({ className, children, style, ...props }: LabelProps) {
  return (
    <Text
      className={cn(
        "text-sm font-medium",
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
}

export { Label };
