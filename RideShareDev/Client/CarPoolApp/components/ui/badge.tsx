import * as React from "react";
import { Text } from "react-native-web";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-white",
        outline:
          "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = {
  className?: string;
  variant?: VariantProps<typeof badgeVariants>['variant'];
  children: React.ReactNode;
};

function Badge({
  className,
  variant,
  children,
}: BadgeProps) {
  return (
    <Text
      className={cn(badgeVariants({ variant }), className)}
    >
      {children}
    </Text>
  );
}

export { Badge, badgeVariants };
