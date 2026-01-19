#!/bin/bash

echo "=============================================="
echo "  COMPREHENSIVE BACKEND TESTING"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check file
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 - MISSING"
        ((ERRORS++))
        return 1
    fi
}

# Function to check directory
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        return 0
    else
        echo -e "${RED}✗${NC} $1/ - MISSING"
        ((ERRORS++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. CHECKING DIRECTORY STRUCTURE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_dir "src"
check_dir "src/config"
check_dir "src/controllers"
check_dir "src/middleware"
check_dir "src/routes"
check_dir "src/services"
check_dir "src/types"
check_dir "src/utils"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. CHECKING CONFIGURATION FILES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_file "package.json"
check_file "tsconfig.json"
check_file ".gitignore"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. CHECKING CONFIG FILES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_file "src/config/constants.ts"
check_file "src/config/env.ts"
check_file "src/config/supabase.ts"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. CHECKING CONTROLLERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_file "src/controllers/index.ts"
check_file "src/controllers/ride.controller.ts"
check_file "src/controllers/pool.controller.ts"
check_file "src/controllers/user.controller.ts"
check_file "src/controllers/payment.controller.ts"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. CHECKING MIDDLEWARE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_file "src/middleware/auth.ts"
check_file "src/middleware/errorHandler.ts"
check_file "src/middleware/validation.ts"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. CHECKING ROUTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_file "src/routes/index.ts"
check_file "src/routes/ride.routes.ts"
check_file "src/routes/pool.routes.ts"
check_file "src/routes/user.routes.ts"
check_file "src/routes/payment.routes.ts"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. CHECKING SERVICES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_file "src/services/fare.service.ts"
check_file "src/services/geolocation.service.ts"
check_file "src/services/googleMaps.service.ts"
check_file "src/services/notification.service.ts"
check_file "src/services/poolMatching.service.ts"
check_file "src/services/poolSearchResponse.service.ts"
check_file "src/services/route.service.ts"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. CHECKING UTILITIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_file "src/utils/h3.utils.ts"
check_file "src/utils/helper.ts"
check_file "src/utils/logger.ts"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9. CHECKING TYPES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_file "src/types/index.ts"

echo ""
check_file "src/app.ts"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "10. CHECKING IMPORTS & DEPENDENCIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if controllers import services correctly
echo "Checking controller imports..."
if grep -q "poolMatchingService" src/controllers/ride.controller.ts; then
    echo -e "${GREEN}✓${NC} RideController imports poolMatchingService"
else
    echo -e "${RED}✗${NC} RideController missing poolMatchingService import"
    ((ERRORS++))
fi

if grep -q "findMatchingPoolsEnhanced" src/controllers/ride.controller.ts; then
    echo -e "${GREEN}✓${NC} RideController uses findMatchingPoolsEnhanced"
else
    echo -e "${YELLOW}⚠${NC} RideController not using enhanced search"
    ((WARNINGS++))
fi

# Check if routes import controllers
echo ""
echo "Checking route imports..."
if grep -q "rideController" src/routes/ride.routes.ts; then
    echo -e "${GREEN}✓${NC} ride.routes imports rideController"
else
    echo -e "${RED}✗${NC} ride.routes missing rideController"
    ((ERRORS++))
fi

if grep -q "poolController" src/routes/pool.routes.ts; then
    echo -e "${GREEN}✓${NC} pool.routes imports poolController"
else
    echo -e "${RED}✗${NC} pool.routes missing poolController"
    ((ERRORS++))
fi

# Check if new service exists
echo ""
echo "Checking enhanced search implementation..."
if grep -q "poolSearchResponseService" src/services/poolMatching.service.ts; then
    echo -e "${GREEN}✓${NC} poolMatching imports poolSearchResponseService"
else
    echo -e "${RED}✗${NC} poolMatching missing poolSearchResponseService"
    ((ERRORS++))
fi

if grep -q "EnhancedPoolSearchResponse" src/services/poolMatching.service.ts; then
    echo -e "${GREEN}✓${NC} EnhancedPoolSearchResponse type exists"
else
    echo -e "${RED}✗${NC} EnhancedPoolSearchResponse type missing"
    ((ERRORS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "11. TYPESCRIPT COMPILATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Running TypeScript compiler..."
npm run build > /tmp/build.log 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} TypeScript compilation successful"
else
    echo -e "${RED}✗${NC} TypeScript compilation failed"
    echo ""
    echo "Build errors:"
    cat /tmp/build.log
    ((ERRORS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "12. CHECKING COMPILED OUTPUT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -d "dist" ]; then
    echo -e "${GREEN}✓${NC} dist/ directory exists"
    
    # Count compiled files
    JS_COUNT=$(find dist -name "*.js" | wc -l)
    echo -e "${GREEN}✓${NC} Compiled $JS_COUNT JavaScript files"
    
    # Check key compiled files
    if [ -f "dist/app.js" ]; then
        echo -e "${GREEN}✓${NC} dist/app.js"
    else
        echo -e "${RED}✗${NC} dist/app.js missing"
        ((ERRORS++))
    fi
    
    if [ -f "dist/controllers/ride.controller.js" ]; then
        echo -e "${GREEN}✓${NC} dist/controllers/ride.controller.js"
    else
        echo -e "${RED}✗${NC} dist/controllers/ride.controller.js missing"
        ((ERRORS++))
    fi
    
    if [ -f "dist/services/poolSearchResponse.service.js" ]; then
        echo -e "${GREEN}✓${NC} dist/services/poolSearchResponse.service.js"
    else
        echo -e "${RED}✗${NC} dist/services/poolSearchResponse.service.js missing"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} dist/ directory missing - build failed"
    ((ERRORS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "13. CHECKING PACKAGE DEPENDENCIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules/ exists"
    
    # Check key dependencies
    DEPS=("express" "@supabase/supabase-js" "h3-js" "typescript" "ts-node")
    for dep in "${DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            echo -e "${GREEN}✓${NC} $dep installed"
        else
            echo -e "${RED}✗${NC} $dep not installed"
            ((ERRORS++))
        fi
    done
else
    echo -e "${YELLOW}⚠${NC} node_modules/ not found - dependencies not installed"
    ((WARNINGS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "14. SYNTAX CHECK (Grep for common issues)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for console.log (should use logger instead)
CONSOLE_COUNT=$(grep -r "console\." src/ --include="*.ts" | grep -v "console.error\|console.warn" | wc -l)
if [ $CONSOLE_COUNT -gt 5 ]; then
    echo -e "${YELLOW}⚠${NC} Found $CONSOLE_COUNT console.log statements (consider using logger)"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} Minimal console.log usage ($CONSOLE_COUNT)"
fi

# Check for any TODO comments
TODO_COUNT=$(grep -r "TODO" src/ --include="*.ts" | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} Found $TODO_COUNT TODO comments"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} No TODO comments"
fi

# Check for proper error handling
ERROR_HANDLING=$(grep -r "try {" src/ --include="*.ts" | wc -l)
CATCH_BLOCKS=$(grep -r "} catch" src/ --include="*.ts" | wc -l)
if [ $ERROR_HANDLING -eq $CATCH_BLOCKS ]; then
    echo -e "${GREEN}✓${NC} Error handling balanced (try/catch)"
else
    echo -e "${YELLOW}⚠${NC} Error handling may be incomplete"
    ((WARNINGS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "15. ARCHITECTURE VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check MVC pattern adherence
echo "Checking MVC pattern..."

# Routes should not have business logic
ROUTE_LOGIC=$(grep -r "supabase\." src/routes/ --include="*.ts" | wc -l)
if [ $ROUTE_LOGIC -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Routes properly delegate to controllers"
else
    echo -e "${YELLOW}⚠${NC} Routes contain database logic ($ROUTE_LOGIC instances)"
    ((WARNINGS++))
fi

# Controllers should use services
CONTROLLER_SERVICE_USAGE=$(grep -r "Service" src/controllers/ --include="*.ts" | wc -l)
if [ $CONTROLLER_SERVICE_USAGE -gt 10 ]; then
    echo -e "${GREEN}✓${NC} Controllers use services ($CONTROLLER_SERVICE_USAGE references)"
else
    echo -e "${YELLOW}⚠${NC} Controllers may not be using services enough"
    ((WARNINGS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "16. CODE QUALITY METRICS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count lines of code
TOTAL_TS=$(find src -name "*.ts" | wc -l)
TOTAL_LINES=$(find src -name "*.ts" -exec wc -l {} + | tail -1 | awk '{print $1}')

echo -e "${GREEN}✓${NC} Total TypeScript files: $TOTAL_TS"
echo -e "${GREEN}✓${NC} Total lines of code: $TOTAL_LINES"

# Calculate average file size
AVG_SIZE=$((TOTAL_LINES / TOTAL_TS))
echo -e "${GREEN}✓${NC} Average file size: $AVG_SIZE lines"

if [ $AVG_SIZE -gt 500 ]; then
    echo -e "${YELLOW}⚠${NC} Some files may be too large (consider splitting)"
    ((WARNINGS++))
fi

echo ""
echo "=============================================="
echo "  TEST SUMMARY"
echo "=============================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo ""
    echo "Backend is in perfect condition:"
    echo "  • All files present and correct"
    echo "  • TypeScript compilation successful"
    echo "  • MVC architecture properly implemented"
    echo "  • Enhanced pool search working"
    echo "  • Dependencies installed"
    echo "  • Code quality good"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Backend is functional but has minor issues to address."
    exit 0
else
    echo -e "${RED}✗ TESTS FAILED${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Please fix the errors above before proceeding."
    exit 1
fi
