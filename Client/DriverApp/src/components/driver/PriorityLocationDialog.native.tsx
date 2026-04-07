import { useState } from "react";
import { View, Text, Modal, ScrollView, Pressable } from "react-native";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Star, MapPin, X } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";

interface PriorityLocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPriority: string | null;
  onSetPriority: (location: string) => void;
  onClearPriority: () => void;
}

const popularLocations = [
  "Mirpur",
  "Gulshan",
  "Dhanmondi",
  "Uttara",
  "Banani",
  "Mohakhali",
  "Farmgate",
  "Shahbag",
  "Motijheel",
  "Badda"
];

export function PriorityLocationDialog({ 
  isOpen,
  onClose,
  currentPriority, 
  onSetPriority,
  onClearPriority 
}: PriorityLocationDialogProps) {
  const { colors, isDark } = useTheme();
  const [customLocation, setCustomLocation] = useState("");

  const handleSetPriority = (location: string) => {
    onSetPriority(location);
    onClose();
    setCustomLocation("");
  };

  const handleClearPriority = () => {
    onClearPriority();
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
        <Pressable className="rounded-t-3xl max-h-[90%]" style={{ backgroundColor: colors.background }} onPress={(e) => e.stopPropagation()}>
          <ScrollView className="p-6">
            {/* Header */}
            <View className="mb-6">
              <Text className="text-xl font-semibold mb-2" style={{ color: colors.text }}>Set Priority Destination</Text>
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                Choose a priority destination to see pools heading there first.
              </Text>
            </View>
            
            <View className="gap-6">
              {currentPriority && (
                <View className="p-4 rounded-lg flex-row items-center justify-between border" style={{ backgroundColor: isDark ? '#064E3B' : '#D1FAE5', borderColor: isDark ? '#059669' : '#A7F3D0' }}>
                  <View className="flex-row items-center gap-2">
                    <Star size={16} color={colors.success} fill={colors.success} />
                    <Text className="font-medium" style={{ color: colors.text }}>Current: {currentPriority}</Text>
                  </View>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onPress={handleClearPriority}
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
                <Label className="text-base mb-3 font-semibold" style={{ color: colors.text }}>Popular Locations</Label>
                <View className="flex-row flex-wrap gap-2">
                  {popularLocations.map((location) => (
                    <Button
                      key={location}
                      variant={currentPriority === location ? "default" : "outline"}
                      size="sm"
                      onPress={() => handleSetPriority(location)}
                      className="h-10 px-4"
                      style={{
                        backgroundColor: currentPriority === location ? colors.primary : colors.card,
                        borderColor: currentPriority === location ? colors.primary : colors.border,
                      }}
                    >
                      <View className="flex-row items-center gap-2">
                        <MapPin size={14} color={currentPriority === location ? colors.primaryText : colors.icon} />
                        <Text className="font-medium" style={{ color: currentPriority === location ? colors.primaryText : colors.text }}>
                          {location}
                        </Text>
                      </View>
                    </Button>
                  ))}
                </View>
              </View>

              <View>
                <Label htmlFor="custom-location" className="text-base mb-3 font-semibold" style={{ color: colors.text }}>Custom Location</Label>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Input
                      placeholder="Enter location name"
                      value={customLocation}
                      onChangeText={setCustomLocation}
                      onSubmitEditing={() => customLocation && handleSetPriority(customLocation)}
                      className="h-12"
                      style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <Button 
                    onPress={() => customLocation && handleSetPriority(customLocation)}
                    disabled={!customLocation}
                    className="h-12 px-6"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="font-semibold" style={{ color: colors.primaryText }}>Set</Text>
                  </Button>
                </View>
              </View>

              <View className="p-3 rounded-lg border" style={{ backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE', borderColor: isDark ? '#2563EB' : '#93C5FD' }}>
                <Text className="text-sm" style={{ color: colors.text }}>
                  💡 Pools heading to your priority destination will appear with a{" "}
                  <Text className="font-semibold" style={{ color: colors.success }}>green marker and star</Text> on the map.
                </Text>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
