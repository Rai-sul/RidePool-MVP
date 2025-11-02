import * as React from "react";
import { View, Text, TouchableOpacity } from "react-native-web";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react@0.487.0";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Pagination({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View className={cn("mx-auto flex w-full justify-center", className)}>
      {children}
    </View>
  );
}

function PaginationContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <View className={cn("flex flex-row items-center gap-1", className)}>
      {children}
    </View>
  );
}

function PaginationItem({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}

type PaginationLinkProps = {
  isActive?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onPress?: () => void;
  children: React.ReactNode;
};

function PaginationLink({
  className,
  isActive,
  size = "icon",
  onPress,
  children,
}: PaginationLinkProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className,
      )}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}

function PaginationPrevious({
  className,
  ...props
}: Omit<PaginationLinkProps, 'size'>) {
  return (
    <PaginationLink
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <Text className="hidden sm:block">Previous</Text>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: Omit<PaginationLinkProps, 'size'>) {
  return (
    <PaginationLink
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <Text className="hidden sm:block">Next</Text>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
}: { className?: string }) {
  return (
    <View
      className={cn("flex size-9 items-center justify-center", className)}
    >
      <MoreHorizontalIcon className="size-4" />
    </View>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
