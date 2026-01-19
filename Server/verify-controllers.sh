#!/bin/bash

echo "=========================================="
echo "Controller Implementation Verification"
echo "=========================================="
echo ""

# Check if controllers directory exists
echo "✓ Checking controllers directory..."
if [ -d "src/controllers" ]; then
    echo "  ✅ Controllers directory exists"
else
    echo "  ❌ Controllers directory NOT found"
    exit 1
fi

# Check controller files
echo ""
echo "✓ Checking controller files..."
controllers=(
    "ride.controller.ts"
    "pool.controller.ts"
    "user.controller.ts"
    "payment.controller.ts"
    "index.ts"
)

for controller in "${controllers[@]}"; do
    if [ -f "src/controllers/$controller" ]; then
        echo "  ✅ $controller"
    else
        echo "  ❌ $controller NOT found"
        exit 1
    fi
done

# Check if routes are updated
echo ""
echo "✓ Checking route files..."
routes=(
    "src/routes/ride.routes.ts"
    "src/routes/pool.routes.ts"
    "src/routes/user.routes.ts"
    "src/routes/payment.routes.ts"
)

for route in "${routes[@]}"; do
    if grep -q "Controller" "$route"; then
        echo "  ✅ $route uses controller"
    else
        echo "  ❌ $route NOT updated"
        exit 1
    fi
done

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
echo "✓ Checking compiled controller files..."
compiled_controllers=(
    "ride.controller.js"
    "pool.controller.js"
    "user.controller.js"
    "payment.controller.js"
    "index.js"
)

for controller in "${compiled_controllers[@]}"; do
    if [ -f "dist/controllers/$controller" ]; then
        echo "  ✅ $controller compiled"
    else
        echo "  ❌ $controller NOT compiled"
        exit 1
    fi
done

echo ""
echo "=========================================="
echo "✅ All verifications passed!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • 4 Controllers created (Ride, Pool, User, Payment)"
echo "  • 4 Routes updated to use controllers"
echo "  • TypeScript compilation successful"
echo "  • All files compiled to dist/"
echo ""
echo "Architecture: Routes → Controllers → Services → Database"
echo ""
