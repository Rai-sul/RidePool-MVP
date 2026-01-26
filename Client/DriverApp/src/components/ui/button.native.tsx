import * as React from "react";
import { Pressable, View, Text, StyleProp, ViewStyle } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "flex-row items-center justify-center gap-2 rounded-md disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary",
        destructive: "bg-destructive",
        outline: "border border-gray-300 bg-white",
        secondary: "bg-secondary",
        ghost: "bg-transparent",
        link: "bg-transparent",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 rounded-md",
        lg: "h-10 px-6 rounded-md",
        icon: "w-9 h-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  className?: string;
  disabled?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const Button = React.forwardRef<View, ButtonProps>(
  ({ className, variant, size, disabled = false, onPress, children, style, ...props }, ref) => {
    const renderChildren = () => {
      if (typeof children === 'string') {
        return <Text className="text-white font-medium">{children}</Text>;
      }
      if (Array.isArray(children)) {
        return children.map((child, index) => 
          typeof child === 'string' ? (
            <Text key={index} className="text-white font-medium">{child}</Text>
          ) : child
        );
      }
      return children;
    };

    return (
      <Pressable
        ref={ref}
        disabled={disabled}
        onPress={onPress}
        className={cn(buttonVariants({ variant, size, className }))}
        style={style}
        {...props}
      >
        {renderChildren()}
      </Pressable>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
