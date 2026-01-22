# Step-by-Step Visual Guide to Run CarPool

## Step 1: Verify Environment Setup

### Check Your Credentials
```bash
# 1. Check Server environment
cat Server/.env | grep -E "SUPABASE|PORT"

# Expected output:
# PORT=3000
# SUPABASE_URL=https://amwieghvhghoregosdsg.supabase.co
# SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **If you see the values above**, continue to Step 2  
❌ **If not**, copy `.env.example` to `.env` and fill in values

---

## Step 2: Install Dependencies (First Time Only)

```bash
# Terminal 1 - Server
cd /home/raisul/RaisulFiles/CarPool-Dev/Carpool-dev/Server
npm install
npm run build

# Terminal 2 - Client (open new terminal)
cd /home/raisul/RaisulFiles/CarPool-Dev/Carpool-dev/Client/CarPoolApp
npm install
```

**Time**: 3-5 minutes  
**Progress**: You'll see packages installing

---

## Step 3: Start the Server

```bash
# In Terminal 1 (Server)
cd /home/raisul/RaisulFiles/CarPool-Dev/Carpool-dev/Server
npm run dev
```

### Expected Output (Server Running):
```
> ride-pool-backend@1.0.0 dev
> nodemon src/app.ts

[nodemon] 3.1.11
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): src/**/*
[nodemon] watching extensions: ts,json
[nodemon] starting `ts-node src/app.ts`

[Server] Environment: development
[Server] MVP Mode: true
[Server] Port: 3000
[Server] ✅ Connected to Supabase
[Server] 🚀 Server running at http://localhost:3000
[Server] 📋 API docs at http://localhost:3000/api
```

✅ **Server is ready when you see**: `Server running at http://localhost:3000`

**Keep this terminal open** - don't close it!

---

## Step 4: Verify Server is Working

Open a **third terminal** to test:

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-01-21T09:30:00.000Z",
  "uptime": 5.2,
  "supabase": "connected"
}
```

✅ If you see this JSON, your server is working!

---

## Step 5: Start the Client

```bash
# In Terminal 2 (Client)
cd /home/raisul/RaisulFiles/CarPool-Dev/Carpool-dev/Client/CarPoolApp
npx expo start
```

### Expected Output (Client Running):
```
Starting Metro Bundler
› Metro waiting on exp://192.168.1.100:8081

› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press j │ open debugger
› Press r │ reload app
› Press m │ toggle menu
› Press o │ open project code in your editor

› Press ? │ show all commands

Logs for your project will appear below.
```

✅ **Client is ready when you see the QR code**

---

## Step 6: Open the App

You have 3 options:

### Option A: Web Browser (Easiest & Fastest)

1. In Terminal 2, press **`w`**
2. Browser opens automatically at `http://localhost:8081`
3. You should see the CarPool app loading

**Screenshot**: You'll see the app splash screen, then login page

### Option B: Mobile Device (Real Testing)

1. Install **Expo Go** on your phone:
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Open Expo Go app

3. Scan the QR code shown in Terminal 2:
   - Android: Use Expo Go's built-in scanner
   - iOS: Use iPhone Camera app

4. App loads on your phone

### Option C: Android Emulator

1. Make sure Android Studio is installed with an emulator
2. Start an emulator (or it will start automatically)
3. In Terminal 2, press **`a`**
4. App opens in emulator

---

## Step 7: Explore the Running App

### What You'll See:

1. **Landing Page** (if not logged in)
   - "Welcome to CarPool" screen
   - Sign up / Login buttons

2. **Login/Register**
   - Email/phone input
   - OTP verification (via Supabase Auth)

3. **Home Screen** (after login)
   - Map view with your location
   - "Find a Ride" button
   - "Offer a Ride" button

4. **Pool Search**
   - Enter pickup location
   - Enter destination
   - See available pools
   - Join a pool

---

## Step 8: Test Basic Functionality

### Create a Test User

