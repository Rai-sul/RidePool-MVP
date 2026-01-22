# How to Run the CarPool Project

**Last Updated**: 2026-01-21  
**Status**: Production Ready  
**Prerequisites**: Node.js 18+, npm 9+

---

## Quick Start (5 minutes)

### 1. Clone & Navigate
```bash
cd /home/raisul/RaisulFiles/CarPool-Dev/Carpool-dev
```

### 2. Setup Server

```bash
# Navigate to server
cd Server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials (see Configuration section below)
nano .env

# Build TypeScript
npm run build

# Start server in development mode
npm run dev
```

**Expected Output**:
```
[Server] Starting on port 3000...
[Server] Connected to Supabase
[Server] ✅ Server running at http://localhost:3000
```

### 3. Setup Client (New Terminal)

```bash
# Navigate to client
cd /home/raisul/RaisulFiles/CarPool-Dev/Carpool-dev/Client/CarPoolApp

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env (see Configuration section below)
nano .env

# Start Expo development server
npx expo start
```

**Expected Output**:
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

---

## Configuration

### Server Environment (.env)

**Minimum Required Variables**:

```bash
# Server
NODE_ENV=development
PORT=3000

# Supabase (REQUIRED)
SUPABASE_URL=https://amwieghvhghoregosdsg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Maps (Choose ONE)
# Option 1: Google Maps
GOOGLE_MAPS_API_KEY=AIzaSy...
ROUTING_PROVIDER=google

# Option 2: Mapbox (Free tier available)
MAPBOX_ACCESS_TOKEN=pk.eyJ1...
ROUTING_PROVIDER=mapbox

# H3 Configuration (defaults are fine)
H3_RESOLUTION_PICKUP=9
H3_RESOLUTION_DESTINATION=7
H3_SEARCH_RADIUS=2

# MVP Mode (no Redis required)
MVP_MODE=true
SKIP_REDIS=true
```

**Where to get credentials**:
- **Supabase**: Already configured (see SUPABASE_STATUS.md)
- **Google Maps API**: https://console.cloud.google.com/apis/credentials
- **Mapbox Token**: https://account.mapbox.com/access-tokens/ (FREE tier)

### Client Environment (.env)

```bash
# Backend API URL
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Mapbox (for maps display)
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...

# App Info
EXPO_PUBLIC_APP_NAME=CarPoolApp
EXPO_PUBLIC_APP_VERSION=1.0.0

# Supabase (for direct client access if needed)
EXPO_PUBLIC_SUPABASE_URL=https://amwieghvhghoregosdsg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Running the Project

### Development Mode (Recommended)

**Terminal 1 - Server**:
```bash
cd Server
npm run dev
```

**Terminal 2 - Client**:
```bash
cd Client/CarPoolApp
npx expo start
```

### Production Mode

**Server**:
```bash
cd Server
npm run build
npm start
```

**Client**:
```bash
cd Client/CarPoolApp
npx expo start --no-dev --minify
```

---

## Accessing the Application

### Web (Fastest for Testing)

After starting the client, press `w` in the Expo terminal:
```bash
› Press w │ open web
```

Browser opens at: `http://localhost:8081` or `http://localhost:19006`

### Mobile Device (Real Device)

1. Install **Expo Go** app:
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. Scan QR code shown in terminal with:
   - Android: Expo Go app
   - iOS: Camera app

3. App loads on your device

### Android Emulator

```bash
# Press 'a' in Expo terminal
› Press a │ open Android
```

**Prerequisites**: Android Studio with emulator setup

### iOS Simulator (macOS only)

```bash
# Press 'i' in Expo terminal
› Press i │ open iOS simulator
```

**Prerequisites**: Xcode with simulator

---

## Verification Checklist

### Server Health Check

```bash
# Test server is running
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-01-21T09:17:30.000Z",
  "uptime": 42.5,
  "supabase": "connected"
}
```

### Database Connection

```bash
cd Server
npm test -- supabase-connection.test.ts
```

**Expected**: `✅ 8/8 tests passing`

### API Endpoints

```bash
# Test API root
curl http://localhost:3000/api

# Test authentication endpoint
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"test"}'
```

---

## Common Issues & Solutions

### Issue 1: Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Issue 2: Supabase Connection Failed

**Error**: `Failed to connect to Supabase`

**Solution**:
```bash
# Verify environment variables
grep SUPABASE Server/.env

# Test connection
cd Server
node -e "require('./dist/config/supabase').supabaseAdmin.from('app_metadata').select('*').limit(1).then(r => console.log('✅ Connected'))"
```

