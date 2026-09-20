import * as React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { cn } from "./utils";

export interface SeparatorProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
}

function Separator({ className, orientation = "horizontal", style, ...props }: SeparatorProps) {
  return (
    <View
      className={cn(
        "bg-gray-200",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      style={style}
      {...props}
    />
  );
}

export { Separator };
