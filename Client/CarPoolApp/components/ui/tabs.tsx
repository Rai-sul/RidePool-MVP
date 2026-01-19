import * as React from "react";
import { View, TouchableOpacity } from "react-native-web";

import { cn } from "./utils";

type TabsContextProps = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextProps | null>(null);

type TabsProps = {
  className?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
};

function Tabs({
  className,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <View className={cn("flex flex-col gap-2", className)}>
        {children}
      </View>
    </TabsContext.Provider>
  );
}

type TabsListProps = {
  className?: string;
  children: React.ReactNode;
};

function TabsList({
  className,
  children,
}: TabsListProps) {
  return (
    <View
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] flex",
        className,
      )}
    >
      {children}
    </View>
  );
}

type TabsTriggerProps = {
  className?: string;
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
};

function TabsTrigger({
  className,
  value,
  disabled = false,
  children,
}: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  
  if (!context) {
    throw new Error("TabsTrigger must be used within Tabs");
  }

  const isActive = context.value === value;

  return (
    <TouchableOpacity
      onPress={() => !disabled && context.onValueChange(value)}
      disabled={disabled}
      className={cn(
        "text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-card dark:text-foreground dark:border-input dark:bg-input/30",
        className,
      )}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}

type TabsContentProps = {
  className?: string;
  value: string;
  children: React.ReactNode;
};

function TabsContent({
  className,
  value,
  children,
}: TabsContentProps) {
  const context = React.useContext(TabsContext);
  
  if (!context) {
    throw new Error("TabsContent must be used within Tabs");
  }

  if (context.value !== value) {
    return null;
  }

  return (
    <View className={cn("flex-1 outline-none", className)}>
      {children}
    </View>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
