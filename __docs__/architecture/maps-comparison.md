# Maps API Comparison: Google Maps vs Mapbox

## Executive Summary

For RidePool's use case (ride-sharing in Dhaka), we recommend **Mapbox for MVP** due to its significantly larger free tier, with a plan to evaluate Google Maps for production if routing quality is insufficient.

## Feature Comparison

| Feature | Google Maps | Mapbox |
|---------|-------------|--------|
| **Routing Quality (Dhaka)** | Excellent | Good |
| **Traffic Data** | Real-time | Historical only |
| **ETA Accuracy** | High | Moderate |
| **Custom Styling** | Limited | Excellent |
| **SDK Size (Mobile)** | ~50 MB | ~10 MB |
| **Offline Maps** | Limited | Excellent |
| **Bangladesh Coverage** | Full | Full |
| **Navigation SDK** | Paid | Included |

## Cost Comparison (January 2026)

### Google Maps Platform

| API | Free Credit | Cost per 1K |
|-----|-------------|-------------|
| Directions | $200/month | $5.00 |
| Distance Matrix | $200/month | $5.00 (per element) |
| Geocoding | $200/month | $5.00 |
| Places Autocomplete | $200/month | $2.83 |
| Static Maps | $200/month | $2.00 |
| Dynamic Maps | $200/month | $7.00 |

**$200 credit/month = ~40K Directions API calls**

### Mapbox

| API | Free Tier | Cost per 1K |
|-----|-----------|-------------|
| Directions | 100K/month | $0.50 |
| Geocoding (Forward) | 100K/month | $0.75 |
| Geocoding (Reverse) | 100K/month | Free |
| Isochrone | 100K/month | $0.50 |
| Map Tiles | 50K loads/month | $0.30 |
| Navigation SDK | Free | Free |

**100K free requests/month = 2.5x Google's effective free tier**

## Usage Projections

### MVP Phase (1,000 DAU)

| Action | Daily Calls | Monthly | API |
|--------|-------------|---------|-----|
| Search pool | 2,000 | 60,000 | Directions |
| Driver routing | 500 | 15,000 | Directions |
| Address lookup | 3,000 | 90,000 | Geocoding |
| Map display | 1,000 | 30,000 | Tiles |
| **Total** | | **195,000** | |

**Cost with Google Maps:** ~$750/month (after $200 credit)
**Cost with Mapbox:** $0 (within free tier + $47.50 overage)

### Growth Phase (10,000 DAU)

| Action | Monthly Calls | Google Cost | Mapbox Cost |
|--------|---------------|-------------|-------------|
| Directions | 600,000 | $2,800 | $250 |
| Geocoding | 900,000 | $4,300 | $600 |
| Tiles | 300,000 | $600 | $75 |
| **Total** | | **$7,700** | **$925** |

**Mapbox is ~8x cheaper at scale**

## Technical Comparison

### Routing Quality

```typescript
// Test route: Uttara to Motijheel (peak hour)
// Google Maps
{
  distance: "15.2 km",
  duration: "1 hour 5 min",
  traffic_model: "best_guess"
}

// Mapbox
{
  distance: "14.8 km", 
  duration: "55 min",
  congestion: "heavy" // no real-time traffic ETA
}
```

**Verdict:** Google Maps more accurate for ETA in traffic

### SDK Integration (React Native)

```typescript
// Google Maps
import MapView from 'react-native-maps';
// Requires API key, GoogleService-Info.plist, etc.

// Mapbox
import MapboxGL from '@rnmapbox/maps';
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
// Simpler setup, smaller bundle
```

### Custom Styling

**Google Maps:**
- Limited style options
- Cloud-based styling (paid feature)
- JSON style format

**Mapbox:**
- Full style customization
- Mapbox Studio (free)
- Custom fonts, icons, 3D buildings

## RidePool-Specific Considerations

### Critical Requirements

| Requirement | Google | Mapbox | Notes |
|-------------|--------|--------|-------|
| Dhaka routing | ✅ | ✅ | Both work |
| Traffic-aware ETA | ✅ | ⚠️ | Google better |
| Driver navigation | ✅ (paid) | ✅ (free) | Mapbox cheaper |
| Custom pool zones | ⚠️ | ✅ | Mapbox easier |
| Offline maps | ⚠️ | ✅ | Important for Dhaka |

### H3 Integration

Both APIs work with our H3 hexagonal indexing:

```typescript
// Same code works with both
const h3Cell = h3.latLngToCell(location.lat, location.lng, 7);
const routeH3 = h3.gridPathCells(originCell, destCell);
```

## Implementation Strategy

### Phase 1: MVP (Mapbox)

```typescript
// Server/src/services/mapbox.service.ts
import mbxDirections from '@mapbox/mapbox-sdk/services/directions';

const directionsClient = mbxDirections({ accessToken: MAPBOX_TOKEN });

async function getRoute(origin: Location, destination: Location) {
  const response = await directionsClient.getDirections({
    profile: 'driving-traffic',
    waypoints: [
      { coordinates: [origin.lng, origin.lat] },
      { coordinates: [destination.lng, destination.lat] }
    ],
    geometries: 'geojson'
  }).send();

  return {
    distance: response.body.routes[0].distance,
    duration: response.body.routes[0].duration,
    geometry: response.body.routes[0].geometry
  };
}
```

### Phase 2: Evaluation

After 1 month of production:
1. Compare actual vs predicted ETAs
2. Survey drivers on routing quality
3. Analyze customer complaints
4. Decision point: Stay with Mapbox or migrate to Google

### Phase 3: Hybrid (If Needed)

```typescript
// Use Mapbox for maps, Google for routing
const mapProvider = 'mapbox'; // Display
const routingProvider = process.env.ROUTING_PROVIDER || 'mapbox';

async function getRoute(origin, destination) {
  if (routingProvider === 'google') {
    return googleMapsService.getRoute(origin, destination);
  }
  return mapboxService.getRoute(origin, destination);
}
```

## Migration Path

If migrating from Mapbox to Google Maps:

1. **Week 1**: Implement Google Maps service alongside Mapbox
2. **Week 2**: A/B test with 10% of traffic
3. **Week 3**: Analyze accuracy metrics
4. **Week 4**: Full migration if successful

**Estimated effort:** 16-24 hours

## Recommendation

### MVP Launch
**Use Mapbox**
- 100K free requests/month
- Lower development complexity
- Smaller app size
- Free navigation SDK

### Production (If ETA accuracy critical)
**Consider Google Maps**
- Superior traffic data
- Better for SLA commitments
- Higher cost justified by accuracy

### Cost-Optimized Hybrid
**Mapbox Display + Google Routing**
- Maps displayed via Mapbox (cheaper)
- ETAs calculated via Google (accurate)
- Best of both worlds

## Environment Variables

```env
# MVP: Mapbox only
MAPBOX_ACCESS_TOKEN=pk.your-mapbox-token

# Production: Both for hybrid
MAPBOX_ACCESS_TOKEN=pk.your-mapbox-token
GOOGLE_MAPS_API_KEY=your-google-api-key
ROUTING_PROVIDER=mapbox  # or 'google'
```

---

**Verdict:** Start with Mapbox, migrate to Google if quality issues arise.

**Last Updated:** 2026-01-19
