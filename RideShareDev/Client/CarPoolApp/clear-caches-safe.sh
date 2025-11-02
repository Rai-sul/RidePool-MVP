#!/bin/bash

echo "🧹 NUCLEAR CACHE CLEAR - Starting..."
echo ""

# Stop any running Metro/Expo processes
echo "1. Killing all Metro/Expo/Node processes..."
pkill -f "expo" || true
pkill -f "metro" || true
pkill -f "react-native" || true
pkill -f "node.*8081" || true
pkill -f "node.*8082" || true
sleep 2
echo "   ✓ Processes killed"

# Clear Metro bundler cache
echo "2. Clearing Metro bundler cache..."
rm -rf .metro 2>/dev/null || true
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/react-* 2>/dev/null || true
rm -rf /tmp/haste-* 2>/dev/null || true
echo "   ✓ Metro cache cleared"

# Clear Watchman (if installed)
echo "3. Clearing Watchman..."
watchman watch-del-all 2>/dev/null && echo "   ✓ Watchman cleared" || echo "   ⚠ Watchman not installed (that's okay)"

# Clear node_modules cache
echo "4. Clearing node_modules cache..."
rm -rf node_modules/.cache 2>/dev/null || true
echo "   ✓ node_modules cache cleared"

# Clear Babel cache
echo "5. Clearing Babel cache..."
rm -rf .babel-cache 2>/dev/null || true
echo "   ✓ Babel cache cleared"

# Clear TypeScript cache
echo "6. Clearing TypeScript cache..."
rm -rf .tsbuildinfo 2>/dev/null || true
echo "   ✓ TypeScript cache cleared"

# Clear Expo cache directories
echo "7. Clearing Expo specific caches..."
rm -rf .expo 2>/dev/null || true
rm -rf .expo-shared 2>/dev/null || true
echo "   ✓ Expo caches cleared"

# Clear npm cache
echo "8. Clearing npm cache..."
npm cache clean --force 2>/dev/null || true
echo "   ✓ npm cache cleared"

# Clear Android build cache (if exists)
echo "9. Clearing Android build cache..."
rm -rf android/.gradle 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true
echo "   ✓ Android cache cleared"

# Clear iOS build cache (if exists)  
echo "10. Clearing iOS build cache..."
rm -rf ios/build 2>/dev/null || true
rm -rf ios/Pods 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData 2>/dev/null || true
echo "   ✓ iOS cache cleared"

# Clear user-level caches
echo "11. Clearing user-level Expo caches..."
rm -rf ~/.expo/cache 2>/dev/null || true
rm -rf ~/.expo/web-cache 2>/dev/null || true
echo "   ✓ User-level caches cleared"

# Clear temp file that might be corrupted
echo "12. Clearing RideConfirmation temp file..."
rm -f components/RideConfirmation.native.tsx.tmp 2>/dev/null || true
echo "   ✓ Temp files cleared"

echo ""
echo "✅ NUCLEAR CACHE CLEAR - Complete!"
echo ""
echo "📋 Next steps:"
echo "   1. npm install (or yarn install)"
echo "   2. npx expo start --clear"
echo "   3. Press 'a' for Android or 'i' for iOS"
echo ""
