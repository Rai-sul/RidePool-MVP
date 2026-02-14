import { View } from "react-native";
import { ActiveRide } from "../pool/ActiveRide.native";
import { MapView } from "../map/MapView.native";
import type { Pool } from "../../types";

interface ActiveRideScreenProps {
  activePool: Pool;
  showNavigationMode: boolean;
  onComplete: () => void;
  onCancel: () => void;
  onOpenNavigation: () => void;
}

export function ActiveRideScreen({
  activePool,
  showNavigationMode,
  onComplete,
  onCancel,
  onOpenNavigation,
}: ActiveRideScreenProps) {
  if (showNavigationMode) {
    return (
      <View className="flex-1">
        <MapView
          driverLocation={{ lat: 23.7805, lng: 90.4258 }}
          pools={[]}
          selectedPool={null}
          onPoolSelect={() => {}}
          navigationMode={true}
          activePool={activePool}
        />
      </View>
    );
  }

  return (
    <View className="p-4">
      <ActiveRide 
        pool={activePool}
        onComplete={onComplete}
        onCancel={onCancel}
        onOpenNavigation={onOpenNavigation}
      />
    </View>
  );
}
