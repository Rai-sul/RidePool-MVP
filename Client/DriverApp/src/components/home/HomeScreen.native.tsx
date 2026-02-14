import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapView } from "../map/MapView.native";
import { PoolDetailsSheet } from "../pool/PoolDetailsSheet.native";
import { PriorityLocationDialog } from "../driver/PriorityLocationDialog.native";
import { FloatingActionButtons } from "./FloatingActionButtons.native";
import { PromotionsPanel } from "./PromotionsPanel.native";
import type { Pool } from "../../types";

interface HomeScreenProps {
  pools: Pool[];
  driverLocation?: { lat: number; lng: number } | null;
  selectedPoolForDetails: Pool | null;
  onPoolSelect: (pool: Pool | null) => void;
  onAcceptPool: (poolId: string) => void;
  priorityLocation: string | null;
  showPriorityDialog: boolean;
  setShowPriorityDialog: (show: boolean) => void;
  onSetPriority: (location: string) => void;
  onClearPriority: () => void;
  showPromotions: boolean;
  setShowPromotions: (show: boolean) => void;
}

export function HomeScreen({
  pools,
  driverLocation,
  selectedPoolForDetails,
  onPoolSelect,
  onAcceptPool,
  priorityLocation,
  showPriorityDialog,
  setShowPriorityDialog,
  onSetPriority,
  onClearPriority,
  showPromotions,
  setShowPromotions,
}: HomeScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <View className="flex-1 relative">
        <MapView
          driverLocation={driverLocation}
          pools={pools}
          selectedPool={selectedPoolForDetails}
          onPoolSelect={onPoolSelect}
        />
        
        <FloatingActionButtons
          priorityLocation={priorityLocation}
          onPriorityPress={() => setShowPriorityDialog(true)}
          onPromotionsPress={() => setShowPromotions(!showPromotions)}
        />

        {showPromotions && (
          <PromotionsPanel onClose={() => setShowPromotions(false)} />
        )}
        
        <PoolDetailsSheet
          pool={selectedPoolForDetails}
          isOpen={selectedPoolForDetails !== null}
          onClose={() => onPoolSelect(null)}
          onAccept={onAcceptPool}
        />
        
        <PriorityLocationDialog
          isOpen={showPriorityDialog}
          onClose={() => setShowPriorityDialog(false)}
          currentPriority={priorityLocation}
          onSetPriority={onSetPriority}
          onClearPriority={onClearPriority}
        />
      </View>
    </SafeAreaView>
  );
}
