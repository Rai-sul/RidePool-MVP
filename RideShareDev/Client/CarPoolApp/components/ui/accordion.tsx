import * as React from "react";
import { View, TouchableOpacity } from "react-native-web";
import { ChevronDownIcon } from "lucide-react@0.487.0";

import { cn } from "./utils";

type AccordionContextProps = {
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  type: "single" | "multiple";
};

const AccordionContext = React.createContext<AccordionContextProps | null>(null);

type AccordionItemContextProps = {
  value: string;
  isOpen: boolean;
  toggle: () => void;
};

const AccordionItemContext = React.createContext<AccordionItemContextProps | null>(null);

type AccordionProps = {
  type: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  className?: string;
  children: React.ReactNode;
};

function Accordion({
  type,
  value: controlledValue,
  defaultValue = type === "multiple" ? [] : "",
  onValueChange,
  collapsible = false,
  className,
  children,
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const handleValueChange = (newValue: string | string[]) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <AccordionContext.Provider value={{ value, onValueChange: handleValueChange, type }}>
      <View className={className}>
        {children}
      </View>
    </AccordionContext.Provider>
  );
}

type AccordionItemProps = {
  className?: string;
  value: string;
  children: React.ReactNode;
};

function AccordionItem({
  className,
  value,
  children,
}: AccordionItemProps) {
  const context = React.useContext(AccordionContext);
  
  if (!context) {
    throw new Error("AccordionItem must be used within Accordion");
  }

  const isOpen = React.useMemo(() => {
    if (Array.isArray(context.value)) {
      return context.value.includes(value);
    }
    return context.value === value;
  }, [context.value, value]);

  const toggle = () => {
    if (context.type === "multiple") {
      const currentValue = Array.isArray(context.value) ? context.value : [];
      if (isOpen) {
        context.onValueChange(currentValue.filter(v => v !== value));
      } else {
        context.onValueChange([...currentValue, value]);
      }
    } else {
      context.onValueChange(isOpen ? "" : value);
    }
  };

  return (
    <AccordionItemContext.Provider value={{ value, isOpen, toggle }}>
      <View className={cn("border-b last:border-b-0", className)}>
        {children}
      </View>
    </AccordionItemContext.Provider>
  );
}

type AccordionTriggerProps = {
  className?: string;
  children: React.ReactNode;
};

function AccordionTrigger({
  className,
  children,
}: AccordionTriggerProps) {
  const itemContext = React.useContext(AccordionItemContext);
  
  if (!itemContext) {
    throw new Error("AccordionTrigger must be used within AccordionItem");
  }

  return (
    <View className="flex">
      <TouchableOpacity
        onPress={itemContext.toggle}
        className={cn(
          "flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium outline-none",
          className,
        )}
      >
        {children}
        <ChevronDownIcon 
          className={cn(
            "text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200",
            itemContext.isOpen && "rotate-180"
          )} 
        />
      </TouchableOpacity>
    </View>
  );
}

type AccordionContentProps = {
  className?: string;
  children: React.ReactNode;
};

function AccordionContent({
  className,
  children,
}: AccordionContentProps) {
  const itemContext = React.useContext(AccordionItemContext);
  
  if (!itemContext) {
    throw new Error("AccordionContent must be used within AccordionItem");
  }

  if (!itemContext.isOpen) {
    return null;
  }

  return (
    <View className="overflow-hidden text-sm">
      <View className={cn("pt-0 pb-4", className)}>
        {children}
      </View>
    </View>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
