import * as React from "react";
import { Pressable, Animated } from "react-native";
import { cn } from "./utils";
import { useTheme } from "../../contexts/ThemeContext";

interface SwitchProps {
  className?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Switch({ className, checked, defaultChecked = false, onCheckedChange, ...props }: SwitchProps) {
  const { colors } = useTheme();
  const [isChecked, setIsChecked] = React.useState(checked !== undefined ? checked : defaultChecked);
  const translateX = React.useRef(new Animated.Value(isChecked ? 1 : 0)).current;

  React.useEffect(() => {
    if (checked !== undefined) {
      setIsChecked(checked);
    }
  }, [checked]);

  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: isChecked ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isChecked, translateX]);

  const handlePress = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onCheckedChange?.(newValue);
  };

  const thumbTranslate = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "h-[1.15rem] w-8 rounded-full border border-transparent flex-row items-center px-0.5",
        className,
      )}
      style={{
        backgroundColor: isChecked ? colors.primary : '#D1D5DB',
      }}
      {...props}
    >
      <Animated.View
        className="w-4 h-4 rounded-full"
        style={{ 
          backgroundColor: '#FFFFFF',
          transform: [{ translateX: thumbTranslate }] 
        }}
      />
    </Pressable>
  );
}

export { Switch };
