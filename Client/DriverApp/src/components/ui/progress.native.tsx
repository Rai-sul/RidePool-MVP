import * as React from "react";
import { View } from "react-native";
import { cn } from "./utils";

interface ProgressProps {
  className?: string;
  value?: number;
}

function Progress({ className, value = 0, ...props }: ProgressProps) {
  return (
    <View
      className={cn("bg-primary/20 h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <View
        className="bg-primary h-full"
        style={{ width: `${value}%` }}
      />
    </View>
  );
}

export { Progress };
