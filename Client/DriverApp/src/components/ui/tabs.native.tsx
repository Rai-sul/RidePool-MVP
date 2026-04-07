import * as React from "react";
import { View, Pressable, Text } from "react-native";
import { cn } from "./utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
});

interface TabsProps {
  className?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

function Tabs({ className, value, defaultValue, onValueChange, children, ...props }: TabsProps) {
  const [selectedValue, setSelectedValue] = React.useState(value ?? defaultValue ?? "");

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: selectedValue, onValueChange: handleValueChange }}>
      <View className={cn("flex-col gap-2", className)} {...props}>
        {children}
      </View>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  className?: string;
  children?: React.ReactNode;
}

function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <View
      className={cn("bg-gray-100 flex-row h-9 w-fit items-center justify-center rounded-xl p-0.5", className)}
      {...props}
    >
      {children}
    </View>
  );
}

interface TabsTriggerProps {
  className?: string;
  value: string;
  children?: React.ReactNode;
}

function TabsTrigger({ className, value, children, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = React.useContext(TabsContext);
  const isSelected = selectedValue === value;

  return (
    <Pressable
      onPress={() => onValueChange(value)}
      className={cn(
        "flex-1 items-center justify-center rounded-xl px-2 py-1",
        isSelected && "bg-white",
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className={cn("text-sm font-medium", isSelected && "text-gray-900")}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

interface TabsContentProps {
  className?: string;
  value: string;
  children?: React.ReactNode;
}

function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const { value: selectedValue } = React.useContext(TabsContext);

  if (selectedValue !== value) {
    return null;
  }

  return (
    <View className={cn("flex-1", className)} {...props}>
      {children}
    </View>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
