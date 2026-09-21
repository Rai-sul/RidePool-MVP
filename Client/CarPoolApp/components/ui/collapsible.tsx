import * as React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

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
  /** Renders a built-in pressable header that toggles the section. */
  title?: React.ReactNode;
};

function Collapsible({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
  className,
  title,
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
        {title !== undefined && (
          <TouchableOpacity onPress={() => setOpen(!open)} activeOpacity={0.7}>
            {typeof title === 'string' || typeof title === 'number' ? (
              <Text className="font-semibold">{title}</Text>
            ) : (
              title
            )}
          </TouchableOpacity>
        )}
        {/* With a title the section owns its own open state; without one the
            caller supplies CollapsibleTrigger / CollapsibleContent. */}
        {title === undefined || open ? children : null}
      </View>
    </CollapsibleContext.Provider>
  );
}

type CollapsibleTriggerProps = {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
};

function CollapsibleTrigger({ children, className, asChild = false }: CollapsibleTriggerProps) {
  const context = React.useContext(CollapsibleContext);

  if (!context) {
    throw new Error('CollapsibleTrigger must be used within a Collapsible');
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onPress: () => context.setOpen(!context.open),
    });
  }

  return (
    <TouchableOpacity onPress={() => context.setOpen(!context.open)} className={className}>
      {children}
    </TouchableOpacity>
  );
}

type CollapsibleContentProps = {
  children: React.ReactNode;
  className?: string;
};

function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const context = React.useContext(CollapsibleContext);

  if (!context) {
    throw new Error('CollapsibleContent must be used within a Collapsible');
  }

  if (!context.open) {
    return null;
  }

  return <View className={className}>{children}</View>;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
