import * as React from "react";
import { View } from "react-native-web";
import { GripVerticalIcon } from "lucide-react@0.487.0";

import { cn } from "./utils";

type ResizablePanelGroupProps = {
  className?: string;
  direction?: "horizontal" | "vertical";
  children: React.ReactNode;
};

function ResizablePanelGroup({
  className,
  direction = "horizontal",
  children,
}: ResizablePanelGroupProps) {
  return (
    <View
      className={cn(
        "flex h-full w-full",
        direction === "vertical" ? "flex-col" : "flex-row",
        className,
      )}
    >
      {children}
    </View>
  );
}

type ResizablePanelProps = {
  className?: string;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  children: React.ReactNode;
};

function ResizablePanel({
  className,
  defaultSize,
  children,
}: ResizablePanelProps) {
  return (
    <View 
      className={cn("flex-1", className)}
      style={defaultSize ? { flex: defaultSize / 100 } : undefined}
    >
      {children}
    </View>
  );
}

type ResizableHandleProps = {
  withHandle?: boolean;
  className?: string;
};

function ResizableHandle({
  withHandle,
  className,
}: ResizableHandleProps) {
  return (
    <View
      className={cn(
        "bg-border relative flex w-px items-center justify-center",
        className,
      )}
    >
      {withHandle && (
        <View className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </View>
      )}
    </View>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
