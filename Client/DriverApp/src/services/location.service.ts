import * as ExpoLocation from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { Location } from '../types';

const LOCATION_TASK_NAME = 'driver-background-location-task';

export interface LocationSubscription {
  remove: () => void;
}

export const locationService = {
  async requestForegroundPermission(): Promise<boolean> {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  async requestBackgroundPermission(): Promise<boolean> {
    const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
    return status === 'granted';
  },

  async requestAllPermissions(): Promise<{
    foreground: boolean;
    background: boolean;
  }> {
    const foreground = await this.requestForegroundPermission();
    let background = false;

    if (foreground) {
      background = await this.requestBackgroundPermission();
    }

    return { foreground, background };
  },

  async checkPermissions(): Promise<{
    foreground: boolean;
    background: boolean;
  }> {
    const { status: foregroundStatus } =
      await ExpoLocation.getForegroundPermissionsAsync();
    const { status: backgroundStatus } =
      await ExpoLocation.getBackgroundPermissionsAsync();

    return {
      foreground: foregroundStatus === 'granted',
      background: backgroundStatus === 'granted',
    };
  },

  async getCurrentLocation(): Promise<Location | null> {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.foreground) {
        const granted = await this.requestForegroundPermission();
        if (!granted) return null;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch {
      return null;
    }
  },

  async watchLocation(
    callback: (location: Location) => void,
    options?: {
      accuracy?: ExpoLocation.Accuracy;
      distanceInterval?: number;
      timeInterval?: number;
    }
  ): Promise<LocationSubscription> {
    const subscription = await ExpoLocation.watchPositionAsync(
      {
        accuracy: options?.accuracy ?? ExpoLocation.Accuracy.High,
        distanceInterval: options?.distanceInterval ?? 10,
        timeInterval: options?.timeInterval ?? 5000,
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    );

    return subscription;
  },

  async startBackgroundLocationUpdates(
    onLocation: (location: Location) => void
  ): Promise<boolean> {
    const permissions = await this.checkPermissions();
    if (!permissions.background) {
      const granted = await this.requestBackgroundPermission();
      if (!granted) return false;
    }

    TaskManager.defineTask(
      LOCATION_TASK_NAME,
      async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: ExpoLocation.LocationObject[] }>) => {
        if (error) {
          return;
        }
        if (data?.locations && data.locations.length > 0) {
          const location = data.locations[0];
          onLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      }
    );

    await ExpoLocation.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: ExpoLocation.Accuracy.Balanced,
      distanceInterval: 50,
      deferredUpdatesInterval: 10000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'DriverApp',
        notificationBody: 'Tracking your location for active ride',
        notificationColor: '#3B82F6',
      },
    });

    return true;
  },

  async stopBackgroundLocationUpdates(): Promise<void> {
    const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRunning) {
      await ExpoLocation.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  },

  async isBackgroundLocationRunning(): Promise<boolean> {
    return TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  },

  getDistanceBetween(
    location1: Location,
    location2: Location
  ): number {
    const R = 6371;
    const dLat = toRad(location2.latitude - location1.latitude);
    const dLon = toRad(location2.longitude - location1.longitude);
    const lat1 = toRad(location1.latitude);
    const lat2 = toRad(location2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },
};

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}
