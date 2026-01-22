# CarPoolApp Frontend Implementation

## Overview
Complete React Native (Expo) frontend implementation with proper API integration, state management, and hooks.

## Architecture
- **MVC Architecture**: Follows Model-View-Controller pattern
- **Separation of Concerns**: API layer, Service layer, Hooks, Components
- **State Management**: Context API + Custom Hooks
- **Type Safety**: Full TypeScript implementation

## Directory Structure

```
Client/CarPoolApp/
├── config/
│   └── api.config.ts          # API endpoints configuration
├── services/
│   ├── auth.service.ts        # Authentication services
│   ├── ride.service.ts        # Ride management services
│   ├── pool.service.ts        # Pool management services
│   ├── payment.service.ts     # Payment & wallet services
│   ├── messaging.service.ts   # Messaging services
│   ├── safety.service.ts      # Safety features services
│   └── driver.service.ts      # Driver-specific services
├── hooks/
│   ├── useAuth.ts            # Authentication hook
│   ├── useRides.ts           # Rides management hook
│   ├── usePools.ts           # Pools management hook
│   ├── usePayments.ts        # Payments management hook
│   ├── useMessaging.ts       # Messaging hook
│   └── useLocation.ts        # Location tracking hook
├── contexts/
│   ├── AuthContext.tsx       # Global auth state
│   └── GlobalContext.tsx     # Global app state
├── types/
│   └── index.ts              # TypeScript type definitions
├── utils/
│   └── apiClient.ts          # HTTP client with retry logic
└── app/
    └── rides-list.tsx        # Example screen implementation
```

## Features Implemented

### 1. API Client (`utils/apiClient.ts`)
- ✅ Automatic token management
- ✅ Request retry logic (3 attempts)
- ✅ Timeout handling (30s default)
- ✅ Error handling with custom ApiError class
- ✅ Automatic token refresh on 401

### 2. Service Layer
All API endpoints wrapped in clean service functions:
- ✅ Authentication (login, register, logout, password reset)
- ✅ User management (profile, preferences, location)
- ✅ Ride management (create, search, start, complete, cancel)
- ✅ Pool management (create, join, leave, search)
- ✅ Payment & Wallet (methods, transactions, balance)
- ✅ Messaging (send, conversations, mark read)
- ✅ Safety (incidents, emergency contacts, trip sharing)
- ✅ Driver features (register, earnings, trips)

### 3. Custom Hooks
Reusable hooks with complete state management:
- ✅ `useAuth` - Authentication state and actions
- ✅ `useRides` - Ride management with loading/error states
- ✅ `usePools` - Pool management
- ✅ `usePayments` - Payment methods and wallet
- ✅ `useMessaging` - Real-time messaging
- ✅ `useLocation` - GPS location tracking with permissions

### 4. Context Providers
- ✅ `AuthContext` - Global authentication state
- ✅ `AuthProvider` - Auto-loads user on app start
- ✅ Integrated into app layout

### 5. Type Safety
Complete TypeScript definitions for:
- ✅ User, Ride, Pool, Driver, Payment, Message entities
- ✅ API responses with generic types
- ✅ Paginated responses
- ✅ Location data

## Setup Instructions

### 1. Install Dependencies
```bash
cd /home/ahsan/Work/Project/gemini/RideShareDev/Client/CarPoolApp
npm install
```

### 2. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
EXPO_PUBLIC_API_URL=http://your-server-ip:5000/api
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 3. Run the App
```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

## Usage Examples

### Authentication
```typescript
import { useAuthContext } from '../contexts/AuthContext';

function LoginScreen() {
  const { login, loading, error } = useAuthContext();

  const handleLogin = async () => {
    const result = await login('user@example.com', 'password');
    if (result.success) {
      // Navigate to home
    } else {
      alert(result.error);
    }
  };

  return (
    <View>
      {/* Login UI */}
      <Button onPress={handleLogin} disabled={loading} />
      {error && <Text>{error}</Text>}
    </View>
  );
}
```

### Ride Management
```typescript
import { useRides } from '../hooks/useRides';

function RideScreen() {
  const { rides, loading, createRide, fetchRides } = useRides();

  useEffect(() => {
    fetchRides();
  }, []);

  const handleCreateRide = async () => {
    const result = await createRide({
      pickup_location: { latitude: 28.6139, longitude: 77.2090 },
      dropoff_location: { latitude: 28.5355, longitude: 77.3910 },
    });
    if (result.success) {
      console.log('Ride created:', result.data);
    }
  };

  return (
    <View>
      {rides.map(ride => (
        <RideCard key={ride.id} ride={ride} />
      ))}
    </View>
  );
}
```

### Location Tracking
```typescript
import { useLocation } from '../hooks/useLocation';

