import * as React from "react";
import { View } from "react-native-web";

type AspectRatioProps = {
  ratio?: number;
  className?: string;
  children?: React.ReactNode;
};

function AspectRatio({
  ratio = 1,
  className,
  children,
}: AspectRatioProps) {
  return (
    <View 
      className={className}
      style={{ aspectRatio: ratio }}
    >
      {children}
    </View>
  );
}

export { AspectRatio };
