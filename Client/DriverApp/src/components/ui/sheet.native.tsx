import * as React from "react";
import { Modal, View, Text, Pressable, Animated, Dimensions } from "react-native";
import { X } from "lucide-react-native";
import { cn } from "./utils";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

interface SheetContentProps {
  className?: string;
  children?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

const SheetContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

function Sheet({ open = false, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}) }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetTrigger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function SheetClose({ children }: { children?: React.ReactNode }) {
  const { onOpenChange } = React.useContext(SheetContext);
  
  return (
    <Pressable onPress={() => onOpenChange(false)}>
      {children}
    </Pressable>
  );
}

function SheetContent({ className, children, side = "bottom", ...props }: SheetContentProps) {
  const { open, onOpenChange } = React.useContext(SheetContext);
  const translateY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    Animated.timing(translateY, {
      toValue: open ? 0 : SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [open, translateY]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable 
        className="flex-1 bg-black/50"
        onPress={() => onOpenChange(false)}
      >
        <Animated.View
          style={{ transform: [{ translateY }] }}
          className={cn(
            "absolute bg-white shadow-lg",
            side === "bottom" && "bottom-0 left-0 right-0 rounded-t-2xl border-t",
            side === "top" && "top-0 left-0 right-0 rounded-b-2xl border-b",
            className,
          )}
          {...props}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {children}
            <Pressable
              onPress={() => onOpenChange(false)}
              className="absolute top-4 right-4 opacity-70"
            >
              <X size={16} color="#6B7280" />
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function SheetHeader({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
  return (
    <View
      className={cn("flex-col gap-1.5 p-4", className)}
      {...props}
    >
      {children}
    </View>
  );
}

function SheetFooter({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
  return (
    <View
      className={cn("flex-col gap-2 p-4", className)}
      {...props}
    >
      {children}
    </View>
  );
}

function SheetTitle({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
  return (
    <Text
      className={cn("font-semibold", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

function SheetDescription({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
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
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
