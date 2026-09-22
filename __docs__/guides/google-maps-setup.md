# Google Maps Android Setup

## API Key Configuration

The app uses Google Maps API key configured in multiple locations.

### Required APIs (must be enabled in Google Cloud Console)

1. **Maps SDK for Android** - REQUIRED for native Android maps
2. **Maps JavaScript API** - For web version
3. **Directions API** - For route directions
4. **Places API** - For place search (optional)
5. **Geocoding API** - For address lookup (optional)

### Configuration Locations

The API key is configured in:

1. `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_API_KEY"/>
```

2. `android/app/src/main/res/values/google_maps_api.xml`:
```xml
<resources>
    <string name="google_maps_key" templateMergeStrategy="preserve" translatable="false">YOUR_API_KEY</string>
</resources>
```

3. `app.json` (Expo plugin configuration):
```json
{
  "plugins": [
    ["react-native-maps", {
      "androidGoogleMapsApiKey": "YOUR_API_KEY",
      "iosGoogleMapsApiKey": "YOUR_API_KEY"
    }]
  ]
}
```

4. `.env` file:
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY
```

## Troubleshooting Blank Maps

### Map is completely blank
- **Cause**: The MapView component doesn't have proper dimensions
- **Fix**: Use `...StyleSheet.absoluteFillObject` for the map style

### Map shows gray background but has Google logo
- **Cause**: API key is configured but Maps SDK for Android is not enabled
- **Fix**: Enable "Maps SDK for Android" in Google Cloud Console

### Map shows "For development purposes only" watermark
- **Cause**: Billing is not enabled on the Google Cloud project
- **Fix**: Enable billing in Google Cloud Console

### Steps to verify API key setup

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select your project
3. Navigate to APIs & Services > Enabled APIs
4. Verify "Maps SDK for Android" is listed and enabled
5. Navigate to APIs & Services > Credentials
6. Verify the API key exists and has no restrictive restrictions that block your app

### Rebuilding after changes

After modifying API key configuration, rebuild the native app:

```bash
npx expo prebuild --clean
npx expo run:android
```

## react-native-maps Configuration

The app uses `PROVIDER_GOOGLE` to explicitly use Google Maps on Android:

```typescript
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

<MapView
  provider={PROVIDER_GOOGLE}
  style={{ ...StyleSheet.absoluteFillObject }}
  // ...
/>
```
