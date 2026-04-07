import * as React from "react";
import { TextInput, TextInputProps } from "react-native";
import { cn } from "./utils";

interface TextareaProps extends TextInputProps {
  className?: string;
}

const Textarea = React.forwardRef<TextInput, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
        className={cn(
          "min-h-16 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base",
          "focus:border-blue-500",
          className,
        )}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
