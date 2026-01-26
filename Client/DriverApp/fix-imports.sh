#!/bin/bash
# Fix all versioned imports

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  -e 's/@radix-ui\/react-accordion@1\.2\.3/@radix-ui\/react-accordion/g' \
  -e 's/@radix-ui\/react-alert-dialog@1\.1\.6/@radix-ui\/react-alert-dialog/g' \
  -e 's/@radix-ui\/react-aspect-ratio@1\.1\.2/@radix-ui\/react-aspect-ratio/g' \
  -e 's/@radix-ui\/react-avatar@1\.1\.3/@radix-ui\/react-avatar/g' \
  -e 's/@radix-ui\/react-checkbox@1\.1\.4/@radix-ui\/react-checkbox/g' \
  -e 's/@radix-ui\/react-collapsible@1\.1\.3/@radix-ui\/react-collapsible/g' \
  -e 's/@radix-ui\/react-context-menu@2\.2\.6/@radix-ui\/react-context-menu/g' \
  -e 's/@radix-ui\/react-dialog@1\.1\.6/@radix-ui\/react-dialog/g' \
  -e 's/@radix-ui\/react-dropdown-menu@2\.1\.6/@radix-ui\/react-dropdown-menu/g' \
  -e 's/@radix-ui\/react-hover-card@1\.1\.6/@radix-ui\/react-hover-card/g' \
  -e 's/@radix-ui\/react-label@2\.1\.2/@radix-ui\/react-label/g' \
  -e 's/@radix-ui\/react-menubar@1\.1\.6/@radix-ui\/react-menubar/g' \
  -e 's/@radix-ui\/react-navigation-menu@1\.2\.5/@radix-ui\/react-navigation-menu/g' \
  -e 's/@radix-ui\/react-popover@1\.1\.6/@radix-ui\/react-popover/g' \
  -e 's/@radix-ui\/react-progress@1\.1\.2/@radix-ui\/react-progress/g' \
  -e 's/@radix-ui\/react-radio-group@1\.2\.3/@radix-ui\/react-radio-group/g' \
  -e 's/@radix-ui\/react-scroll-area@1\.2\.3/@radix-ui\/react-scroll-area/g' \
  -e 's/@radix-ui\/react-select@2\.1\.6/@radix-ui\/react-select/g' \
  -e 's/@radix-ui\/react-separator@1\.1\.2/@radix-ui\/react-separator/g' \
  -e 's/@radix-ui\/react-slider@1\.2\.3/@radix-ui\/react-slider/g' \
  -e 's/@radix-ui\/react-slot@1\.1\.2/@radix-ui\/react-slot/g' \
  -e 's/@radix-ui\/react-switch@1\.1\.3/@radix-ui\/react-switch/g' \
  -e 's/@radix-ui\/react-tabs@1\.1\.3/@radix-ui\/react-tabs/g' \
  -e 's/@radix-ui\/react-toggle@1\.1\.2/@radix-ui\/react-toggle/g' \
  -e 's/@radix-ui\/react-toggle-group@1\.1\.2/@radix-ui\/react-toggle-group/g' \
  -e 's/@radix-ui\/react-tooltip@1\.1\.8/@radix-ui\/react-tooltip/g' \
  -e 's/class-variance-authority@0\.7\.1/class-variance-authority/g' \
  -e 's/cmdk@1\.1\.1/cmdk/g' \
  -e 's/embla-carousel-react@8\.6\.0/embla-carousel-react/g' \
  -e 's/input-otp@1\.4\.2/input-otp/g' \
  -e 's/lucide-react@0\.487\.0/lucide-react/g' \
  -e 's/next-themes@0\.4\.6/next-themes/g' \
  -e 's/react-day-picker@8\.10\.1/react-day-picker/g' \
  -e 's/react-hook-form@7\.55\.0/react-hook-form/g' \
  -e 's/react-resizable-panels@2\.1\.7/react-resizable-panels/g' \
  -e 's/recharts@2\.15\.2/recharts/g' \
  -e 's/sonner@2\.0\.3/sonner/g' \
  -e 's/vaul@1\.1\.2/vaul/g' \
  {} \;

echo "✅ Fixed all versioned imports"
