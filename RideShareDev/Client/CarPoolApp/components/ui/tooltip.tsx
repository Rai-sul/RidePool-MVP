import * as React from "react";
import { View, Text } from "react-native-web";

import { cn } from "./utils";

type TooltipContextProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const TooltipContext = React.createContext<TooltipContextProps | null>(null);

type TooltipProviderProps = {
  delayDuration?: number;
  children: React.ReactNode;
};

function TooltipProvider({
  delayDuration = 0,
  children,
}: TooltipProviderProps) {
  return <>{children}</>;
}

type TooltipProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function Tooltip({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: TooltipProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <View className="relative inline-flex">
        {children}
      </View>
    </TooltipContext.Provider>
  );
}

type TooltipTriggerProps = {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
};

function TooltipTrigger({
  children,
  className,
  asChild = false,
}: TooltipTriggerProps) {
  const context = React.useContext(TooltipContext);
  
  if (!context) {
    throw new Error("TooltipTrigger must be used within Tooltip");
  }

  const handleMouseEnter = () => context.setOpen(true);
  const handleMouseLeave = () => context.setOpen(false);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    });
  }

  return (
    <View
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </View>
  );
}

type TooltipContentProps = {
  className?: string;
  sideOffset?: number;
  children: React.ReactNode;
};

function TooltipContent({
  className,
  sideOffset = 0,
  children,
}: TooltipContentProps) {
  const context = React.useContext(TooltipContext);
  
  if (!context) {
    throw new Error("TooltipContent must be used within Tooltip");
  }

  if (!context.open) {
    return null;
  }

  return (
    <View
      className={cn(
        "bg-primary text-primary-foreground z-50 w-fit absolute bottom-full left-1/2 -translate-x-1/2 rounded-md px-3 py-1.5 text-xs",
        className,
      )}
      style={{ marginBottom: sideOffset }}
    >
      <Text className="text-primary-foreground text-xs">{children}</Text>
    </View>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
