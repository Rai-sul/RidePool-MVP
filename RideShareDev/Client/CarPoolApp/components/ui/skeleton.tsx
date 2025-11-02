import * as React from "react";
import { View } from "react-native-web";
import { cn } from "./utils";

function Skeleton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <View
      className={cn("bg-accent animate-pulse rounded-md", className)}
    >
      {children}
    </View>
  );
}

export { Skeleton };
