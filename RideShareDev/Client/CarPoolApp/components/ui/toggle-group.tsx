import * as React from "react";
import { View, TouchableOpacity } from "react-native-web";
import { type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";
import { toggleVariants } from "./toggle";

const ToggleGroupContext = React.createContext<{
  variant?: VariantProps<typeof toggleVariants>['variant'];
  size?: VariantProps<typeof toggleVariants>['size'];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  type?: 'single' | 'multiple';
}>({
  size: "default",
  variant: "default",
  type: "single",
});

type ToggleGroupProps = {
  className?: string;
  variant?: VariantProps<typeof toggleVariants>['variant'];
  size?: VariantProps<typeof toggleVariants>['size'];
  type?: 'single' | 'multiple';
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children: React.ReactNode;
};

function ToggleGroup({
  className,
  variant = "default",
  size = "default",
  type = "single",
  value,
  onValueChange,
  children,
}: ToggleGroupProps) {
  return (
    <ToggleGroupContext.Provider value={{ variant, size, value, onValueChange, type }}>
      <View
        className={cn(
          "group/toggle-group flex w-fit items-center rounded-md",
          variant === "outline" && "shadow-xs",
          className,
        )}
      >
        {children}
      </View>
    </ToggleGroupContext.Provider>
  );
}

type ToggleGroupItemProps = {
  className?: string;
  value: string;
  variant?: VariantProps<typeof toggleVariants>['variant'];
  size?: VariantProps<typeof toggleVariants>['size'];
  disabled?: boolean;
  children: React.ReactNode;
};

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  value: itemValue,
  disabled = false,
}: ToggleGroupItemProps) {
  const context = React.useContext(ToggleGroupContext);
  const effectiveVariant = context.variant || variant;
  const effectiveSize = context.size || size;
  
  const isPressed = React.useMemo(() => {
    if (!context.value) return false;
    if (Array.isArray(context.value)) {
      return context.value.includes(itemValue);
    }
    return context.value === itemValue;
  }, [context.value, itemValue]);

  const handlePress = () => {
    if (disabled) return;
    
    if (context.type === 'multiple') {
      const currentValue = Array.isArray(context.value) ? context.value : [];
      if (currentValue.includes(itemValue)) {
        context.onValueChange?.(currentValue.filter(v => v !== itemValue));
      } else {
        context.onValueChange?.([...currentValue, itemValue]);
      }
    } else {
      context.onValueChange?.(itemValue);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      className={cn(
        toggleVariants({
          variant: effectiveVariant,
          size: effectiveSize,
        }),
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10",
        effectiveVariant === "outline" && "border-l-0 first:border-l",
        isPressed && "bg-accent text-accent-foreground",
        className,
      )}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}

export { ToggleGroup, ToggleGroupItem };
