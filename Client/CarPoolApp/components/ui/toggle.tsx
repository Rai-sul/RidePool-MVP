import * as React from "react";
import { TouchableOpacity } from "react-native-web";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none transition-[color,box-shadow] whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleProps = {
  className?: string;
  variant?: VariantProps<typeof toggleVariants>['variant'];
  size?: VariantProps<typeof toggleVariants>['size'];
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
};

function Toggle({
  className,
  variant,
  size,
  pressed = false,
  onPressedChange,
  disabled = false,
  children,
}: ToggleProps) {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onPressedChange?.(!pressed)}
      disabled={disabled}
      className={cn(
        toggleVariants({ variant, size }),
        pressed && "bg-accent text-accent-foreground",
        className
      )}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}

export { Toggle, toggleVariants };
