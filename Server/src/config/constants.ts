import { PoolStatus, RideStatus, VehicleType } from '../types';
import { H3_RESOLUTION } from '../utils/h3.utils';

export const CONSTANTS = {
  VEHICLE_TYPES: {
    CAR: 'CAR' as VehicleType,
    CNG: 'CNG' as VehicleType,
  },
  RIDE_STATUS: {
    PENDING: 'PENDING' as RideStatus,
    SEARCHING: 'SEARCHING' as RideStatus,
    MATCHED: 'MATCHED' as RideStatus,
    DRIVER_ASSIGNED: 'DRIVER_ASSIGNED' as RideStatus,
    DRIVER_ARRIVED: 'DRIVER_ARRIVED' as RideStatus,
    IN_PROGRESS: 'IN_PROGRESS' as RideStatus,
    COMPLETED: 'COMPLETED' as RideStatus,
    CANCELLED: 'CANCELLED' as RideStatus,
  },
  POOL_STATUS: {
    WAITING_FOR_RIDERS: 'WAITING_FOR_RIDERS' as PoolStatus,
    WAITING_FOR_DRIVER: 'WAITING_FOR_DRIVER' as PoolStatus,
    DRIVER_ASSIGNED: 'DRIVER_ASSIGNED' as PoolStatus,
    READY_TO_START: 'READY_TO_START' as PoolStatus,
    STARTED: 'STARTED' as PoolStatus,
    COMPLETED: 'COMPLETED' as PoolStatus,
    CANCELLED: 'CANCELLED' as PoolStatus,
  },
  MIN_PASSENGERS: 2,
  MAX_PASSENGERS_CAR: 3,
  PICKUP_RANGE_KM: 2,
  DESTINATION_RANGE_KM: 5,
  H3: H3_RESOLUTION,
};