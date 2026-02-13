#!/bin/bash

echo "=========================================="
echo "Enhanced Pool Search Verification"
echo "=========================================="
echo ""

# Check if new service exists
echo "✓ Checking new service..."
if [ -f "src/services/poolSearchResponse.service.ts" ]; then
    echo "  ✅ poolSearchResponse.service.ts created"
else
    echo "  ❌ poolSearchResponse.service.ts NOT found"
    exit 1
fi

# Check if types updated
echo ""
echo "✓ Checking type definitions..."
if grep -q "AlternativeSuggestion" "src/types/index.ts"; then
    echo "  ✅ AlternativeSuggestion type added"
else
    echo "  ❌ AlternativeSuggestion type NOT found"
    exit 1
fi

if grep -q "PoolSearchAnalytics" "src/types/index.ts"; then
    echo "  ✅ PoolSearchAnalytics type added"
else
    echo "  ❌ PoolSearchAnalytics type NOT found"
    exit 1
fi

# Check if poolMatching updated
echo ""
echo "✓ Checking poolMatching service..."
if grep -q "findMatchingPoolsEnhanced" "src/services/poolMatching.service.ts"; then
    echo "  ✅ findMatchingPoolsEnhanced method added"
else
    echo "  ❌ findMatchingPoolsEnhanced method NOT found"
    exit 1
fi

if grep -q "EnhancedPoolSearchResponse" "src/services/poolMatching.service.ts"; then
    echo "  ✅ EnhancedPoolSearchResponse type used"
else
    echo "  ❌ EnhancedPoolSearchResponse type NOT found"
    exit 1
fi

# Check if controllers updated
echo ""
echo "✓ Checking controllers..."
if grep -q "findMatchingPoolsEnhanced" "src/controllers/ride.controller.ts"; then
    echo "  ✅ RideController using enhanced search"
else
    echo "  ❌ RideController NOT using enhanced search"
    exit 1
fi

if grep -q "findMatchingPoolsEnhanced" "src/controllers/pool.controller.ts"; then
    echo "  ✅ PoolController using enhanced search"
else
    echo "  ❌ PoolController NOT using enhanced search"
    exit 1
fi

# Run TypeScript build
echo ""
echo "✓ Running TypeScript build..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ Build successful"
else
    echo "  ❌ Build failed"
    exit 1
fi

# Check compiled files
echo ""
echo "✓ Checking compiled files..."
if [ -f "dist/services/poolSearchResponse.service.js" ]; then
    echo "  ✅ poolSearchResponse.service.js compiled"
else
    echo "  ❌ poolSearchResponse.service.js NOT compiled"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ All verifications passed!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • New service: poolSearchResponse.service.ts"
echo "  • Enhanced method: findMatchingPoolsEnhanced()"
echo "  • New types: 5 additional types"
echo "  • Controllers updated: RideController, PoolController"
echo "  • Response includes:"
echo "    - Alternative suggestions"
echo "    - Search analytics"
echo "    - Nearby pools info"
echo "    - Peak hours detection"
echo ""
echo "No more empty array responses! 🎉"
echo ""
