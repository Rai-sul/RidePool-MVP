#!/bin/bash

echo "🧹 NUCLEAR CACHE CLEAR - Starting..."
echo ""

# Stop any running Metro/Expo processes
echo "1. Killing all Metro/Expo/Node processes..."
pkill -f "expo" || true
pkill -f "metro" || true
pkill -f "react-native" || true
pkill -f "node.*8081" || true
sleep 2

# Clear Expo cache
echo "2. Clearing Expo cache..."
npx expo start --clear || true
sleep 1
pkill -f "expo" || true

# Clear Metro bundler cache
echo "3. Clearing Metro bundler cache..."
rm -rf .metro || true
rm -rf $TMPDIR/metro-* || true
rm -rf $TMPDIR/react-* || true
rm -rf $TMPDIR/haste-* || true

# Clear Watchman (if installed)
echo "4. Clearing Watchman..."
watchman watch-del-all 2>/dev/null || echo "Watchman not installed (that's okay)"

# Clear node_modules cache
echo "5. Clearing node_modules cache..."
rm -rf node_modules/.cache || true

# Clear Babel cache
echo "6. Clearing Babel cache..."
rm -rf .babel-cache || true

# Clear TypeScript cache
echo "7. Clearing TypeScript cache..."
rm -rf .tsbuildinfo || true

# Clear Expo cache directories
echo "8. Clearing Expo specific caches..."
rm -rf .expo || true
rm -rf .expo-shared || true

# Clear npm/yarn cache for this project
echo "9. Clearing package manager cache..."
npm cache clean --force 2>/dev/null || true

# Clear Android build cache (if exists)
echo "10. Clearing Android build cache..."
rm -rf android/.gradle 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true

# Clear iOS build cache (if exists)  
echo "11. Clearing iOS build cache..."
rm -rf ios/build 2>/dev/null || true
rm -rf ios/Pods 2>/dev/null || true

# Clear system temp caches
echo "12. Clearing system temp caches..."
rm -rf /tmp/react-* || true
rm -rf /tmp/metro-* || true
rm -rf /tmp/haste-* || true

# Clear user-level caches
echo "13. Clearing user-level Expo caches..."
rm -rf ~/.expo/cache || true
rm -rf ~/.expo/web-cache || true

echo ""
echo "✅ NUCLEAR CACHE CLEAR - Complete!"
echo ""
echo "Now run: npm install && npx expo start --clear"
