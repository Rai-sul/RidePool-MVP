import * as React from "react";
import { View, TouchableOpacity } from "react-native-web";

type CollapsibleContextProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CollapsibleContext = React.createContext<CollapsibleContextProps | null>(null);

type CollapsibleProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

function Collapsible({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
  className,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <View className={className}>
        {children}
      </View>
    </CollapsibleContext.Provider>
  );
}

type CollapsibleTriggerProps = {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
};

function CollapsibleTrigger({
  children,
  className,
  asChild = false,
}: CollapsibleTriggerProps) {
  const context = React.useContext(CollapsibleContext);
  
  if (!context) {
    throw new Error("CollapsibleTrigger must be used within a Collapsible");
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

type CollapsibleContentProps = {
  children: React.ReactNode;
  className?: string;
};

function CollapsibleContent({
  children,
  className,
}: CollapsibleContentProps) {
  const context = React.useContext(CollapsibleContext);
  
  if (!context) {
    throw new Error("CollapsibleContent must be used within a Collapsible");
  }

  if (!context.open) {
    return null;
  }

  return (
    <View className={className}>
      {children}
    </View>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
