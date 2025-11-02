import * as React from "react";
import { View, TextInput, Text } from "react-native-web";
import { MinusIcon } from "lucide-react@0.487.0";

import { cn } from "./utils";

type InputOTPContextProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  activeIndex: number;
};

const InputOTPContext = React.createContext<InputOTPContextProps | null>(null);

type InputOTPProps = {
  className?: string;
  containerClassName?: string;
  maxLength: number;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
};

function InputOTP({
  className,
  containerClassName,
  maxLength,
  value = "",
  onChange,
  disabled = false,
  children,
}: InputOTPProps) {
  const [internalValue, setInternalValue] = React.useState(value);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const currentValue = value ?? internalValue;

  const handleChange = (newValue: string) => {
    const sanitized = newValue.replace(/[^0-9]/g, '').slice(0, maxLength);
    setInternalValue(sanitized);
    onChange?.(sanitized);
    setActiveIndex(Math.min(sanitized.length, maxLength - 1));
  };

  return (
    <InputOTPContext.Provider value={{ value: currentValue, onChange: handleChange, maxLength, activeIndex }}>
      <View
        className={cn(
          "flex items-center gap-2",
          disabled && "opacity-50",
          containerClassName,
        )}
      >
        <TextInput
          className={cn("absolute opacity-0 w-0 h-0", className)}
          value={currentValue}
          onChangeText={handleChange}
          maxLength={maxLength}
          keyboardType="number-pad"
          editable={!disabled}
        />
        {children}
      </View>
    </InputOTPContext.Provider>
  );
}

function InputOTPGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View className={cn("flex items-center gap-1", className)}>
      {children}
    </View>
  );
}

type InputOTPSlotProps = {
  index: number;
  className?: string;
};

function InputOTPSlot({
  index,
  className,
}: InputOTPSlotProps) {
  const context = React.useContext(InputOTPContext);
  
  if (!context) {
    throw new Error("InputOTPSlot must be used within InputOTP");
  }

  const char = context.value[index] || "";
  const isActive = context.activeIndex === index;

  return (
    <View
      className={cn(
        "border-input dark:bg-input/30 relative flex h-9 w-9 items-center justify-center border-y border-r text-sm bg-input-background transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "border-ring ring-ring/50 z-10 ring-[3px]",
        className,
      )}
    >
      <Text>{char}</Text>
      {isActive && !char && (
        <View className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <View className="animate-caret-blink bg-foreground h-4 w-px" />
        </View>
      )}
    </View>
  );
}

function InputOTPSeparator({ className }: { className?: string }) {
  return (
    <View className={className}>
      <MinusIcon />
    </View>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
