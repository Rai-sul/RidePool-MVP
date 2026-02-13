import * as React from "react";
import { View, TouchableOpacity } from "react-native-web";

import { cn } from "./utils";

type PopoverContextProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PopoverContext = React.createContext<PopoverContextProps | null>(null);

type PopoverProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function Popover({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <View className="relative inline-flex">
        {children}
      </View>
    </PopoverContext.Provider>
  );
}

type PopoverTriggerProps = {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
};

function PopoverTrigger({
  children,
  className,
  asChild = false,
}: PopoverTriggerProps) {
  const context = React.useContext(PopoverContext);
  
  if (!context) {
    throw new Error("PopoverTrigger must be used within Popover");
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onPress: () => context.setOpen(!context.open),
    });
  }

  return (
    <TouchableOpacity
      onPress={() => context.setOpen(!context.open)}
      className={className}
    >
      {children}
    </TouchableOpacity>
  );
}

type PopoverContentProps = {
  className?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  children: React.ReactNode;
};

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  children,
}: PopoverContentProps) {
  const context = React.useContext(PopoverContext);
  
  if (!context) {
    throw new Error("PopoverContent must be used within Popover");
  }

  if (!context.open) {
    return null;
  }

  return (
    <View
      className={cn(
        "bg-popover text-popover-foreground z-50 w-72 absolute top-full rounded-md border p-4 shadow-md",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        className,
      )}
      style={{ marginTop: sideOffset }}
    >
      {children}
    </View>
  );
}

type PopoverAnchorProps = {
  children: React.ReactNode;
  className?: string;
};

function PopoverAnchor({
  children,
  className,
}: PopoverAnchorProps) {
  return (
    <View className={className}>
      {children}
    </View>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