function MapScreen() {
  const { location, loading, permissionGranted, watchLocation } = useLocation();

  useEffect(() => {
    if (permissionGranted) {
      const subscription = watchLocation((loc) => {
        console.log('Location updated:', loc);
      });

      return () => {
        subscription?.then(sub => sub.remove());
      };
    }
  }, [permissionGranted]);

  return (
    <View>
      {location && (
        <Text>
          Current: {location.latitude}, {location.longitude}
        </Text>
      )}
    </View>
  );
}
```

### Payment Management
```typescript
import { usePayments } from '../hooks/usePayments';

function WalletScreen() {
  const { balance, fetchBalance, addFunds } = usePayments();

  useEffect(() => {
    fetchBalance();
  }, []);

  const handleAddFunds = async () => {
    const result = await addFunds(500, 'payment_method_id');
    if (result.success) {
      alert('Funds added successfully');
    }
  };

  return (
    <View>
      <Text>Balance: ₹{balance}</Text>
      <Button onPress={handleAddFunds} />
    </View>
  );
}
```

## API Integration

### Base URL Configuration
The API base URL is configured in `config/api.config.ts`:
```typescript
BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api'
```

### Available Endpoints
All endpoints are defined in `config/api.config.ts`:
- Authentication: `/auth/*`
- Users: `/users/*`
- Rides: `/rides/*`
- Pools: `/pools/*`
- Drivers: `/drivers/*`
- Payments: `/payments/*`
- Wallet: `/wallet/*`
- Messages: `/messages/*`
- Safety: `/safety/*`
- Retention: `/retention/*`

## State Management Flow

```
User Action
    ↓
Custom Hook (useRides, useAuth, etc.)
    ↓
Service Layer (ride.service.ts, etc.)
    ↓
API Client (apiClient.ts)
    ↓
HTTP Request to Backend API
    ↓
Response Processing
    ↓
State Update in Hook
    ↓
UI Re-render
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Network Errors**: Automatic retry with exponential backoff
2. **Timeout Errors**: 30s timeout with retry
3. **Authentication Errors**: Auto-logout on 401, token refresh
4. **Validation Errors**: Passed to UI via error state
5. **Server Errors**: Retry on 5xx errors

## Security Features

- ✅ Token stored in AsyncStorage (secure)
- ✅ Automatic token injection in headers
- ✅ Token removal on logout/401
- ✅ No secrets in code (env variables)
- ✅ HTTPS support ready

## Performance Optimizations

- ✅ Request caching in AsyncStorage
- ✅ Lazy loading with pagination support
- ✅ Memoized callbacks in hooks
- ✅ Optimistic UI updates
- ✅ Pull-to-refresh functionality

## Testing

### Manual Testing with Example Screen
```bash
# The app includes rides-list.tsx as an example
# Navigate to it to test the full flow:
# 1. Authentication
# 2. Data fetching
# 3. Error handling
# 4. Loading states
# 5. Refresh functionality
```

### Integration with Backend
```bash
# Ensure backend is running on port 5000
cd /home/ahsan/Work/Project/gemini/RideShareDev/Server
npm run dev

# Update frontend .env
EXPO_PUBLIC_API_URL=http://localhost:5000/api

# Start frontend
cd /home/ahsan/Work/Project/gemini/RideShareDev/Client/CarPoolApp
npm start
```

## Map Integration (Ready for Implementation)

The app is ready for map integration with:
- Google Maps (API key in .env)

### Recommended packages:
```bash
npm install react-native-maps
```

## WebSocket Support (Ready for Implementation)

For real-time features, the architecture supports:
```typescript
// In services or hooks
import io from 'socket.io-client';

const socket = io(API_CONFIG.BASE_URL);

socket.on('ride-update', (data) => {
  // Handle real-time updates
});
```

## Next Steps

1. **Map Integration**: Implement map views with Google Maps
2. **WebSocket**: Add real-time ride tracking and messaging
3. **Push Notifications**: Implement expo-notifications
4. **Offline Support**: Add offline-first architecture
5. **Testing**: Add Jest tests for hooks and services
6. **UI Polish**: Enhance existing screens with animations

## Troubleshooting

### Common Issues

**1. API Connection Failed**
```bash
# Check backend is running
curl http://localhost:5000/api/health

# Check firewall/network
# Update .env with correct IP
```

**2. Location Permission Denied**
```typescript
// Check expo-location is installed
// Request permissions properly in useLocation hook
```

**3. Authentication Fails**
```bash
# Clear AsyncStorage
# Check token format in backend
# Verify API endpoints match
```

## Dependencies

Core packages:
- `expo` - React Native framework
- `expo-router` - File-based routing
- `@react-native-async-storage/async-storage` - Local storage
- `expo-location` - GPS location
- `typescript` - Type safety

## Contributing

Follow these guidelines:
1. Use TypeScript for all new code
2. Create services for new API endpoints
3. Create custom hooks for state management
4. Add proper error handling
5. Document complex logic

## License

[Your License Here]

## Support

For issues or questions:
- Backend API: See Server/README.md
- Frontend: Check this file
- General: See main project README.md
