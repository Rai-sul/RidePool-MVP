import * as React from "react";
import { View, Text, StyleProp, ViewStyle, TextStyle } from "react-native";
import { cn } from "./utils";

export interface CardProps {
  className?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface CardTextProps {
  className?: string;
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

function Card({ className, children, style, ...props }: CardProps) {
  return (
    <View
      className={cn(
        "bg-white rounded-xl border border-gray-200",
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}

function CardHeader({ className, children, style, ...props }: CardProps) {
  return (
    <View
      className={cn("px-6 pt-6", className)}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}

function CardTitle({ className, children, style, ...props }: CardTextProps) {
  return (
    <Text
      className={cn("font-semibold", className)}
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
}

function CardDescription({ className, children, style, ...props }: CardTextProps) {
  return (
    <Text
      className={cn("text-gray-600", className)}
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
}

function CardAction({ className, children, style, ...props }: CardProps) {
  return (
    <View
      className={cn("self-start justify-end", className)}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}

function CardContent({ className, children, style, ...props }: CardProps) {
  return (
    <View
      className={cn("px-6", className)}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}

function CardFooter({ className, children, style, ...props }: CardProps) {
  return (
    <View
      className={cn("flex-row items-center px-6 pb-6", className)}
      style={style}
      {...props}
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
