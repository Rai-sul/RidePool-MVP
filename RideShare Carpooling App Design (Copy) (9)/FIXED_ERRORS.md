## Fixed Errors Log

This document outlines the errors encountered and the remedies applied during the development and refactoring of the application.

---

### 1. Metro Config Loading Error
*   **Problem:** `Error: Found config at .../metro.config.js that could not be loaded with Node.js.` This error indicated that the `metro.config.js` file was not being loaded correctly by Node.js, preventing the application from bundling.
*   **Remedy:** The root cause was identified as `nativewind/metro` not being able to find the Tailwind CSS configuration. This was fixed by adding `nativewind/preset` to the `tailwind.config.js` file.

---

### 2. Missing `globals.css` Import
*   **Problem:** After fixing the Metro config, the styling was gone. This was due to the `globals.css` file, which contains the Tailwind CSS directives, not being imported into the root layout of the application.
*   **Remedy:** Added `import '../styles/globals.css';` to the `app/_layout.tsx` file to ensure the global styles are applied.

---

### 3. `onComplete` is not a function (ProfileSetup)
*   **Problem:** The `ProfileSetup` component was calling an `onComplete` prop that was not being passed to it from its parent component (`app/profile-setup.tsx`). This resulted in an `Uncaught Error: onComplete is not a function`.
*   **Remedy:** Modified `app/profile-setup.tsx` to pass a `handleComplete` function as the `onComplete` prop to `ProfileSetup`. This `handleComplete` function uses `expo-router` to navigate to the `/home` route after the profile setup is complete. Also, the `UserProfile` type was moved to `contexts/GlobalContext.tsx` for better organization.

---

### 4. `onSignUp` is not a function (WelcomeScreen)
*   **Problem:** The "Signup" button on the `WelcomeScreen` was not navigating to the next page because the `onSignUp` prop was not being passed to it from its parent component (`app/(tabs)/index.tsx`).
*   **Remedy:** Modified `app/(tabs)/index.tsx` to pass a `handleSignUp` function as the `onSignUp` prop to `WelcomeScreen`. This `handleSignUp` function uses `expo-router` to navigate to the `/profile-setup` route.

---

### 5. `lucide-react` Module Not Found
*   **Problem:** `Unable to resolve "lucide-react" from "components/Icons.tsx"`. This error occurred because the `lucide-react` package was not installed in the project.
*   **Remedy:** Installed the `lucide-react` package using `npm install lucide-react`.

---

