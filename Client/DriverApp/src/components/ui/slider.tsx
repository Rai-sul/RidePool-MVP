import * as React from "react";
import { View } from "react-native";
import { cn } from "./utils";

interface SliderProps {
  className?: string;
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  onValueChange?: (value: number[]) => void;
}

function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  onValueChange,
  ...props
}: SliderProps) {
  const [sliderValue, setSliderValue] = React.useState(
    value?.[0] ?? defaultValue?.[0] ?? min
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setSliderValue(value[0]);
    }
  }, [value]);

  const percentage = ((sliderValue - min) / (max - min)) * 100;

  return (
    <View
      className={cn("relative w-full h-4 items-center", className)}
      {...props}
    >
      <View className="bg-gray-200 absolute h-4 w-full rounded-full">
        <View
          className="bg-primary h-full rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </View>
      <View
        className="absolute bg-white border-2 border-primary w-4 h-4 rounded-full shadow-sm"
        style={{ left: `${percentage}%`, marginLeft: -8 }}
      />
    </View>
  );
}

export { Slider };
