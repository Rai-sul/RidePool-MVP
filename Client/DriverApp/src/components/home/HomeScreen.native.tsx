import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "../layout/AppHeader.native";
import { MapView } from "../map/MapView.native";
import { PoolDetailsSheet } from "../pool/PoolDetailsSheet.native";
import { PoolRequestAlert } from "../pool/PoolRequestAlert.native";
import type { Pool } from "../../types";

interface HomeScreenProps {
  pools: Pool[];
  driverLocation?: { lat: number; lng: number } | null;
  isOnline: boolean;
  onToggleOnline: () => void;
  selectedPoolForDetails: Pool | null;
  onPoolSelect: (pool: Pool | null) => void;
  onAcceptPool: (poolId: string) => void;
  incomingPoolRequest: Pool | null;
  onAcceptIncoming: (poolId: string) => void;
  onDismissIncoming: () => void;
}

export function HomeScreen({
  pools,
  driverLocation,
  isOnline,
  onToggleOnline,
  selectedPoolForDetails,
  onPoolSelect,
  onAcceptPool,
  incomingPoolRequest,
  onAcceptIncoming,
  onDismissIncoming,
}: HomeScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <AppHeader
        currentScreen="home"
        isOnline={isOnline}
        onToggleOnline={onToggleOnline}
      />
      <View className="flex-1 relative">
        <MapView
          driverLocation={driverLocation}
          pools={pools}
          selectedPool={selectedPoolForDetails}
          onPoolSelect={onPoolSelect}
        />
        
        <PoolDetailsSheet
          pool={selectedPoolForDetails}
          isOpen={selectedPoolForDetails !== null}
          onClose={() => onPoolSelect(null)}
          onAccept={onAcceptPool}
        />

        <PoolRequestAlert
          isVisible={incomingPoolRequest !== null}
          poolRequest={incomingPoolRequest}
          onAccept={onAcceptIncoming}
          onDismiss={onDismissIncoming}
        />
      </View>
    </SafeAreaView>
  );
}
