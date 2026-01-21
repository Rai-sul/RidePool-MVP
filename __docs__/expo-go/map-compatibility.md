# Expo Go Map Compatibility

## Problem

`react-native-maps` requires native modules that are not included in Expo Go. When running the app in Expo Go, the map components crash with:

```
TurboModuleRegistry.getEnforcing(...): 'AIRMapManager' could not be found
```

## Solution

Implemented a conditional loading system that:

1. Detects Expo Go environment using `Constants.appOwnership === 'expo'`
2. Uses Static Maps API in Expo Go - Renders Google Static Maps as images with an "Open in Google Maps" button
3. Uses native react-native-maps in development builds - Full interactive map experience

## Components Updated

### StaticMapView.tsx (New)

A pure JavaScript component that uses Google Static Maps API to render maps as images. Features:
- Displays markers for pickup/dropoff locations
- Shows route paths between points
- Provides "Open in Google Maps" button for full interaction
- Works in any JavaScript environment (Expo Go, web, development builds)

### GoogleMapView.native.tsx

Updated with conditional loading:
- In Expo Go: Renders `StaticMapView`
- In development builds: Renders native `react-native-maps`

### MapView.tsx

Updated with the same conditional loading pattern.

### NativeMap.tsx

Updated with the same conditional loading pattern.

## Environment Detection

```typescript
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  const RNMaps = require('react-native-maps');
}
```

## API Key Configuration

The solution requires `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

The Static Maps API must be enabled in Google Cloud Console.

## Testing

1. Expo Go: Run `npx expo start` and scan QR code with Expo Go app
2. Development Build: Run `npx expo run:android` or `npx expo run:ios`

## References

- Expo Go Limitations: https://docs.expo.dev/workflow/using-libraries/
- Google Static Maps API: https://developers.google.com/maps/documentation/maps-static/overview
- react-native-maps: https://github.com/react-native-maps/react-native-maps