### 6. `react-native-web` Component Rendering on Native (Multiple Files)
*   **Problem:** `[Invariant Violation: View config getter callback for component 
path
` must be a function (received `undefined`). Make sure to start component names with a capital letter.]` and `[Invariant Violation: View config getter callback for component 
`div`
 must be a function (received `undefined`). Make sure to start component names with a capital letter.]`. These errors occurred in multiple files (e.g., `Icons.tsx`, `WelcomeScreen.tsx`, `RideConfirmation.tsx`, `AddMoney.tsx`, `NotificationsScreen.tsx`, `FriendsScreen.tsx`, `PaymentMethods.tsx`, `ProfileSetup.tsx`, `PromoCode.tsx`, `HomeMap.tsx`, `PaymentSummary.tsx`, `HelpSupport.tsx`, `SettingsScreen.tsx`, `ActiveRide.tsx`, `LinearGradient.tsx`, `SearchingDriver.tsx`, `DriverMatched.tsx`, `LanguageScreen.tsx`, `SavedPlaces.tsx`, `TripsScreen.tsx`, `AllTransactions.tsx`, `ProfileScreen.tsx`, `GenderPreference.tsx`, `LandingPage.tsx`, `YourRatings.tsx`, `RateReview.tsx`, `DestinationSearch.tsx`, `BottomNav.tsx`, `WalletScreen.tsx`, `SafetyCenter.tsx`, `ui/label.tsx`, `ui/input.tsx`, `ui/avatar.tsx`, `ui/button.tsx`, `ui/card.tsx`, `ui/switch.tsx`). The core issue was that components designed for `react-native-web` (which often render HTML `div` or `svg` elements) were being used directly on native platforms without proper adaptation.
*   **Remedy:** For each affected file, a platform-specific approach was implemented:
    *   The original file was renamed to `[filename].web.tsx`.
    *   A new file `[filename].native.tsx` was created.
    *   In `[filename].native.tsx`, `react-native-web` imports were replaced with `react-native`.
    *   Web-specific components like `motion.div` and `svg` were replaced with `View` components.
    *   Web-specific props like `onClick` were replaced with `onPress`.
    *   The `UserProfile`, `Pool`, and `Destination` types were moved to `contexts/GlobalContext.tsx` and their imports were updated in all relevant files.
    *   `expo-linear-gradient` was installed and used in `LinearGradient.native.tsx`.
    *   `clsx` and `tailwind-merge` were installed to resolve styling issues.
    *   **File Naming Convention:** The strategy of renaming files to `[filename].web.tsx` and creating `[filename].native.tsx` was crucial for `expo-router` and Metro to automatically pick the correct platform-specific component, ensuring that web-only components were not rendered on native platforms and vice-versa.

---

### 7. Unmatched Route (Wallet, Friends, Trips, Help & Support)
*   **Problem:** When navigating to `/wallet`, `/friends`, `/trips`, and `/help-support` from the bottom navigation bar or profile menu, the app reported "unmatched route: page couldn't be found". This happened because while the components existed, `expo-router` needed corresponding route files in the `app` directory and entries in the `Stack.Screen` list in `app/_layout.tsx`.
*   **Remedy:**
    *   Created `app/wallet.tsx`, `app/friends.tsx`, `app/trips.tsx`, `app/add-money.tsx`, `app/payment-methods.tsx`, `app/promo-code.tsx`, `app/all-transactions.tsx`, `app/personal-info.tsx`, `app/saved-places.tsx`, `app/your-ratings.tsx`, `app/settings.tsx`, `app/notifications.tsx`, `app/language.tsx`, `app/gender-preference.tsx`, `app/safety-center.tsx`, and `app/help-support.tsx` files.
    *   Each of these new route files imports the corresponding component and passes necessary props (like `onBack` or `onNavigate`) using `useRouter` for navigation.
    *   Added all these new routes to the `Stack.Screen` list in `app/_layout.tsx`.

---

### 8. Text strings must be rendered within a `<Text>` component (PromoCode.native.tsx and button.native.tsx)
*   **Problem:** Direct text strings (e.g., "Copied", "Copy") were being rendered as children of components like `Button` without being explicitly wrapped in a `<Text>` component, which is a requirement in React Native.
*   **Remedy:** Modified `PromoCode.native.tsx` and `button.native.tsx` to ensure all direct string children are wrapped within `<Text>` components. In `button.native.tsx`, a `renderChildren` helper function was implemented to handle this for single strings and arrays of children.

---

### 9. Navigation Context Error (RideConfirmation)
*   **Problem:** `[Error: Couldn't find a navigation context. Have you wrapped your app with 'NavigationContainer'?]` This error occurred when attempting to navigate from the `RideConfirmation` screen, indicating that the navigation context was not properly available.
*   **Remedy:** The root cause was identified as redundant screen definitions in the root `Stack` navigator (`src/CarPoolApp/app/_layout.tsx`) that were also part of the `(tabs)` navigator. This caused conflicts in the navigation tree. The fix involved removing these duplicate screen definitions (`home`, `wallet`, `friends`, `trips`, `profile`) from the root `Stack`. Additionally, a `searching.tsx` screen was created and added to the root `Stack` to handle the post-confirmation navigation.

---

### 10. UI Enhancements for Saved Places Screen
*   **Problem:** The "Add New Place" button on the "Saved Places" screen had a plus icon, and the overall layout lacked sufficient spacing and visual appeal. The text in the button was also getting cut off after adding padding.
*   **Remedy:**
    *   Removed the `<Plus>` icon from the "Add New Place" button in both `SavedPlaces.native.tsx` and `SavedPlaces.web.tsx`.
    *   Added `my-4` (margin-top and margin-bottom) to the card containing saved places and to the "Add New Place" button in both `SavedPlaces.native.tsx` and `SavedPlaces.web.tsx`.
    *   Replaced `py-4` (vertical padding) with `h-12` (fixed height) for the "Add New Place" button in both `SavedPlaces.native.tsx` and `SavedPlaces.web.tsx` to ensure text is not cut off while maintaining a good button size.

---

### 11. Carousel Implementation and Styling for Home Page Sections
*   **Problem:** The "Offers & Promos" and "Priyo Sathi (Close Friends)" sections on the home page displayed items vertically, one after another, lacking a modern carousel presentation and consistent styling. Text in carousel items was also wrapping. The user also requested to only show online friends in the "Priyo Sathi" section, change the carousel behavior to a linear slide, and remove the slide background.
*   **Remedy:**
    *   **"Offers & Promos" Section:**
        *   **Native (`LandingPage.native.tsx`):** Implemented a horizontal `ScrollView` with `pagingEnabled` to create a one-at-a-time carousel. The width of each promo card was set dynamically using `Dimensions.get('window').width - 48` to ensure full-width display. The `LinearGradient` was replaced with a `View` using `bg-gray-100`, and text colors were updated to `text-gray-800` and `text-gray-600`. The `<ArrowRight>` icon was removed. Text wrapping was prevented by adding `numberOfLines={1}` and `ellipsizeMode="tail"` to the title and description.
        *   **Web (`LandingPage.web.tsx`):** Integrated `embla-carousel-react` to create a one-at-a-time carousel, configured with `loop: true` and `align: 'start'`. The `LinearGradient` was replaced with a `View` using `bg-gray-100`, and text colors were updated to `text-gray-800` and `text-gray-600`. The `<ArrowRight>` icon was removed. Text wrapping was prevented by adding `className="whitespace-nowrap overflow-hidden text-ellipsis"` to the title and description.
    *   **"Priyo Sathi (Close Friends)" Section:**
        *   **Native (`LandingPage.native.tsx`):** Filtered `closeFriends` to show only items where `lastSeen === 'Online'`. Implemented a horizontal `ScrollView` (without `pagingEnabled`) for a linear slide effect. The width of each friend card was set to `w-40` with `mr-3` for spacing. The `LinearGradient` for avatars was replaced with a `View` using `bg-gray-300`, and text colors were updated to `text-gray-800` and `text-gray-500`. Text wrapping was prevented by adding `numberOfLines={1}` and `ellipsizeMode="tail"` to the friend's name.
        *   **Web (`LandingPage.web.tsx`):** Filtered `closeFriends` to show only items where `lastSeen === 'Online'`. Integrated `embla-carousel-react` for a linear slide effect (removed `loop` and `align` options). The width of each friend card was set to `w-40` with `pr-3` for spacing. The `LinearGradient` for avatars was replaced with a `View` using `bg-gray-300`, and text colors were updated to `text-gray-800` and `text-gray-500`. Text wrapping was prevented by adding `className="whitespace-nowrap overflow-hidden text-ellipsis"` to the friend's name.

---

### 12. Navigation Container Error in RideConfirmation (Runtime)
*   **Problem:** `[Error: Couldn't find a navigation context. Have you wrapped your app with 'NavigationContainer'?]` This error occurred specifically when clicking on a pool in the `RideConfirmation` screen at runtime. The error was traced to the `useRouter()` hook being called during component render within the `TouchableOpacity` that handles pool selection.
*   **Remedy:** The issue was that `useRouter()` was being implicitly called during the render cycle when clicking on pools. The fix involved ensuring that navigation actions are deferred until after the current render completes. Modified `app/ride-confirmation.tsx` to use `requestAnimationFrame()` to wrap the router navigation call, ensuring it executes after the render cycle completes. Also corrected a typo in the state setter (`set SelectedPool` → `setSelectedPool`).

---

### 13. Trip Progress Page - React Native Web Incompatibility
*   **Problem:** `[Invariant Violation: View config getter callback for component 'div' must be a function (received 'undefined')]` This error occurred when navigating to the Trip Progress page after driver search. The component was using web-specific JSX elements like `<div>`.
*   **Remedy:** Created `trip-progress.native.tsx` and converted all web-specific elements to React Native components:
    *   Replaced `<div>` with `<View>`
    *   Replaced `onClick` with `onPress`
    *   Removed web-specific `motion` components
    *   Wrapped all text strings in `<Text>` components
    *   Added proper imports from `react-native`
    *   Implemented native-compatible progress indicator component

---

### 14. UI Improvements Across Multiple Screens

#### 14.1. Driver Searching Screen - Cancel Button Position
*   **Problem:** The "Cancel" button in the searching driver page was partially hidden under the bottom navigation bar.
*   **Remedy:** Added `mb-20` (bottom margin) to the cancel button in `SearchingDriver.native.tsx` to ensure it appears above the navigation bar.

#### 14.2. Ride Confirmation Screen - Spacing and Layout Issues
*   **Problem:** Multiple UI issues including:
    *   "Rideshare with female" and "Regular rideshare" buttons were jam-packed without margins
    *   Vehicle type selection buttons (Car/CNG) lacked spacing
    *   Screen lacked `SafeAreaView` causing content to hit the notification bar
    *   Subtitle text under map markers wrapped vertically instead of staying horizontal
    *   Pickup/Dropoff text boxes needed better layout and margins
*   **Remedy:**
    *   Added `gap-4` between ride type buttons and vehicle type buttons
    *   Wrapped the entire screen content in `SafeAreaView` from `react-native-safe-area-context`
    *   Added `numberOfLines={1}` to marker subtitle text to prevent wrapping
    *   Added horizontal margins (`mx-4`) to text input boxes
    *   Restructured Pickup/Dropoff layout to be on the same line: pickup on left, dropoff on right

#### 14.3. Bottom Sheet Modal Issues
*   **Problem:** Bottom sheet modals in Destination Search and Past Trips screens didn't open fully. The keyboard covered input fields when typing in "Where to?" search box.
*   **Remedy:**
    *   Modified modal structure to use fixed height approach:
        *   Added `TouchableOpacity` with `flex-1` to fill space above the sheet
        *   Changed from `maxHeight: '90%'` to `h-[90%]` for consistent height
        *   Removed `justify-end` positioning
    *   Added `KeyboardAvoidingView` wrapper to handle keyboard appearance
    *   Applied this fix pattern to `DestinationSearch.native.tsx` and trip modals

#### 14.4. Trips Screen - Report Issue Button
*   **Problem:** The "Report an Issue" button in the trips section was hidden behind the bottom navigation bar and lacked proper padding and margin.
*   **Remedy:** Added `mb-20` bottom margin and proper padding (`px-4 py-3`) to the button in `TripsScreen.native.tsx`.

#### 14.5. Payment Summary and Confirmation Pages
*   **Problem:** 
    *   Top bar showed "payment-summary" instead of "Payment Summary" and "trip-progress" instead of "Trip Progress"
    *   Payment confirmation button went under bottom navigation bar
    *   "Add tip" button text was wrapping
    *   Components lacked proper margins
*   **Remedy:**
    *   Updated header titles to use proper capitalization with spaces
    *   Added `mb-20` to payment button for bottom navigation clearance
    *   Added `numberOfLines={1}` to prevent text wrapping in buttons
    *   Added horizontal margins (`mx-4`) to all major components in payment screens

---

### 15. Rating Modal Not Displaying Content
*   **Problem:** After clicking "Rate Your Trip" on the trip progress page, the rating modal appeared but showed no content (no overall rating, driver rating, or co-rider ratings).
*   **Remedy:** Applied the same bottom sheet fix pattern as used for Destination Search:
    *   Restructured modal layout in `RatingModal.native.tsx`
    *   Changed from `justify-end` with `maxHeight` to fixed height approach
    *   Added dismissible `TouchableOpacity` background with `flex-1`
    *   Set content container to `h-[90%]` for consistent height
    *   This made all rating content visible: overall rating stars, driver rating section, and co-rider ratings with friend request icons

---

### 16. Friends Screen and Profile Section Improvements

#### 16.1. See All Button Navigation
*   **Problem:** The "See All" button in the "Priyo Sathi" section on the home screen showed "unmatched route" error instead of navigating to the Friends screen.
*   **Remedy:** Corrected the navigation route from typo to proper `/friends` route in `LandingPage.native.tsx`.

#### 16.2. Friend Icon Consistency
*   **Problem:** Friend icons in the Friends screen used too many colors and didn't match the minimal style of icons in the home screen's "Priyo Sathi" section.
*   **Remedy:** Updated friend avatar styling in `FriendsScreen.native.tsx`:
    *   Replaced colorful `LinearGradient` backgrounds with simple `bg-gray-300`
    *   Reduced border radius for more compact look
    *   Applied consistent gray color scheme matching home screen

#### 16.3. Profile Edit Features
*   **Problem:** 
    *   Edit buttons in "Saved Places" and "Personal Info" opened blank forms instead of loading existing data for editing
    *   Edit fields and buttons were jam-packed without proper margins
    *   Add Place button didn't add new editable forms
*   **Remedy:**
    *   Implemented proper edit mode in `SavedPlaces.native.tsx`:
        *   Added state to track editing mode and selected place
        *   Pre-populated form fields with existing place data when editing
        *   Added ability to add new blank forms with "Add Place" button
        *   Introduced proper margins (horizontal `mx-4` for form fields)
        *   Stacked form fields horizontally with proper spacing
    *   Applied same pattern to `PersonalInfo.native.tsx`
    *   Ensured gender-based theming applied to all buttons globally

---

### 17. Safety Center Enhancements
*   **Problem:** Emergency contacts section lacked proper add/edit functionality similar to Saved Places. Components needed better spacing.
*   **Remedy:**
    *   Implemented add/edit buttons for emergency contacts in `SafetyCenter.native.tsx`
    *   Added editable form fields with same philosophy as Saved Places
    *   Added bottom margin to "Emergency Alert" section
    *   Added top margin to "Safety Tips" section
    *   Ensured proper spacing and gender-based button theming

---

### 18. Toggle Functionality Across Settings Screens

#### 18.1. Settings, Notifications, and Gender Preferences Toggle Buttons
*   **Problem:** Bullet-point style toggle buttons in Settings, Notifications, and Gender Preferences screens weren't functional - they didn't toggle on/off when pressed.
*   **Remedy:**
    *   Replaced non-functional bullets with custom toggle buttons
    *   Implemented state management for each toggle option
    *   Created custom bullet-style toggle component:
        *   OFF state: Empty circle with thin black border
        *   ON state: Black thin circle with black dot inside
        *   Click anywhere in the option row to toggle (not just the bullet)
    *   Fixed issue where paired options toggled together (e.g., "Driver arriving" and "Ride completed" were coupled)
    *   Reduced button radius slightly for better appearance
    *   Applied fixes to `SettingsScreen.native.tsx`, `NotificationsScreen.native.tsx`, and `GenderPreference.native.tsx`

#### 18.2. Initial Switch Implementation Error
*   **Problem:** First attempt to add toggle functionality resulted in `[ReferenceError: Property 'Switch' doesn't exist]` error.
*   **Remedy:** Corrected implementation by using custom toggle component instead of importing non-existent Switch component.

---

### 19. Wallet - Payment Methods Screen

#### 19.1. Add Payment Method Functionality
*   **Problem:** "Add Payment Method" button in the Wallet's Payment Methods screen didn't work. The screen also lacked proper form fields for credit card and mobile banking options.
*   **Remedy:**
    *   Implemented tabbed interface in `PaymentMethods.native.tsx`:
        *   Separate tabs for Credit/Debit Card and Mobile Banking
        *   Dynamic form fields based on selected tab
        *   Credit Card fields: Card number, Cardholder name, Expiry date, CVV
        *   Mobile Banking fields: Provider selection, Phone number, PIN
    *   Added "Add New Payment Method" button functionality
    *   Ensured gender-based theming for all buttons
    *   Added proper spacing and margins throughout

#### 19.2. Available Balance Card Width
*   **Problem:** The "Available Balance" card at the top of the Wallet screen didn't fill the full width like the Search and Add Friends card in the Friends section.
*   **Remedy:** Modified card styling in `WalletScreen.native.tsx` to extend full width in both directions, matching the background card style of the Friends screen.

---

### 20. All Ratings Screen Name Change
*   **Problem:** The ratings screen was titled "Your Ratings" but should show all ratings, not just user's own ratings.
*   **Remedy:** Changed the screen name from "Your Ratings" to "All Ratings" in both the navigation header and component title in `YourRatings.native.tsx`.

---

### 21. Remove Debug Console Log
*   **Problem:** A debug log statement `LOG  ✅ useRouter() succeeded: {...}` was cluttering the console output.
*   **Remedy:** Removed the `console.log('✅ useRouter() succeeded:', router);` statement from `app/ride-confirmation.tsx`.

---

### 22. Icon Styling Improvements

#### 22.1. Friend Request Icon Background
*   **Problem:** Friend request icon in the Rating Modal had an unnecessary round background box that looked cluttered.
*   **Remedy:** Removed background styling (`w-8 h-8 bg-white rounded-full border border-gray-200`) from the `UserPlus` icon TouchableOpacity in `RatingModal.native.tsx`. Increased icon size slightly from `w-4 h-4` to `w-5 h-5` for better visibility.

#### 22.2. Search Icon Position in Destination Search
*   **Problem:** The search icon in the Destination Search modal was positioned outside the search input box instead of inside it on the left.
*   **Remedy:** Wrapped search icon in a container View with proper positioning in `DestinationSearch.native.tsx`:
    *   Used `absolute left-3 top-0 bottom-0` for full height positioning
    *   Added `justify-center` to vertically center the icon
    *   Added `pointerEvents: 'none'` to allow touches to pass through to the input
    *   Added `z-10` to ensure icon appears above input background

---

### 23. Button Text Color Visibility
*   **Problem:** "RideShare with Female" button text was white when not selected, causing it to blend with the light pink background and become unreadable.
*   **Remedy:** Modified button implementation in `RideConfirmation.native.tsx`:
    *   Wrapped button text in explicit `<Text>` components
    *   Applied conditional styling based on selection state
    *   Selected state: White text on colored background
    *   Unselected state: Dark gray/black text (gray-900) on light background
    *   Applied consistent pattern to both "RideShare with Female" (pink theme) and "Regular RideShare" (blue theme) buttons

---

### 24. Chat Button in Friends Screen
*   **Problem:** The user requested a chat button icon to be added for each friend in the Friends screen, replacing the "Online/Last seen" text status.
*   **Remedy:** Modified `FriendsScreen.native.tsx`:
    *   Added `MessageCircle` icon import from Icons
    *   Replaced the status text display with a `TouchableOpacity` containing the `MessageCircle` icon
    *   Icon styling: `w-5 h-5 text-gray-600` (no background, just the icon)
    *   Added placeholder `onPress` handler with console log for future chat navigation
    *   Maintained proper spacing and alignment in friend card layout

---
