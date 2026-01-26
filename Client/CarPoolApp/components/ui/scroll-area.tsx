import * as React from "react";
import { ScrollView } from "react-native-web";

import { cn } from "./utils";

type ScrollAreaProps = {
  className?: string;
  children: React.ReactNode;
  horizontal?: boolean;
};

function ScrollArea({
  className,
  children,
  horizontal = false,
}: ScrollAreaProps) {
  return (
    <ScrollView
      className={cn("relative", className)}
      horizontal={horizontal}
    >
      {children}
    </ScrollView>
  );
}

function ScrollBar({ className }: { className?: string }) {
  // ScrollBar is not needed for React Native ScrollView
  return null;
}

export { ScrollArea, ScrollBar };
