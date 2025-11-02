import * as React from "react";
import { View, Text, TouchableOpacity } from "react-native-web";
import { ChevronRight, MoreHorizontal } from "lucide-react@0.487.0";

import { cn } from "./utils";

function Breadcrumb({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View className={className}>
      {children}
    </View>
  );
}

function BreadcrumbList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className,
      )}
    >
      {children}
    </View>
  );
}

function BreadcrumbItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      {children}
    </View>
  );
}

type BreadcrumbLinkProps = {
  className?: string;
  onPress?: () => void;
  children: React.ReactNode;
};

function BreadcrumbLink({
  className,
  onPress,
  children,
}: BreadcrumbLinkProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={cn("hover:text-foreground transition-colors", className)}
    >
      {children}
    </TouchableOpacity>
  );
}

function BreadcrumbPage({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Text
      className={cn("text-foreground font-normal", className)}
    >
      {children}
    </Text>
  );
}

function BreadcrumbSeparator({
  children,
  className,
}: { className?: string; children?: React.ReactNode }) {
  return (
    <View
      className={cn("[&>svg]:size-3.5", className)}
    >
      {children ?? <ChevronRight />}
    </View>
  );
}

function BreadcrumbEllipsis({
  className,
}: { className?: string }) {
  return (
    <View
      className={cn("flex size-9 items-center justify-center", className)}
    >
      <MoreHorizontal className="size-4" />
    </View>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
