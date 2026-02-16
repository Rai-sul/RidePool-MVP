import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "../layout/AppHeader.native";
import { MapView } from "../map/MapView.native";
import { PoolDetailsSheet } from "../pool/PoolDetailsSheet.native";
import { PoolRequestAlert } from "../pool/PoolRequestAlert.native";
import { PriorityLocationDialog } from "../driver/PriorityLocationDialog.native";
import { SearchZoneDialog } from "../driver/SearchZoneDialog.native";
import { FloatingActionButtons } from "./FloatingActionButtons.native";
import { PromotionsPanel } from "./PromotionsPanel.native";
import type { Pool } from "../../types";

interface PoolRequestData {
  pool_id: string;
  vehicle_type?: string;
  passengers?: number;
  estimated_earnings?: number;
  pickup_lat?: number;
  pickup_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  destination_address?: string;
  pickup_address?: string;
}

interface HomeScreenProps {
  pools: Pool[];
  driverLocation?: { lat: number; lng: number } | null;
  isOnline: boolean;
  onToggleOnline: () => void;
  selectedPoolForDetails: Pool | null;
  onPoolSelect: (pool: Pool | null) => void;
  onAcceptPool: (poolId: string) => void;
  priorityLocation: string | null;
  showPriorityDialog: boolean;
  setShowPriorityDialog: (show: boolean) => void;
  onSetPriority: (location: string) => void;
  onClearPriority: () => void;
  searchZone: { lat: number; lng: number; address?: string } | null;
  showSearchZoneDialog: boolean;
  setShowSearchZoneDialog: (show: boolean) => void;
  onSetSearchZone: (destination: string) => void;
  onClearSearchZone: () => void;
  showPromotions: boolean;
  setShowPromotions: (show: boolean) => void;
  incomingPoolRequest: PoolRequestData | null;
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
  priorityLocation,
  showPriorityDialog,
  setShowPriorityDialog,
  onSetPriority,
  onClearPriority,
  searchZone,
  showSearchZoneDialog,
  setShowSearchZoneDialog,
  onSetSearchZone,
  onClearSearchZone,
  showPromotions,
  setShowPromotions,
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
        
        <FloatingActionButtons
          priorityLocation={priorityLocation}
          searchZoneAddress={searchZone?.address || null}
          onPriorityPress={() => setShowPriorityDialog(true)}
          onSearchZonePress={() => setShowSearchZoneDialog(true)}
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

        <SearchZoneDialog
          isOpen={showSearchZoneDialog}
          onClose={() => setShowSearchZoneDialog(false)}
          currentZone={searchZone}
          onSetZone={onSetSearchZone}
          onClearZone={onClearSearchZone}
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
