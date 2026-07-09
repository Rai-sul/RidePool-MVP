# Server Docs (Combined)

**Last Updated:** 2026-05-31  
**Scope:** Consolidated server-side documentation from the ServerDocs folder, aligned with the current codebase.

---

## 1. Entry Point and Boot Sequence

**Entry point:** `Server/src/app.ts`

Boot flow:
- Load env via `dotenv`.
- Configure security headers, CORS, compression, body parsing.
- Apply input sanitization and rate limiters.
- Mount `/api` routes from `Server/src/routes/index.ts`.
- Connect cache via `unifiedCacheService` (Redis or memory fallback).
- Start server and register graceful shutdown.

---

## 2. Request Lifecycle (Controller Pattern)

**Flow:** Routes -> Controllers -> Services -> Supabase/External APIs

Responsibilities:
- **Routes:** Define endpoints and attach middleware.
- **Controllers:** Validate input, enforce auth, orchestrate services, return response.
- **Services:** Business logic, caching, external API calls.
- **Data:** Supabase (PostgreSQL + RLS + Realtime), Redis (optional).

---

## 3. Core Service Map

Key services in `Server/src/services/`:
- `poolMatching.service.ts`: H3-based pool matching with scoring and route overlap.
- `smartRoute.service.ts`: One-shot combined route generation + caching.
- `googleMaps.service.ts`: Directions API with traffic-aware routing and caching.
- `lookupTime.service.ts`: Two-phase pool search timer (30s + 10s).
- `fare.service.ts`: Fare calculation, pool discounts, platform surcharge.
- `notification.service.ts`: FCM push (stores in DB when key is missing).
- `penalty.service.ts`: Cancellation cooldown tracking.
- `incentive.service.ts`: Driver bonus tracking.

---

## 4. Pool Search and Matching

**H3-first matching:**
- Pickup uses resolution 9, destination uses resolution 7.
- Match scoring blends distance, overlap, hex overlap, and destination proximity.
- `poolSearchResponse.service.ts` adds alternatives, analytics, and metadata.

**Google Maps enrichment:**
- When API key is present, top matches receive exact distance/ETA and route geometry.
- If key is missing, H3 estimates are returned.

---

## 5. Combined Route Strategy (SmartRoute)

**One-shot optimization:**
- First request triggers a Google Maps route call and caches for the trip.
- Cache key uses pool ID (preferred) or H3-based location hashing.
- Cached responses adjust ETA based on elapsed time.
- Off-route checks use a point-to-route scan with recalculation threshold.

---

## 6. Cost Optimization Summary

- **H3 for matching**: free, fast, scales well.
- **Google Maps for precision**: used selectively (top matches and combined routes).
- **Caching**: route cache TTL and H3-based keys reduce API costs.
- **Deep links**: navigation uses Google Maps app where possible (no API cost).

---

## 7. Notifications

- **Push notifications:** FCM if `FCM_SERVER_KEY` is configured; otherwise stored in DB.
- **Emergency delivery:** External SMS/999 delivery is a placeholder (logged in DB).

---

## 8. Example Responses (Short)

**Pool search (no matches):**
```json
{
  "success": true,
  "data": {
    "pools": [],
    "has_matches": false,
    "alternatives": [{ "action": "CREATE_POOL", "title": "Create Your Own Pool" }]
  }
}
```

**Pool search (matches):**
```json
{
  "success": true,
  "data": {
    "pools": [{ "poolId": "uuid", "score": 85 }],
    "has_matches": true
  }
}
```

---

## 9. Testing and Verification

- Test runner: `vitest` in `Server/tests`.
- Unit and integration test folders exist; run `npm run test` from `Server/`.
- No automated claims included here; see current test output for status.

---

## 10. Status Notes (Current)

- Payment gateway integration is a placeholder for card/mobile banking.
- FCM requires external credentials to become fully live.
- BullMQ is present but not initialized in `app.ts` (if needed, wire a worker process).
