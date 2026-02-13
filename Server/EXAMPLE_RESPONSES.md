# Example API Responses - Enhanced Pool Search

## Scenario 1: No Pools Found (Empty Result)

### Request
```http
POST /api/rides/request
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "pickup_lat": 23.8103,
  "pickup_lng": 90.4125,
  "pickup_address": "Uttara Sector 7",
  "dropoff_lat": 23.7805,
  "dropoff_lng": 90.4258,
  "dropoff_address": "Dhanmondi 15",
  "vehicle_type": "CAR",
  "gender_restriction": "ANY"
}
```

### Response (Enhanced - No Empty Array!)
```json
{
  "message": "Ride requested - No pools found, see alternatives",
  "ride": {
    "id": "ride-abc-123",
    "user_id": "user-xyz",
    "pickup_lat": 23.8103,
    "pickup_lng": 90.4125,
    "pickup_address": "Uttara Sector 7",
    "pickup_h3_index": "891e204d21fffff",
    "dropoff_lat": 23.7805,
    "dropoff_lng": 90.4258,
    "dropoff_address": "Dhanmondi 15",
    "dropoff_h3_index": "871e204d7ffffff",
    "vehicle_type": "CAR",
    "gender_restriction": "ANY",
    "status": "CREATING_POOL",
    "created_at": "2024-12-11T19:30:00Z"
  },
  "poolSearch": {
    "matches": [],
    "hasMatches": false,
    "alternatives": [
      {
        "action": "CREATE_POOL",
        "title": "Create Your Own Pool",
        "description": "Start a new pool and wait for others to join your route",
        "icon": "plus-circle",
        "priority": 1,
        "metadata": {
          "estimatedWaitTime": "2-5 minutes",
          "potentialSavings": "30-40%"
        }
      },
      {
        "action": "JOIN_WAITLIST",
        "title": "Join Waitlist",
        "description": "We'll notify you when a pool matches your route",
        "icon": "bell",
        "priority": 2,
        "metadata": {
          "estimatedMatches": "3-5 pools expected during peak hours",
          "nextPeakHour": "17:00"
        }
      },
      {
        "action": "TRY_DIFFERENT_TIME",
        "title": "Try Peak Hours",
        "description": "More pools available during Evening Rush",
        "icon": "clock",
        "priority": 5,
        "metadata": {
          "peakHours": [
            { "start": "07:00", "end": "09:00" },
            { "start": "17:00", "end": "19:00" }
          ],
          "currentlyPeak": false
        }
      }
    ],
    "analytics": {
      "totalPoolsChecked": 0,
      "destinationHexagonsSearched": 0,
      "pickupHexagonsSearched": 0,
      "incompatibleReasons": {
        "no_pools_in_area": 1
      },
      "searchRadius": 2,
      "peakHoursNearby": false
    },
    "metadata": {
      "hasNearbyPools": false,
      "nearbyPools": [],
      "peakHours": [
        { "start": "07:00", "end": "09:00" },
        { "start": "17:00", "end": "19:00" }
      ],
      "estimatedWaitTime": 30
    }
  }
}
```

---

## Scenario 2: No Matches But Nearby Pools Available

### Response
```json
{
  "message": "Ride requested - No pools found, see alternatives",
  "ride": { ... },
  "poolSearch": {
    "matches": [],
    "hasMatches": false,
    "alternatives": [
      {
        "action": "CREATE_POOL",
        "title": "Create Your Own Pool",
        "description": "Start a new pool and wait for others to join your route",
        "icon": "plus-circle",
        "priority": 1,
        "metadata": {
          "estimatedWaitTime": "2-5 minutes",
          "potentialSavings": "30-40%"
        }
      },
      {
        "action": "ADJUST_DESTINATION",
        "title": "Adjust Your Destination",
        "description": "3 pool(s) found 1.8km away",
        "icon": "map-pin",
        "priority": 3,
        "metadata": {
          "nearestPoolDistance": 1.8,
          "alternativeDestination": "Mirpur 10",
          "poolsAvailable": 3
        }
      },
      {
        "action": "EXPAND_SEARCH",
        "title": "Expand Search Area",
        "description": "Search up to 4km from your destination",
        "icon": "search",
        "priority": 4,
        "metadata": {
          "currentRadius": 2,
          "suggestedRadius": 4
        }
      }
    ],
    "analytics": {
      "totalPoolsChecked": 8,
      "incompatibleReasons": {
        "destination_incompatible": 3,
        "gender_restriction": 1,
        "pool_full": 2,
        "score_too_low": 2
      },
      "searchRadius": 2,
      "peakHoursNearby": true
    },
    "metadata": {
      "hasNearbyPools": true,
      "nearbyPools": [
        {
          "poolId": "pool-abc-001",
          "distance": 1.8,
          "destination": "Mirpur 10",
          "currentPassengers": 3,
          "maxPassengers": 4,
          "incompatibilityReason": "Destination too far"
        },
        {
          "poolId": "pool-abc-002",
          "distance": 2.1,
          "destination": "Banani 11",
          "currentPassengers": 2,
          "maxPassengers": 4,
          "incompatibilityReason": "Destination too far"
        },
        {
          "poolId": "pool-abc-003",
          "distance": 2.3,
          "destination": "Gulshan 2",
          "currentPassengers": 4,
          "maxPassengers": 4,
          "incompatibilityReason": "Pool is full"
        }
      ],
      "suggestedDestinationAdjustment": {
        "direction": "towards nearest pool",
        "distanceKm": 1.8
      },
      "peakHours": [
        { "start": "07:00", "end": "09:00" },
        { "start": "17:00", "end": "19:00" }
      ],
      "estimatedWaitTime": 5
    }
  }
}
```

---

