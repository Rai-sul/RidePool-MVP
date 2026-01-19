import * as React from "react";
import { View } from "react-native-web";

import { cn } from "./utils";

type SeparatorProps = {
  className?: string;
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
};

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
}: SeparatorProps) {
  return (
    <View
      className={cn(
        "bg-border shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}

export { Separator };
