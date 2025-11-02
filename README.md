#  RideShare Carpooling App

![CI/CD Pipeline](https://github.com/Ahsaniat/Carpool-dev/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/Ahsaniat/Carpool-dev/actions/workflows/codeql.yml/badge.svg)

A comprehensive carpooling and rideshare application built with React Native (Expo) and Node.js microservices architecture.

## Features

### For Passengers
-  Smart ride matching with customizable preferences
-  Gender-based ride filtering
-  Vehicle type selection (Car/CNG)
-  "Priyo Sathi" (Friend) system for trusted carpooling
-  Multiple payment methods (Mobile Banking, Credit/Debit Cards)
-  Rating and review system
-  Safety features (Emergency contacts, SOS alerts)
-  Saved places for quick booking
-  Real-time notifications

### For Drivers
-  Trip management and history
-  Earnings tracking
-  Route optimization
-  Passenger management
-  Driver ratings

### General
-  Real-time GPS tracking
-  In-app messaging (coming soon)
-  Gender-based theming (Pink/Blue)
-  Multilingual support
-  Trip analytics

## Architecture

```
.
├── Client/
│   └── CarPoolApp/          # React Native (Expo) mobile app
│       ├── app/             # Expo Router screens
│       ├── components/      # Reusable UI components
│       └── src/             # Source files
├── Server/                  # Node.js microservices
│   ├── src/
│   │   ├── services/        # Microservices
│   │   │   ├── auth-service/
│   │   │   ├── trip-service/
│   │   │   ├── dispatch-service/
│   │   │   ├── pricing-service/
│   │   │   ├── payment-service/
│   │   │   ├── maps-service/
│   │   │   ├── profile-service/
│   │   │   └── notifications-service/
│   │   └── proto/           # gRPC protocol definitions
│   └── dist/                # Compiled output
└── .github/
    └── workflows/           # CI/CD pipelines
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- Expo CLI: `npm install -g expo-cli`
- For mobile development:
  - Android Studio (Android)
  - Xcode (iOS - macOS only)
- For server development:
  - gRPC tools

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Ahsaniat/YOUR_REPO.git
cd "RideShare Carpooling App Design (Copy) (9)"
```

2. **Install Client dependencies**
```bash
cd Client/CarPoolApp
npm install
```

3. **Install Server dependencies**
```bash
cd ../../Server
npm install
```

### Running the Application

#### Mobile App (Client)
```bash
cd Client/CarPoolApp

# Start development server
npm start

# Run on specific platform
npm run android    # Android
npm run ios        # iOS (macOS only)
npm run web        # Web browser
```

#### Backend Server
```bash
cd Server

# Build and start all microservices
npm start

# Or build only
npm run build

# Generate gRPC proto files
npm run proto:gen
```

## Development

### Project Structure

**Client (React Native + Expo)**
- `app/` - File-based routing screens
  - `(tabs)/` - Bottom tab navigation screens
  - `ride-confirmation.tsx` - Ride pool selection
  - `trip-progress.tsx` - Active trip tracking
  - `payment-summary.tsx` - Payment processing
  - etc.
- `components/` - Shared UI components
- `src/CarPoolApp/` - Additional app resources

**Server (Node.js + TypeScript + gRPC)**
- Microservices architecture
- gRPC for inter-service communication
- Protocol Buffers for data serialization

### Tech Stack

**Frontend:**
- React Native
- Expo (SDK 52)
- Expo Router (File-based routing)
- NativeWind (Tailwind CSS for React Native)
- React Native Maps
- AsyncStorage

**Backend:**
- Node.js
- TypeScript
- gRPC
- Protocol Buffers
- Concurrently (Multi-service orchestration)

## 🔄 CI/CD

Automated workflows for:
- ✅ Client build & lint
- ✅ Server build & test
- ✅ Code quality checks
- ✅ Security scanning (CodeQL)
- ✅ Dependency updates (Dependabot)
- 🔄 Expo preview builds (needs Expo token)
- 🔄 Deployment automation (needs configuration)

See [CI/CD Setup Guide](.github/SETUP.md) for configuration details.

## 📦 Building for Production

### Android APK
```bash
cd Client/CarPoolApp

# Using EAS (Recommended)
eas build --platform android --profile production

# Local build
npm run android -- --variant=release
```

### iOS
```bash
cd Client/CarPoolApp
eas build --platform ios --profile production
```

## Security

- CodeQL security analysis enabled
- Dependabot automated updates
- Security audits in CI/CD
- gRPC secure communication
- Input validation and sanitization

## Recent Updates

See [FIXED_ERRORS.md](FIXED_ERRORS.md) for detailed changelog of all fixes and improvements.

**Latest (Nov 2024):**
- ✅ Fixed navigation container runtime error
- ✅ Converted Trip Progress page to React Native
- ✅ Fixed bottom sheet modals across all screens
- ✅ Implemented toggle functionality in Settings/Notifications
- ✅ Added edit/add functionality for user data
- ✅ Improved spacing and SafeAreaView consistency
- ✅ Enhanced UI polish across all screens
- ✅ Fixed button visibility and icon positioning

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is private and proprietary.

## Team

- **Developer**: 
    - Anik
    - Raisul
    - Ome
    - Tahmid
- **Repository**: Private

## Contact

For questions or support, please contact the repository owner.

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [gRPC Documentation](https://grpc.io/docs/)
- [NativeWind](https://www.nativewind.dev/)

---

