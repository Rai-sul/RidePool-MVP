import * as React from "react";
import { View, TouchableOpacity } from "react-native";

import { cn } from "./utils";

type SwitchProps = {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
};

function Switch({
  className,
  checked = false,
  onCheckedChange,
  disabled = false,
}: SwitchProps) {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onCheckedChange?.(!checked)}
      disabled={disabled}
      className={cn(
        "inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none",
        checked ? "bg-primary" : "bg-switch-background",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      activeOpacity={0.7}
    >
      <View
        className={cn(
          "bg-card pointer-events-none block size-4 rounded-full ring-0 transition-transform",
          checked ? "translate-x-[calc(100%-2px)]" : "translate-x-0",
        )}
      />
    </TouchableOpacity>
  );
}

export { Switch };