## Scenario 3: Pools Found (Success Case)

### Response
```json
{
  "message": "Ride requested successfully - Pools found!",
  "ride": { ... },
  "poolSearch": {
    "matches": [
      {
        "poolId": "pool-xyz-789",
        "h3Distance": 0,
        "destinationHexMatch": true,
        "commonHexagons": ["871e204d7ffffff"],
        "viabilityScore": 87,
        "estimatedDetour": 0.2,
        "score": 87,
        "scoreBreakdown": {
          "distanceScore": 23.5,
          "routeOverlapScore": 33.2,
          "hexagonScore": 16.0,
          "exactMatchBonus": 5.0,
          "destinationProximityScore": 9.3,
          "totalScore": 87
        },
        "routeOverlapPercentage": 95
      },
      {
        "poolId": "pool-xyz-790",
        "h3Distance": 1,
        "destinationHexMatch": false,
        "commonHexagons": ["871e204d7ffffff", "871e204dfffffff"],
        "viabilityScore": 72,
        "estimatedDetour": 0.8,
        "score": 72,
        "scoreBreakdown": {
          "distanceScore": 20.1,
          "routeOverlapScore": 28.5,
          "hexagonScore": 14.2,
          "exactMatchBonus": 0,
          "destinationProximityScore": 7.8,
          "totalScore": 72
        },
        "routeOverlapPercentage": 81
      }
    ],
    "hasMatches": true,
    "alternatives": [],
    "analytics": {
      "totalPoolsChecked": 15,
      "incompatibleReasons": {
        "pickup_too_far": 4,
        "gender_restriction": 1,
        "destination_incompatible": 2,
        "no_route_overlap": 3,
        "pool_full": 1,
        "score_too_low": 4
      },
      "searchRadius": 2,
      "peakHoursNearby": true,
      "averagePoolDistance": 1.2
    },
    "metadata": {
      "hasNearbyPools": false,
      "peakHours": [
        { "start": "07:00", "end": "09:00" },
        { "start": "17:00", "end": "19:00" }
      ],
      "estimatedWaitTime": 5
    }
  }
}
```

---

## Scenario 4: GET /api/pools/search (Query Params)

### Request
```http
GET /api/pools/search?pickup_lat=23.8103&pickup_lng=90.4125&dropoff_lat=23.7805&dropoff_lng=90.4258&vehicle_type=CAR
Authorization: Bearer eyJhbGc...
```

### Response (No Pools)
```json
{
  "message": "No pools found - See alternatives",
  "pools": [],
  "hasMatches": false,
  "alternatives": [
    {
      "action": "CREATE_POOL",
      "title": "Create Your Own Pool",
      "description": "Start a new pool and wait for others to join your route",
      "icon": "plus-circle",
      "priority": 1,
      "metadata": {
        "estimatedWaitTime": "2-5 minutes",
        "potentialSavings": "30-40%"
      }
    }
  ],
  "analytics": {
    "totalPoolsChecked": 0,
    "incompatibleReasons": {
      "no_pools_in_area": 1
    },
    "searchRadius": 2,
    "peakHoursNearby": false
  },
  "metadata": {
    "hasNearbyPools": false,
    "nearbyPools": [],
    "peakHours": [
      { "start": "07:00", "end": "09:00" },
      { "start": "17:00", "end": "19:00" }
    ],
    "estimatedWaitTime": 30
  }
}
```

### Response (Pools Found)
```json
{
  "message": "Found 2 matching pool(s)",
  "pools": [
    {
      "poolId": "pool-xyz-789",
      "score": 87,
      "scoreBreakdown": { ... },
      "routeOverlapPercentage": 95,
      ...
    },
    {
      "poolId": "pool-xyz-790",
      "score": 72,
      "scoreBreakdown": { ... },
      "routeOverlapPercentage": 81,
      ...
    }
  ],
  "hasMatches": true,
  "alternatives": [],
  "analytics": {
    "totalPoolsChecked": 15,
    "incompatibleReasons": { ... },
    "searchRadius": 2,
    "peakHoursNearby": true
  },
  "metadata": { ... }
}
```

---

## Mobile App UI Mockup

### When No Pools Found

```
┌────────────────────────────────────┐
│  🔍  Pool Search Results           │
├────────────────────────────────────┤
│                                    │
│  😕 No Pools Found                 │
│  We searched 2km around your       │
│  destination but didn't find       │
│  any matching pools.               │
│                                    │
│  What would you like to do?        │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ ➕ Create Your Own Pool      │ │
│  │ Start a pool and wait for    │ │
│  │ others to join (2-5 min)     │ │
│  │ Save 30-40%                  │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 🔔 Join Waitlist             │ │
│  │ We'll notify you when a      │ │
│  │ pool matches (3-5 expected   │ │
│  │ at 5:00 PM)                  │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📍 Adjust Destination        │ │
│  │ 3 pools found 1.8km away     │ │
│  │ • Mirpur 10                  │ │
│  │ • Banani 11                  │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ ⏰ Try Peak Hours            │ │
│  │ More pools at 7-9 AM or      │ │
│  │ 5-7 PM                       │ │
│  └──────────────────────────────┘ │
│                                    │
└────────────────────────────────────┘
```

---

## Key Improvements

### Before ❌
```json
{
  "message": "Pool search completed",
  "pools": []  // User stuck here!
}
```

### After ✅
```json
{
  "message": "No pools found - See alternatives",
  "pools": [],
  "alternatives": [
    { "action": "CREATE_POOL", ... },
    { "action": "JOIN_WAITLIST", ... },
    { "action": "ADJUST_DESTINATION", ... }
  ],
  "analytics": { ... },
  "metadata": { ... }
}
```

---

**Result**: Users always have a clear path forward! 🎯
