import { useState } from "react";
import { View, Text, Modal, ScrollView, Pressable } from "react-native";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Navigation, MapPin, X } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface SearchZoneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentZone: { lat: number; lng: number; address?: string } | null;
  onSetZone: (address: string) => void;
  onClearZone: () => void;
}

const popularDestinations = [
  "Mirpur",
  "Gulshan",
  "Dhanmondi",
  "Uttara",
  "Banani",
  "Mohakhali",
  "Farmgate",
  "Motijheel",
];

export function SearchZoneDialog({
  isOpen,
  onClose,
  currentZone,
  onSetZone,
  onClearZone,
}: SearchZoneDialogProps) {
  const { colors, isDark } = useTheme();
  const [customDestination, setCustomDestination] = useState("");

  const handleSetZone = (destination: string) => {
    onSetZone(destination);
    onClose();
    setCustomDestination("");
  };

  const handleClearZone = () => {
    onClearZone();
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onPress={onClose}
      >
        <Pressable
          className="rounded-t-3xl max-h-[90%]"
          style={{ backgroundColor: colors.background }}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView className="p-6">
            <View className="mb-6">
              <Text className="text-xl font-semibold mb-2" style={{ color: colors.text }}>
                Set Search Zone
              </Text>
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                Set your intended destination to see pools along your route. Pools
                matching your route will be prioritized.
              </Text>
            </View>

            <View className="gap-6">
              {currentZone && (
                <View
                  className="p-4 rounded-lg flex-row items-center justify-between border"
                  style={{
                    backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
                    borderColor: isDark ? '#059669' : '#A7F3D0',
                  }}
                >
                  <View className="flex-row items-center gap-2 flex-1 mr-2">
                    <Navigation size={16} color={colors.success} />
                    <Text className="font-medium" style={{ color: colors.text }} numberOfLines={1}>
                      Route: {currentZone.address || `${currentZone.lat.toFixed(4)}, ${currentZone.lng.toFixed(4)}`}
                    </Text>
                  </View>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={handleClearZone}
                    className="h-10 px-3"
                    style={{ borderColor: colors.error, backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }}
                  >
                    <View className="flex-row items-center gap-1">
                      <X size={16} color={colors.error} />
                      <Text className="font-medium" style={{ color: colors.error }}>Clear</Text>
                    </View>
                  </Button>
                </View>
              )}

              <View>
                <Label className="text-base mb-3 font-semibold" style={{ color: colors.text }}>
                  Popular Destinations
                </Label>
                <View className="flex-row flex-wrap gap-2">
                  {popularDestinations.map((dest) => (
                    <Button
                      key={dest}
                      variant={currentZone?.address === dest ? "default" : "outline"}
                      size="sm"
                      onPress={() => handleSetZone(dest)}
                      className="h-10 px-4"
                      style={{
                        backgroundColor: currentZone?.address === dest ? colors.primary : colors.card,
                        borderColor: currentZone?.address === dest ? colors.primary : colors.border,
                      }}
                    >
                      <View className="flex-row items-center gap-2">
                        <MapPin size={14} color={currentZone?.address === dest ? colors.primaryText : colors.icon} />
                        <Text
                          className="font-medium"
                          style={{ color: currentZone?.address === dest ? colors.primaryText : colors.text }}
                        >
                          {dest}
                        </Text>
                      </View>
                    </Button>
                  ))}
                </View>
              </View>

              <View>
                <Label className="text-base mb-3 font-semibold" style={{ color: colors.text }}>
                  Custom Destination
                </Label>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Input
                      placeholder="Enter destination"
                      value={customDestination}
                      onChangeText={setCustomDestination}
                      onSubmitEditing={() => customDestination && handleSetZone(customDestination)}
                      className="h-12"
                      style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <Button
                    onPress={() => customDestination && handleSetZone(customDestination)}
                    disabled={!customDestination}
                    className="h-12 px-6"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="font-semibold" style={{ color: colors.primaryText }}>Set</Text>
                  </Button>
                </View>
              </View>

              <View
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
                  borderColor: isDark ? '#2563EB' : '#93C5FD',
                }}
              >
                <Text className="text-sm" style={{ color: colors.text }}>
                  🧭 When a search zone is set, pools along your route from your current
                  location to the destination will appear in your available pools list. Uses
                  H3 hexagonal grid matching for accurate route coverage.
                </Text>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
