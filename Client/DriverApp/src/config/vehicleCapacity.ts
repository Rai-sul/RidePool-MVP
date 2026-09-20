/**
 * App-wide passenger capacity per vehicle type.
 *
 * Mirrors the server's CONSTANTS.VEHICLE_CAPACITY. Pools are sized by the
 * server; this is only used for display fallbacks when a pool payload has not
 * reported its capacity yet.
 */
export const VEHICLE_CAPACITY: Record<string, number> = {
  CNG: 2,
  CAR: 3,
};

export function capacityFor(vehicleType?: string | null): number {
  if (!vehicleType) return VEHICLE_CAPACITY.CAR;
  return VEHICLE_CAPACITY[vehicleType.toUpperCase()] ?? VEHICLE_CAPACITY.CAR;
}
