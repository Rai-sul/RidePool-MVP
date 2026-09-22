# Maps and Navigation

What riders and drivers actually see, and which parts cost money.

---

## In-app map

Rendered by components in `Client/CarPoolApp/components/`:

| Component | Role |
|---|---|
| `GoogleMapView.tsx` | Entry point; picks the right renderer |
| `NativeMap.tsx` | `react-native-maps` — native builds |
| `WebMap.tsx` | Leaflet / `@react-google-maps/api` — web |
| `StaticMapView.tsx` | Static image fallback (Expo Go) |
| `HomeMap.tsx`, `MapView.tsx` | Screen-level wrappers |

The driver app uses `react-native-maps` only.

**Visible today**: the combined route polyline, ordered pickup/drop-off
markers, the live driver marker and the user marker, plus server-supplied ETAs
when a Google Maps key is configured.

**Not enabled**: traffic-layer colouring, in-app turn-by-turn voice guidance,
and hazard/closure overlays.

The polyline comes from `routePolyline` / `routeCoordinates` in the
`combined-route` response. If those are missing the client may fetch a simple
route directly using `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

### Enabling the traffic overlay

Pass `showsTraffic` to the native map in `NativeMap.tsx`. It only renders in a
custom dev client or a production build — Expo Go does not run the native map
at all. See [expo-go-maps.md](./expo-go-maps.md).

## Deep links — free

Opening the route in the Google Maps app costs **nothing**: the server only
builds a URL string. No Directions or Routes call is made.

| Endpoint | Returns |
|---|---|
| `GET /api/pools/:poolId/navigation-link` | Link for a pool's full stop sequence |
| `POST /api/navigation/deep-link` | Link for arbitrary origin/destination/waypoints |

Once open, Google Maps handles traffic visualisation, turn-by-turn, rerouting
and live ETA — none of it billed to this project.

Built by `generateNavigationDeepLink`, `generateViewRouteDeepLink` and
`generatePlatformNavigationLinks` in
`Server/src/services/googleMaps.service.ts`. With waypoints, all platforms get
the universal `https://www.google.com/maps/dir/?api=1…` URL, because the native
`google.navigation:` and `comgooglemaps://` schemes silently drop waypoints.
Single-destination links use the native schemes.

## What does cost money

Only the server's Directions and Routes API calls. See
[../architecture/server.md](../architecture/server.md#google-maps-cost-model)
for the caching and de-duplication rules, and
[../architecture/combined-route.md](../architecture/combined-route.md) for why a
pool needs just two billed calls per phase.

## Setup

- API keys and Android signing: [google-maps-setup.md](./google-maps-setup.md)
- Expo Go limitations: [expo-go-maps.md](./expo-go-maps.md)
- Location permissions: [app-permissions.md](./app-permissions.md)
