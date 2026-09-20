import * as React from "react";
import { View, Image, Text } from "react-native";
import { cn } from "./utils";

interface AvatarProps {
  className?: string;
  children?: React.ReactNode;
}

function Avatar({ className, children, ...props }: AvatarProps) {
  return (
    <View
      className={cn("w-10 h-10 rounded-full overflow-hidden", className)}
      {...props}
    >
      {children}
    </View>
  );
}

interface AvatarImageProps {
  className?: string;
  src?: string;
  alt?: string;
}

function AvatarImage({ className, src, alt, ...props }: AvatarImageProps) {
  return (
    <Image
      source={{ uri: src }}
      className={cn("w-full h-full", className)}
      accessibilityLabel={alt}
      {...props}
    />
  );
}

interface AvatarFallbackProps {
  className?: string;
  children?: React.ReactNode;
}

function AvatarFallback({ className, children, ...props }: AvatarFallbackProps) {
  return (
    <View
      className={cn("bg-gray-200 w-full h-full items-center justify-center", className)}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className="text-gray-600">{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
