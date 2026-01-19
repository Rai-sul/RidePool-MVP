import * as React from "react";
import { View, Platform } from "react-native";

import { cn } from "./utils";

type ProgressProps = {
  className?: string;
  value?: number;
};

function Progress({
  className,
  value = 0,
}: ProgressProps) {
  return (
    <View
      className={cn(
        "bg-gray-200 relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
    >
      <View
        className="bg-blue-600 h-full"
        style={{ width: `${value}%` }}
      />
    </View>
  );
}

export { Progress };
