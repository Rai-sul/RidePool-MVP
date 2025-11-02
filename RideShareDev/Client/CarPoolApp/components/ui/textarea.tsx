import * as React from "react";
import { TextInput } from "react-native-web";

import { cn } from "./utils";

type TextareaProps = {
  className?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
};

function Textarea({ 
  className, 
  value,
  onChangeText,
  placeholder,
  disabled,
  multiline = true,
}: TextareaProps) {
  return (
    <TextInput
      className={cn(
        "border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      editable={!disabled}
      multiline={multiline}
    />
  );
}

export { Textarea };
