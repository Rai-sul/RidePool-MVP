import * as React from "react";
import { View, Text } from "react-native-web";

import { cn } from "./utils";

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
        className,
      )}
    >
      {children}
    </View>
  );
}

function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
    >
      {children}
    </View>
  );
}

function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Text
      className={cn("leading-none", className)}
    >
      {children}
    </Text>
  );
}

function CardDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Text
      className={cn("text-muted-foreground", className)}
    >
      {children}
    </Text>
  );
}

function CardAction({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
    >
      {children}
    </View>
  );
}

function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn("px-6 [&:last-child]:pb-6", className)}
    >
      {children}
    </View>
  );
}

function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
    >
      {children}
    </View>
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