1. Click "Sign Up"
2. Enter test email: `test@example.com`
3. Check Supabase dashboard for verification (in development, you can manually verify)
4. Complete profile setup

### Search for Pools

1. Enter pickup: "Dhaka University"
2. Enter destination: "Mirpur DOHS"
3. Click "Search Pools"
4. You'll see: "No pools found" (expected - no data yet)

### Create a Pool

1. Click "Create Pool"
2. Set destination
3. Set vehicle type (Bike/Car/CNG)
4. Set max passengers
5. Submit

---

## Monitoring & Logs

### Server Logs (Terminal 1)
You'll see real-time logs:
```
[Server] POST /api/pools/search - 200 - 45ms
[Server] User: abc123 searching for pools
[Server] Found 0 matching pools
```

### Client Logs (Terminal 2)
```
LOG  [API] GET /api/users/profile - 200
LOG  [Navigation] Home -> Search
```

### Database Logs
Visit Supabase dashboard to see real-time database activity:
https://app.supabase.com/project/amwieghvhghoregosdsg/editor

---

## Stopping the Application

### Stop Server (Terminal 1)
Press: **`Ctrl + C`**

### Stop Client (Terminal 2)
Press: **`Ctrl + C`**

### Clean Restart
```bash
# Server
cd Server
npm run build
npm run dev

# Client
cd Client/CarPoolApp
npx expo start -c  # -c clears cache
```

---

## Common Screens You'll See

### 1. Web Browser (localhost:8081)
```
┌─────────────────────────────────────┐
│  CarPool App                        │
│                                     │
│  [Map View]                         │
│                                     │
│  📍 Your Location                   │
│                                     │
│  [Find a Ride]   [Offer a Ride]    │
│                                     │
│  Recent Trips: None                 │
└─────────────────────────────────────┘
```

### 2. Expo DevTools (localhost:19002)
- Device logs
- Performance metrics
- Network requests
- Redux state (if applicable)

---

## Troubleshooting Live Issues

### Issue: Can't Connect to Server from Phone

**Cause**: Firewall or network issue

**Solution**:
```bash
# Find your local IP
ip addr show | grep inet

# Update client .env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api

# Restart client
npx expo start -c
```

### Issue: "Network Request Failed"

**Cause**: Server not running or wrong URL

**Check**:
```bash
# Is server running?
curl http://localhost:3000/health

# Check client .env
grep API_URL Client/CarPoolApp/.env
```

### Issue: Blank Screen

**Solution**:
```bash
# Clear cache and restart
cd Client/CarPoolApp
npx expo start -c

# In the app, shake device and select "Reload"
```

---

## Next Steps After Running

1. ✅ Verify server health: `curl http://localhost:3000/health`
2. ✅ Open web app: Press `w` in client terminal
3. ✅ Create test account
4. ✅ Explore features
5. ✅ Check database in Supabase dashboard
6. ✅ Review logs in both terminals

---

## Quick Reference Card

| Task | Command | Terminal |
|------|---------|----------|
| Start Server | `cd Server && npm run dev` | Terminal 1 |
| Start Client | `cd Client/CarPoolApp && npx expo start` | Terminal 2 |
| Open Web | Press `w` in client terminal | Terminal 2 |
| Check Server | `curl http://localhost:3000/health` | Terminal 3 |
| View Logs | See Terminal 1 & 2 output | Both |
| Stop Server | `Ctrl + C` | Terminal 1 |
| Stop Client | `Ctrl + C` | Terminal 2 |
| Restart Clean | Add `-c` flag to expo start | Terminal 2 |

---

**Ready to Run?** Execute these two commands in separate terminals:

```bash
# Terminal 1
cd /home/raisul/RaisulFiles/CarPool-Dev/Carpool-dev/Server && npm run dev

# Terminal 2
cd /home/raisul/RaisulFiles/CarPool-Dev/Carpool-dev/Client/CarPoolApp && npx expo start
```

Then press **`w`** in Terminal 2 for instant web preview! 🚀
