import * as React from "react";
import { View, Pressable } from "react-native";
import { Circle } from "lucide-react-native";
import { cn } from "./utils";

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({
  value: "",
  onValueChange: () => {},
});

interface RadioGroupProps {
  className?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

function RadioGroup({ className, value, defaultValue, onValueChange, children, ...props }: RadioGroupProps) {
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
    <RadioGroupContext.Provider value={{ value: selectedValue, onValueChange: handleValueChange }}>
      <View className={cn("gap-3", className)} {...props}>
        {children}
      </View>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps {
  className?: string;
  value: string;
}

function RadioGroupItem({ className, value, ...props }: RadioGroupItemProps) {
  const { value: selectedValue, onValueChange } = React.useContext(RadioGroupContext);
  const isSelected = selectedValue === value;

  return (
    <Pressable
      onPress={() => onValueChange(value)}
      className={cn(
        "w-4 h-4 rounded-full border border-gray-300 items-center justify-center",
        isSelected && "border-primary",
        className
      )}
      {...props}
    >
      {isSelected && <Circle size={8} fill="#3B82F6" color="#3B82F6" />}
    </Pressable>
  );
}

export { RadioGroup, RadioGroupItem };
