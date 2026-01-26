# Driver App - Project Structure

## Overview
This is a ride-sharing pool driver application built with React, TypeScript, and Tailwind CSS. The app allows drivers to view available pools, accept rides, track earnings, and manage their profile.

## File Structure

```
├── App.tsx                          # Main application component with routing and state management
├── components/
│   ├── driver/                      # Driver-specific components
│   │   ├── DriverStats.tsx          # Dashboard stats (earnings, rides, online time, rating)
│   │   └── PriorityLocationDialog.tsx # Dialog for setting priority destinations
│   ├── map/                         # Map-related components
│   │   └── MapView.tsx              # Interactive map showing driver location and pools
│   ├── pool/                        # Pool/ride management components
│   │   ├── ActiveRide.tsx           # Active ride management with passenger tracking
│   │   ├── PoolCard.tsx             # Pool list item showing passengers and details
│   │   └── PoolDetailsSheet.tsx    # Bottom sheet with full pool details and route
│   ├── screens/                     # Full-screen views
│   │   ├── EarningsScreen.tsx       # Earnings breakdown and payout management
│   │   └── ProfileScreen.tsx        # Driver profile, stats, and settings
│   ├── ui/                          # Reusable UI components (ShadCN)
│   └── figma/                       # Figma-specific components
│       └── ImageWithFallback.tsx    # Protected image component
└── styles/
    └── globals.css                  # Global styles and Tailwind configuration

```

## Component Hierarchy

### App.tsx
- **Main State Management**: Handles online/offline status, pool selection, active rides, priority locations
- **Screen Navigation**: Home, Earnings, Profile
- **View Modes**: Map view and List view for pool discovery

### Driver Components (`/components/driver`)
- **DriverStats**: Displays real-time driver metrics
- **PriorityLocationDialog**: Allows drivers to set preferred destinations to prioritize matching pools

### Map Components (`/components/map`)
- **MapView**: Visual representation of driver location, available pools, and route planning

### Pool Components (`/components/pool`)
- **PoolCard**: List view of available pools with passenger details
- **PoolDetailsSheet**: Detailed view with optimal pickup/dropoff sequence
- **ActiveRide**: In-progress ride management with passenger contact and completion tracking

### Screen Components (`/components/screens`)
- **EarningsScreen**: Financial overview with daily/weekly breakdowns
- **ProfileScreen**: Driver information, vehicle details, preferences, and settings

## Key Features

1. **Pool Discovery**
   - Map view showing available pools near driver
   - List view with detailed pool information
   - Priority location filtering

2. **Ride Management**
   - Accept/reject pools
   - Track passenger pickups and dropoffs
   - Contact passengers (phone/message)
   - Mark passengers as dropped

3. **Earnings Tracking**
   - Real-time earnings display
   - Daily and weekly breakdowns
   - Payout management

4. **Driver Profile**
   - Personal and vehicle information
   - Performance statistics
   - App preferences and settings

## Data Models

### Pool
```typescript
interface Pool {
  id: string;
  customers: Customer[];
  totalEarnings: number;
  distance: number;
  estimatedTime: number;
  firstPickup: string;
  finalDestination: string;
  isPriority?: boolean;
}
```

### Customer
```typescript
interface Customer {
  id: string;
  name: string;
  pickup: string;
  destination: string;
  rating: number;
}
```

## Navigation

Bottom navigation bar with three main screens:
1. **Home**: Pool discovery and active ride management
2. **Earnings**: Financial tracking and payouts
3. **Profile**: Driver information and settings

## Styling

- **Framework**: Tailwind CSS v4.0
- **Component Library**: ShadCN UI
- **Icons**: Lucide React
- **Design**: Mobile-first responsive design

## State Management

- React useState for local component state
- Props drilling for shared state
- Toast notifications using Sonner

## Future Improvements

- Add backend integration with Supabase
- Implement real-time location tracking
- Add push notifications for new pools
- Integrate with mapping services (Google Maps/Mapbox)
- Add ride history and analytics
- Implement rating system for completed rides
