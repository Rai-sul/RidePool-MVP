import * as React from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { cn } from "./utils";

interface CheckboxProps {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Checkbox({ className, checked = false, onCheckedChange, ...props }: CheckboxProps) {
  const [isChecked, setIsChecked] = React.useState(checked);

  React.useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const handlePress = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onCheckedChange?.(newValue);
  };

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "w-4 h-4 rounded border border-gray-300 items-center justify-center",
        isChecked && "bg-primary border-primary",
        className,
      )}
      {...props}
    >
      {isChecked && <Check size={14} color="#FFFFFF" />}
    </Pressable>
  );
}

export { Checkbox };