### Issue 3: Module Not Found

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
# Reinstall dependencies
cd Server
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Issue 4: Expo Metro Bundler Issues

**Error**: `Metro bundler failed to start`

**Solution**:
```bash
cd Client/CarPoolApp

# Clear cache
npx expo start -c

# Or reset project
npm run reset-project
```

### Issue 5: TypeScript Errors in IDE

**Error**: `Cannot find name 'describe'`

**Solution**: Already fixed. TypeScript configuration is properly set up.
```bash
# Verify
cd Server
npx tsc --project tsconfig.test.json --noEmit
# Should show: 0 errors
```

---

## Development Workflow

### Hot Reload

Both server and client support hot reload:

**Server**: Automatically restarts on file changes (via nodemon)
**Client**: Automatically refreshes on save (via Expo)

### Running Tests

```bash
# Server - All tests
cd Server
npm test

# Server - Unit tests only
npm run test:unit

# Server - Watch mode
npm run test:watch

# Client - All tests
cd Client/CarPoolApp
npm test

# Client - With coverage
npm run test:coverage
```

### Linting

```bash
# Server
cd Server
npm run lint  # (if configured)

# Client
cd Client/CarPoolApp
npm run lint
```

---

## Environment-Specific Commands

### Local Development
```bash
# Server
cd Server
npm run dev

# Client
cd Client/CarPoolApp
npx expo start
```

### Staging/Testing
```bash
# Server
cd Server
NODE_ENV=staging npm run build && npm start

# Client
cd Client/CarPoolApp
npx expo start --no-dev
```

### Production
```bash
# Server
cd Server
NODE_ENV=production npm run build && npm start

# Client - Build for deployment
cd Client/CarPoolApp
npx expo build:web  # For web
npx expo build:android  # For Android APK
npx expo build:ios  # For iOS IPA
```

---

## Monitoring & Logs

### Server Logs

```bash
# View server logs (if using pm2)
pm2 logs ride-pool-backend

# Or tail log file
tail -f Server/logs/app.log

# View agent action log
tail -f logs/agent.log
```

### Client Logs

```bash
# In Expo terminal, press 'd' to open developer menu
# Select "Debug Remote JS" to see console in browser DevTools
```

---

## Database Management

### View Database
```bash
# Option 1: Supabase Dashboard
# Visit: https://app.supabase.com/project/amwieghvhghoregosdsg

# Option 2: Direct SQL
cd Server
node -e "
const { supabaseAdmin } = require('./dist/config/supabase');
supabaseAdmin.from('users').select('*').limit(10).then(r => console.log(r.data));
"
```

### Run Migrations
```bash
cd Server
npm run migrate
```

---

## Performance Optimization

### Server
- MVP mode uses in-memory cache (no Redis needed)
- Enable Redis for production: Set `MVP_MODE=false` and `SKIP_REDIS=false`

### Client
- Use production build for better performance
- Enable minification: `npx expo start --no-dev --minify`

---

## Security Checklist Before Running

- [ ] All secrets in `.env` files (not committed)
- [ ] `.env` files added to `.gitignore`
- [ ] Supabase RLS policies enabled (verified via tests)
- [ ] API rate limiting configured
- [ ] CORS configured properly in server

---

## Useful URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Server API | http://localhost:3000/api | Backend REST API |
| Server Health | http://localhost:3000/health | Health check |
| Client Web | http://localhost:8081 | Web version |
| Expo DevTools | http://localhost:19002 | Expo dashboard |
| Supabase Dashboard | https://app.supabase.com | Database admin |

---

## Next Steps After Running

1. **Create Test Account**:
   - Use Expo Go or web interface
   - Register with email/phone
   - Verify in Supabase dashboard

2. **Test Core Features**:
   - [ ] User registration
   - [ ] Create ride pool
   - [ ] Search pools
   - [ ] Join pool
   - [ ] View wallet balance

3. **Review Documentation**:
   - `SUPABASE_STATUS.md` - Database status
   - `__docs__/database/supabase-verification-report.md` - Full DB report
   - `__docs__/troubleshooting/` - Issue solutions

---

## Support

**Issues?** Check:
1. `__docs__/troubleshooting/` for known issues
2. `logs/agent.log` for action history
3. Server logs for runtime errors
4. Supabase dashboard for database issues

**Documentation**:
- Architecture: `__docs__/system/architecture.md`
- Database: `__docs__/database/`
- Security: `__docs__/security/`
- Operations: `__docs__/operations/`

---

**Last Verified**: 2026-01-21  
**Server Version**: 1.0.0  
**Client Version**: 1.0.0  
**Node.js**: v24.11.1  
**npm**: 11.6.2
