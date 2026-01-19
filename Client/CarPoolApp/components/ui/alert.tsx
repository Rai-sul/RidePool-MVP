import * as React from "react";
import { View, Text } from "react-native-web";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type AlertProps = {
  className?: string;
  variant?: VariantProps<typeof alertVariants>['variant'];
  children: React.ReactNode;
};

function Alert({
  className,
  variant,
  children,
}: AlertProps) {
  return (
    <View
      className={cn(alertVariants({ variant }), className)}
    >
      {children}
    </View>
  );
}

function AlertTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Text
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className,
      )}
    >
      {children}
    </Text>
  );
}

function AlertDescription({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
    >
      {children}
    </View>
  );
}

export { Alert, AlertTitle, AlertDescription };
