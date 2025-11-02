import * as React from "react";
import { TouchableOpacity, View } from "react-native-web";
import { CircleIcon } from "lucide-react@0.487.0";

import { cn } from "./utils";

type RadioGroupProps = {
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
};

const RadioGroupContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

function RadioGroup({
  className,
  value,
  onValueChange,
  children,
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <View className={cn("grid gap-3", className)}>
        {children}
      </View>
    </RadioGroupContext.Provider>
  );
}

type RadioGroupItemProps = {
  className?: string;
  value: string;
  disabled?: boolean;
};

function RadioGroupItem({
  className,
  value,
  disabled = false,
}: RadioGroupItemProps) {
  const { value: selectedValue, onValueChange } = React.useContext(RadioGroupContext);
  const isSelected = selectedValue === value;

  return (
    <TouchableOpacity
      onPress={() => !disabled && onValueChange?.(value)}
      disabled={disabled}
      className={cn(
        "border-input text-primary dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      activeOpacity={0.7}
    >
      {isSelected && (
        <View className="relative flex items-center justify-center">
          <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export { RadioGroup, RadioGroupItem };
