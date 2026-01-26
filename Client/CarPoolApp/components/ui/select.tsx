import * as React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native-web";
import {
  CheckIcon,
  ChevronDownIcon,
} from "lucide-react@0.487.0";

import { cn } from "./utils";

type SelectContextProps = {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  placeholder?: string;
};

const SelectContext = React.createContext<SelectContextProps | null>(null);

type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function Select({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  
  const value = controlledValue ?? internalValue;
  const open = controlledOpen ?? internalOpen;

  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      <View className="relative">
        {children}
      </View>
    </SelectContext.Provider>
  );
}

type SelectGroupProps = {
  children: React.ReactNode;
  className?: string;
};

function SelectGroup({
  children,
  className,
}: SelectGroupProps) {
  return (
    <View className={className}>
      {children}
    </View>
  );
}

type SelectValueProps = {
  placeholder?: string;
  className?: string;
};

function SelectValue({
  placeholder = "Select...",
  className,
}: SelectValueProps) {
  const context = React.useContext(SelectContext);
  
  if (!context) {
    throw new Error("SelectValue must be used within Select");
  }

  return (
    <Text className={cn(className, !context.value && "text-muted-foreground")}>
      {context.value || placeholder}
    </Text>
  );
}

type SelectTriggerProps = {
  className?: string;
  size?: "sm" | "default";
  disabled?: boolean;
  children: React.ReactNode;
};

function SelectTrigger({
  className,
  size = "default",
  disabled = false,
  children,
}: SelectTriggerProps) {
  const context = React.useContext(SelectContext);
  
  if (!context) {
    throw new Error("SelectTrigger must be used within Select");
  }

  return (
    <TouchableOpacity
      onPress={() => !disabled && context.setOpen(!context.open)}
      disabled={disabled}
      className={cn(
        "border-input flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50",
        size === "default" && "h-9",
        size === "sm" && "h-8",
        className,
      )}
    >
      {children}
      <ChevronDownIcon className="text-muted-foreground size-4 opacity-50" />
    </TouchableOpacity>
  );
}

type SelectContentProps = {
  className?: string;
  position?: "popper" | "item-aligned";
  children: React.ReactNode;
};

function SelectContent({
  className,
  position = "popper",
  children,
}: SelectContentProps) {
  const context = React.useContext(SelectContext);
  
  if (!context) {
    throw new Error("SelectContent must be used within Select");
  }

  if (!context.open) {
    return null;
  }

  return (
    <View
      className={cn(
        "bg-popover text-popover-foreground absolute z-50 min-w-[8rem] overflow-hidden rounded-md border shadow-md top-full mt-1 left-0 right-0",
        className,
      )}
    >
      <ScrollView className="max-h-[300px] p-1">
        {children}
      </ScrollView>
    </View>
  );
}

type SelectLabelProps = {
  className?: string;
  children: React.ReactNode;
};

function SelectLabel({
  className,
  children,
}: SelectLabelProps) {
  return (
    <Text className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}>
      {children}
    </Text>
  );
}

type SelectItemProps = {
  className?: string;
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
};

function SelectItem({
  className,
  value,
  disabled = false,
  children,
}: SelectItemProps) {
  const context = React.useContext(SelectContext);
  
  if (!context) {
    throw new Error("SelectItem must be used within Select");
  }

  const isSelected = context.value === value;

  return (
    <TouchableOpacity
      onPress={() => !disabled && context.onValueChange(value)}
      disabled={disabled}
      className={cn(
        "relative flex w-full items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-accent text-accent-foreground",
        className,
      )}
    >
      <Text className="flex-1">{children}</Text>
      {isSelected && (
        <View className="absolute right-2 flex size-3.5 items-center justify-center">
          <CheckIcon className="size-4" />
        </View>
      )}
    </TouchableOpacity>
  );
}

type SelectSeparatorProps = {
  className?: string;
};

function SelectSeparator({
  className,
}: SelectSeparatorProps) {
  return (
    <View className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)} />
  );
}

function SelectScrollUpButton() {
  return null;
}

function SelectScrollDownButton() {
  return null;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
