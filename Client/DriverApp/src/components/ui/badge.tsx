import * as React from "react";
import { View, Text, StyleProp, ViewStyle } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "flex-row items-center justify-center rounded-md border px-2 py-0.5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary",
        secondary: "border-transparent bg-secondary",
        destructive: "border-transparent bg-destructive",
        outline: "border-gray-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  className?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function Badge({ className, variant, children, style, ...props }: BadgeProps) {
  const renderChildren = () => {
    if (typeof children === 'string') {
      return <Text className="text-xs font-semibold">{children}</Text>;
    }
    if (Array.isArray(children)) {
      return children.map((child, index) => 
        typeof child === 'string' ? (
          <Text key={index} className="text-xs font-semibold">{child}</Text>
        ) : child
      );
    }
    return children;
  };

  return (
    <View
      className={cn(badgeVariants({ variant }), className)}
      style={style}
      {...props}
    >
      {renderChildren()}
    </View>
  );
}

export { Badge, badgeVariants };
