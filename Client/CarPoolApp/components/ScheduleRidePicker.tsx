import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, Clock, Minus, Plus } from './Icons';
import type { AdvanceTiming } from '../services/advanceBooking.service';

type ScheduleRidePickerProps = {
  /** Server-reported windows. Null until loaded; production defaults are assumed. */
  timing: AdvanceTiming | null;
  value: Date | null;
  onChange: (next: Date) => void;
};

/**
 * Picks a pickup time for a scheduled ride.
 *
 * Offsets are expressed in the server's own time unit, so the same control
 * works in production (minutes) and in a build running the compressed test
 * windows (seconds), where a minute-granularity date picker could not express
 * a valid time at all.
 */
export default function ScheduleRidePicker({ timing, value, onChange }: ScheduleRidePickerProps) {
  const unitSeconds = timing?.unit === 'seconds' ? 1 : 60;
  const unitLabel = unitSeconds === 1 ? 's' : 'min';
  const leadUnits = timing?.confirm_lead_units ?? 10;
  const windowUnits = timing?.pool_window_units ?? 30;

  // The earliest valid pickup: confirmation still needs room to run first.
  const minimumUnits = leadUnits + 1;

  const presets = useMemo(
    () => [
      { units: minimumUnits, label: `+${minimumUnits}${unitLabel}` },
      { units: windowUnits, label: `+${windowUnits}${unitLabel}` },
      { units: windowUnits * 2, label: `+${windowUnits * 2}${unitLabel}` },
      { units: windowUnits * 4, label: `+${windowUnits * 4}${unitLabel}` },
    ],
    [minimumUnits, windowUnits, unitLabel]
  );

  const stepUnits = unitSeconds === 1 ? 5 : 5;

  function setFromNow(units: number) {
    onChange(new Date(Date.now() + units * unitSeconds * 1000));
  }

  function nudge(units: number) {
    const base = value ? value.getTime() : Date.now() + minimumUnits * unitSeconds * 1000;
    const next = new Date(base + units * unitSeconds * 1000);
    const earliest = Date.now() + minimumUnits * unitSeconds * 1000;
    onChange(new Date(Math.max(next.getTime(), earliest)));
  }

  const formatted = value
    ? value.toLocaleString(undefined, {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        ...(unitSeconds === 1 ? { second: '2-digit' as const } : {}),
      })
    : null;

  return (
    <View className="mb-6">
      <View className="flex flex-row items-center gap-2 mb-3 mx-1">
        <Calendar className="w-5 h-5 text-gray-700" />
        <Text className="text-base font-semibold text-gray-900">Pickup Time</Text>
      </View>

      <View className="flex-row flex-wrap gap-3 px-1 mb-3">
        {presets.map((preset) => {
          const isActive =
            !!value &&
            Math.abs(value.getTime() - (Date.now() + preset.units * unitSeconds * 1000)) <
              stepUnits * unitSeconds * 1000;

          return (
            <TouchableOpacity
              key={preset.label}
              onPress={() => setFromNow(preset.units)}
              className={`px-4 py-2 rounded-full border-2 ${
                isActive ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
              }`}
              activeOpacity={0.7}
            >
              <Text className={isActive ? 'text-white font-semibold' : 'text-gray-900 font-medium'}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="flex-row items-center justify-between px-4 py-3 bg-gray-50 rounded-xl mx-1">
        <TouchableOpacity
          onPress={() => nudge(-stepUnits)}
          className="w-10 h-10 rounded-full bg-white border border-gray-300 items-center justify-center"
          activeOpacity={0.7}
          accessibilityLabel={`Earlier by ${stepUnits} ${unitLabel}`}
        >
          <Minus size={18} color="#374151" />
        </TouchableOpacity>

        <View className="flex-1 items-center">
          <View className="flex-row items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <Text className="text-base font-semibold text-gray-900">
              {formatted ?? 'Choose a time'}
            </Text>
          </View>
          <Text className="text-xs text-gray-500 mt-0.5">
            Riders within {windowUnits} {unitSeconds === 1 ? 'seconds' : 'minutes'} of you are pooled together
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => nudge(stepUnits)}
          className="w-10 h-10 rounded-full bg-white border border-gray-300 items-center justify-center"
          activeOpacity={0.7}
          accessibilityLabel={`Later by ${stepUnits} ${unitLabel}`}
        >
          <Plus size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      <Text className="text-xs text-gray-500 mt-2 mx-1">
        We will ask you to confirm {leadUnits} {unitSeconds === 1 ? 'seconds' : 'minutes'} before pickup.
      </Text>
    </View>
  );
}
