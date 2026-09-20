import * as React from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { cn } from "./utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue>({
  value: "",
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
});

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [selectedValue, setSelectedValue] = React.useState(value ?? defaultValue ?? "");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value: selectedValue, onValueChange: handleValueChange, open, setOpen }}>
      {children}
    </SelectContext.Provider>
  );
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext);
  return <Text className="text-gray-600">{value || placeholder}</Text>;
}

interface SelectTriggerProps {
  className?: string;
  children?: React.ReactNode;
}

function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  const { setOpen } = React.useContext(SelectContext);

  return (
    <Pressable
      onPress={() => setOpen(true)}
      className={cn(
        "flex-row items-center justify-between h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown size={16} color="#9CA3AF" />
    </Pressable>
  );
}

interface SelectContentProps {
  className?: string;
  children?: React.ReactNode;
}

function SelectContent({ className, children, ...props }: SelectContentProps) {
  const { open, setOpen } = React.useContext(SelectContext);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => setOpen(false)}
    >
      <Pressable 
        className="flex-1 bg-black/50 items-center justify-center p-4"
        onPress={() => setOpen(false)}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            className={cn(
              "bg-white rounded-md border border-gray-200 shadow-lg max-h-80 min-w-[8rem]",
              className
            )}
            {...props}
          >
            <ScrollView className="p-1">
              {children}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SelectLabel({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
  return (
    <Text className={cn("text-gray-600 px-2 py-1.5 text-xs", className)} {...props}>
      {children}
    </Text>
  );
}

interface SelectItemProps {
  className?: string;
  value: string;
  children?: React.ReactNode;
}

function SelectItem({ className, value, children, ...props }: SelectItemProps) {
  const { value: selectedValue, onValueChange } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <Pressable
      onPress={() => onValueChange(value)}
      className={cn(
        "flex-row items-center gap-2 rounded-sm py-1.5 pr-8 pl-2",
        isSelected && "bg-gray-100",
        className
      )}
      {...props}
    >
      <Text className="flex-1 text-sm">{children}</Text>
      {isSelected && (
        <View className="absolute right-2">
          <Check size={16} color="#374151" />
        </View>
      )}
    </Pressable>
  );
}

function SelectSeparator({ className, ...props }: { className?: string }) {
  return <View className={cn("bg-gray-200 h-px my-1", className)} {...props} />;
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
