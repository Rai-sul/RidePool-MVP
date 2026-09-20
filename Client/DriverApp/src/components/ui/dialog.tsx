import * as React from "react";
import { Modal, View, Text, Pressable } from "react-native";
import { X } from "lucide-react-native";
import { cn } from "./utils";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children?: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}) }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function DialogClose({ children }: { children?: React.ReactNode }) {
  const { onOpenChange } = React.useContext(DialogContext);
  
  return (
    <Pressable onPress={() => onOpenChange(false)}>
      {children}
    </Pressable>
  );
}

function DialogOverlay({ className, ...props }: { className?: string }) {
  return (
    <View
      className={cn("absolute inset-0 bg-black/50", className)}
      {...props}
    />
  );
}

function DialogContent({ className, children, ...props }: DialogContentProps) {
  const { open, onOpenChange } = React.useContext(DialogContext);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1 items-center justify-center p-4 bg-black/50">
        <View
          className={cn(
            "bg-white w-full max-w-lg rounded-lg border border-gray-200 p-6 shadow-lg",
            className,
          )}
          {...props}
        >
          {children}
          <Pressable
            onPress={() => onOpenChange(false)}
            className="absolute top-4 right-4 opacity-70"
          >
            <X size={16} color="#6B7280" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DialogHeader({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
  return (
    <View
      className={cn("flex-col gap-2", className)}
      {...props}
    >
      {children}
    </View>
  );
}

function DialogFooter({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
  return (
    <View
      className={cn("flex-row gap-2 justify-end", className)}
      {...props}
    >
      {children}
    </View>
  );
}

function DialogTitle({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
  return (
    <Text
      className={cn("text-lg font-semibold", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function DialogDescription({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
  return (
    <Text
      className={cn("text-sm text-gray-600", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
