# App Permissions Configuration

## Overview

This document describes all permissions configured in `app.json` for the CarPoolApp.

## Android Permissions

| Permission | Purpose |
|------------|---------|
| `ACCESS_COARSE_LOCATION` | Approximate location for finding nearby rides |
| `ACCESS_FINE_LOCATION` | Precise location for ride tracking and navigation |
| `ACCESS_BACKGROUND_LOCATION` | Background location for continuous ride tracking |
| `FOREGROUND_SERVICE` | Required for location updates while app is in foreground |
| `FOREGROUND_SERVICE_LOCATION` | Foreground service specifically for location |
| `RECEIVE_BOOT_COMPLETED` | Re-schedule notifications after device restart |
| `VIBRATE` | Vibration feedback for notifications |
| `INTERNET` | Network access for API calls |
| `ACCESS_NETWORK_STATE` | Check network connectivity |

## iOS Permissions

| Permission Key | Description |
|----------------|-------------|
| `NSLocationWhenInUseUsageDescription` | Location while app is in use |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Location always and when in use |
| `NSLocationAlwaysUsageDescription` | Background location access |

### iOS Background Modes

- `location` - Background location updates
- `fetch` - Background fetch for data updates
- `remote-notification` - Push notification handling

## Plugins Configuration

### react-native-maps

Provides Google Maps integration with API keys for both platforms.

### expo-location

Configures location permission prompts with user-friendly descriptions.

### expo-notifications

Enables push notifications with:
- Custom notification color (#4285F4)
- Default notification channel
- Background remote notifications support

### expo-splash-screen

Configures app launch screen.

## Context7 References

- Library: /expo/expo (SDK 54)
- Library: /react-native-maps/react-native-maps
- Docs: https://docs.expo.dev/versions/latest/sdk/notifications
- Docs: https://github.com/expo/expo/blob/main/packages/expo-location/README.md

## Last Updated

2026-01-21T19:49:26Z
