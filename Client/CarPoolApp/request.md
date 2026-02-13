# Required Actions for Android Map Fix

## Google Cloud Console - API Verification Required

The map is blank because the **Maps SDK for Android** API might not be enabled. Please verify and enable it:

### Steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Select your project (the one associated with API key `AIzaSyBIuA5jCeQ_S6DnAPdvFiJGtYEpliOT6Xc`)

3. Navigate to **APIs & Services** > **Library**

4. Search for and enable these APIs:
   - **Maps SDK for Android** ← REQUIRED
   - **Maps JavaScript API** (for web)
   - **Directions API** (for routes)

5. Navigate to **APIs & Services** > **Credentials**

6. Verify the API key has no restrictive application restrictions, or add your app's SHA-1 fingerprint:
   ```bash
   cd android && ./gradlew signingReport
   ```

7. After enabling APIs, rebuild the Android app:
   ```bash
   npx expo prebuild --clean
   npx expo run:android
   ```

## Code Changes Made

1. Changed `PROVIDER_DEFAULT` to `PROVIDER_GOOGLE` in:
   - `components/NativeMap.tsx`
   - `components/GoogleMapView.native.tsx`
   - `components/MapView.tsx`

2. Changed map styling from `flex: 1` to `...StyleSheet.absoluteFillObject` (recommended by react-native-maps)

3. Created `android/app/src/main/res/values/google_maps_api.xml` with API key

## Rebuild Commands

```bash
# Clean and rebuild native code
npx expo prebuild --clean

# Run on Android
npx expo run:android
```

If the map still shows blank after enabling APIs, check the Android logs:
```bash
adb logcat | grep -i "maps\|google\|api"
```
