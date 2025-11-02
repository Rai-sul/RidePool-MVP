import * as React from "react";
import { View } from "react-native-web";

import { cn } from "./utils";

type SliderProps = {
  className?: string;
  defaultValue?: number[];
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
};

function Slider({
  className,
  defaultValue = [0],
  value: controlledValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  disabled = false,
}: SliderProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = [Number(e.target.value)];
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <View
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        disabled && "opacity-50",
        className,
      )}
    >
      <View className="bg-muted relative grow overflow-hidden rounded-full h-4 w-full">
        <View
          className="bg-primary absolute h-full"
          style={{
            width: `${((value[0] - min) / (max - min)) * 100}%`,
          }}
        />
      </View>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        disabled={disabled}
        className="absolute w-full h-4 opacity-0 cursor-pointer"
        style={{ margin: 0 }}
      />
      <View
        className="border-primary bg-background ring-ring/50 absolute size-4 shrink-0 rounded-full border shadow-sm pointer-events-none"
        style={{
          left: `calc(${((value[0] - min) / (max - min)) * 100}% - 8px)`,
        }}
      />
    </View>
  );
}

export { Slider };
