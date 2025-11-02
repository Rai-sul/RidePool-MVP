import * as React from "react";
import { TouchableOpacity, View } from "react-native-web";
import { CheckIcon } from "lucide-react@0.487.0";

import { cn } from "./utils";

type CheckboxProps = {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
};

function Checkbox({
  className,
  checked = false,
  onCheckedChange,
  disabled = false,
}: CheckboxProps) {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onCheckedChange?.(!checked)}
      disabled={disabled}
      className={cn(
        "peer border bg-input-background dark:bg-input/30 size-4 shrink-0 rounded-[4px] border shadow-xs outline-none disabled:cursor-not-allowed disabled:opacity-50",
        checked && "bg-primary text-primary-foreground border-primary",
        className,
      )}
      activeOpacity={0.7}
    >
      {checked && (
        <View className="flex items-center justify-center text-current">
          <CheckIcon className="size-3.5" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export { Checkbox };
