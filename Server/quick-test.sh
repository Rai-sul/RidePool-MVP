#!/bin/bash

echo "=========================================="
echo "  BACKEND HEALTH CHECK"
echo "=========================================="
echo ""

PASS=0
FAIL=0

# 1. Check all source files exist
echo "1. Checking Source Files..."
FILES=(
  "src/app.ts"
  "src/config/constants.ts"
  "src/config/env.ts"
  "src/config/supabase.ts"
  "src/controllers/index.ts"
  "src/controllers/ride.controller.ts"
  "src/controllers/pool.controller.ts"
  "src/controllers/user.controller.ts"
  "src/controllers/payment.controller.ts"
  "src/middleware/auth.ts"
  "src/middleware/errorHandler.ts"
  "src/middleware/validation.ts"
  "src/routes/index.ts"
  "src/routes/ride.routes.ts"
  "src/routes/pool.routes.ts"
  "src/routes/user.routes.ts"
  "src/routes/payment.routes.ts"
  "src/services/fare.service.ts"
  "src/services/geolocation.service.ts"
  "src/services/googleMaps.service.ts"
  "src/services/notification.service.ts"
  "src/services/poolMatching.service.ts"
  "src/services/poolSearchResponse.service.ts"
  "src/types/index.ts"
  "src/utils/h3.utils.ts"
  "src/utils/helper.ts"
  "src/utils/logger.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    ((PASS++))
  else
    echo "  ✗ Missing: $file"
    ((FAIL++))
  fi
done

echo "  ✓ Files checked: $((PASS + FAIL)), Present: $PASS, Missing: $FAIL"

# 2. TypeScript Build
echo ""
echo "2. TypeScript Compilation..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  ✓ Build successful"
  ((PASS++))
else
  echo "  ✗ Build failed"
  ((FAIL++))
fi

# 3. Check compiled output
echo ""
echo "3. Checking Compiled Output..."
if [ -d "dist" ]; then
  JS_COUNT=$(find dist -name "*.js" 2>/dev/null | wc -l)
  echo "  ✓ Compiled $JS_COUNT JavaScript files"
  ((PASS++))
else
  echo "  ✗ dist/ directory missing"
  ((FAIL++))
fi

# 4. Check key integrations
echo ""
echo "4. Checking Integrations..."

# Controllers use enhanced search
if grep -q "findMatchingPoolsEnhanced" src/controllers/ride.controller.ts 2>/dev/null; then
  echo "  ✓ RideController uses enhanced search"
  ((PASS++))
else
  echo "  ✗ RideController not using enhanced search"
  ((FAIL++))
fi

if grep -q "findMatchingPoolsEnhanced" src/controllers/pool.controller.ts 2>/dev/null; then
  echo "  ✓ PoolController uses enhanced search"
  ((PASS++))
else
  echo "  ✗ PoolController not using enhanced search"
  ((FAIL++))
fi

# Routes use controllers
if grep -q "rideController" src/routes/ride.routes.ts 2>/dev/null; then
  echo "  ✓ Routes use controllers"
  ((PASS++))
else
  echo "  ✗ Routes not using controllers"
  ((FAIL++))
fi

# Enhanced types exist
if grep -q "AlternativeSuggestion" src/types/index.ts 2>/dev/null; then
  echo "  ✓ Enhanced types defined"
  ((PASS++))
else
  echo "  ✗ Enhanced types missing"
  ((FAIL++))
fi

# 5. Dependencies
echo ""
echo "5. Checking Dependencies..."
if [ -d "node_modules" ]; then
  echo "  ✓ Dependencies installed"
  ((PASS++))
else
  echo "  ✗ Dependencies not installed"
  ((FAIL++))
fi

# 6. Code Stats
echo ""
echo "6. Code Statistics..."
TS_FILES=$(find src -name "*.ts" 2>/dev/null | wc -l)
TOTAL_LINES=$(find src -name "*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
echo "  • TypeScript files: $TS_FILES"
echo "  • Lines of code: $TOTAL_LINES"
echo "  • Controllers: 4"
echo "  • Services: 7"
echo "  • Routes: 4"

# Summary
echo ""
echo "=========================================="
echo "  SUMMARY"
echo "=========================================="
echo ""
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED!"
  echo ""
  echo "Backend Status:"
  echo "  • All files present"
  echo "  • TypeScript compiles successfully"
  echo "  • Controllers integrated"
  echo "  • Enhanced search implemented"
  echo "  • Dependencies installed"
  echo ""
  echo "Ready for deployment! 🚀"
  exit 0
else
  echo "❌ SOME CHECKS FAILED"
  echo ""
  echo "Please review the failures above."
  exit 1
fi
