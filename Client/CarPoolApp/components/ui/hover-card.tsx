import * as React from "react";
import { View } from "react-native-web";

import { cn } from "./utils";

type HoverCardContextProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const HoverCardContext = React.createContext<HoverCardContextProps | null>(null);

type HoverCardProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function HoverCard({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: HoverCardProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <HoverCardContext.Provider value={{ open, setOpen }}>
      <View className="relative inline-flex">
        {children}
      </View>
    </HoverCardContext.Provider>
  );
}

type HoverCardTriggerProps = {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
};

function HoverCardTrigger({
  children,
  className,
  asChild = false,
}: HoverCardTriggerProps) {
  const context = React.useContext(HoverCardContext);
  
  if (!context) {
    throw new Error("HoverCardTrigger must be used within HoverCard");
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

type HoverCardContentProps = {
  className?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  children: React.ReactNode;
};

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  children,
}: HoverCardContentProps) {
  const context = React.useContext(HoverCardContext);
  
  if (!context) {
    throw new Error("HoverCardContent must be used within HoverCard");
  }

  if (!context.open) {
    return null;
  }

  return (
    <View
      className={cn(
        "bg-popover text-popover-foreground z-50 w-64 absolute top-full rounded-md border p-4 shadow-md",
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

export { HoverCard, HoverCardTrigger, HoverCardContent };
