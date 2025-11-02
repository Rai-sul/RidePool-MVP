import * as React from "react";
import { View, Text } from "react-native-web";

import { cn } from "./utils";

function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View className="relative w-full overflow-x-auto">
      <View className={cn("w-full text-sm", className)}>
        {children}
      </View>
    </View>
  );
}

function TableHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View className={cn("[&_tr]:border-b", className)}>
      {children}
    </View>
  );
}

function TableBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View className={cn("[&_tr:last-child]:border-0", className)}>
      {children}
    </View>
  );
}

function TableFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
    >
      {children}
    </View>
  );
}

function TableRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "hover:bg-muted/50 border-b transition-colors",
        className,
      )}
    >
      {children}
    </View>
  );
}

function TableHead({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap",
        className,
      )}
    >
      {children}
    </View>
  );
}

function TableCell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "p-2 align-middle whitespace-nowrap",
        className,
      )}
    >
      {children}
    </View>
  );
}

function TableCaption({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Text
      className={cn("text-muted-foreground mt-4 text-sm", className)}
    >
      {children}
    </Text>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
