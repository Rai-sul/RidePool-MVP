import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env', () => ({
  config: { googleMaps: { apiKey: 'test-routes-key' } },
}));

vi.mock('../../src/services/cache.service', () => ({
  cacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
  },
}));

import { GoogleMapsService } from '../../src/services/googleMaps.service';

const locations = [
  { latitude: 23.8, longitude: 90.4 },
  { latitude: 23.81, longitude: 90.41 },
];

describe('GoogleMapsService Routes API', () => {
  let service: GoogleMapsService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new GoogleMapsService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('indexes unordered matrix elements and keeps unreachable cells null', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          originIndex: 1,
          destinationIndex: 0,
          condition: 'ROUTE_EXISTS',
          distanceMeters: 1_200,
          duration: '180.5s',
          staticDuration: '120s',
        },
        {
          originIndex: 0,
          destinationIndex: 1,
          condition: 'ROUTE_NOT_FOUND',
          status: { code: 5, message: 'No route' },
        },
      ],
      text: async () => '',
    });

    const futureDeparture = new Date(Date.now() + 60_000);
    const matrix = await service.computeTrafficRouteMatrix(locations, futureDeparture);

    expect(matrix?.[1][0]).toMatchObject({
      originIndex: 1,
      destinationIndex: 0,
      distanceMeters: 1_200,
      durationSeconds: 180.5,
      staticDurationSeconds: 120,
    });
    expect(matrix?.[0][1]).toBeNull();
    expect(matrix?.[0][0]?.durationSeconds).toBe(0);

    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toContain('/distanceMatrix/v2:computeRouteMatrix');
    expect(request.headers['X-Goog-FieldMask']).toContain('originIndex');
    expect(JSON.parse(request.body)).toMatchObject({
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      departureTime: futureDeparture.toISOString(),
    });
  });

  it('omits a current departure timestamp so Google safely defaults it to request time', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
      text: async () => '',
    });

    await service.computeTrafficRouteMatrix(locations, new Date());

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.departureTime).toBeUndefined();
    expect(body.routingPreference).toBe('TRAFFIC_AWARE_OPTIMAL');
  });

  it('requests a fixed waypoint order and parses whole route legs', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [{
          distanceMeters: 2_400,
          duration: '300s',
          staticDuration: '240s',
          description: 'Traffic route',
          polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
          viewport: {
            low: { latitude: 23.8, longitude: 90.4 },
            high: { latitude: 23.82, longitude: 90.42 },
          },
          legs: [
            {
              distanceMeters: 1_000,
              duration: '120s',
              staticDuration: '90s',
              polyline: { encodedPolyline: 'leg-one' },
            },
            {
              distanceMeters: 1_400,
              duration: '180s',
              staticDuration: '150s',
              polyline: { encodedPolyline: 'leg-two' },
            },
          ],
        }],
      }),
      text: async () => '',
    });

    const route = await service.computeFixedOrderTrafficRoute(
      [...locations, { latitude: 23.82, longitude: 90.42 }],
      new Date('2026-07-16T12:00:00Z')
    );

    expect(route).toMatchObject({
      distance: 2.4,
      duration: 4,
      durationInTraffic: 5,
      summary: 'Traffic route',
      trafficLevel: 'moderate',
    });
    expect(route?.legs).toEqual([
      { distance: 1, duration: 2, baseDuration: 1.5, polyline: 'leg-one' },
      { distance: 1.4, duration: 3, baseDuration: 2.5, polyline: 'leg-two' },
    ]);

    const [url, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(url).toContain('/directions/v2:computeRoutes');
    expect(body.routingPreference).toBe('TRAFFIC_AWARE_OPTIMAL');
    expect(body.optimizeWaypointOrder).toBeUndefined();
    expect(body.intermediates).toHaveLength(1);
    expect(request.headers['X-Goog-FieldMask']).toContain('routes.legs.duration');
  });

  it('rejects traffic matrices above the optimal-traffic element limit', async () => {
    const tooMany = Array.from({ length: 11 }, (_, index) => ({
      latitude: 23.8 + index * 0.001,
      longitude: 90.4,
    }));

    await expect(service.computeTrafficRouteMatrix(tooMany)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts the maximum pool matrix of nine locations (81 elements)', async () => {
    const maximumPool = Array.from({ length: 9 }, (_, index) => ({
      latitude: 23.8 + index * 0.001,
      longitude: 90.4,
    }));
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
      text: async () => '',
    });

    const matrix = await service.computeTrafficRouteMatrix(maximumPool);

    expect(matrix).toHaveLength(9);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('opens a cooldown for SERVICE_DISABLED and clears it after a successful matrix request', async () => {
    const now = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({
        error: {
          status: 'PERMISSION_DENIED',
          details: [{ reason: 'SERVICE_DISABLED' }],
        },
      }),
    });

    await expect(service.computeTrafficRouteMatrix(locations)).resolves.toBeNull();
    expect(service.getRoutesApiFailure()).toMatchObject({
      reason: 'SERVICE_DISABLED',
      status: 403,
    });
    expect(service.shouldRefreshDegradedRoute(new Date(now - 1).toISOString())).toBe(false);

    nowSpy.mockReturnValue(now + 30 * 60_000 + 1);
    expect(service.shouldRefreshDegradedRoute(new Date(now - 1).toISOString())).toBe(true);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
      text: async () => '',
    });
    await service.computeTrafficRouteMatrix(locations);

    expect(service.getRoutesApiFailure()).toBeNull();
    expect(service.shouldRefreshDegradedRoute(new Date(now - 1).toISOString())).toBe(true);
    expect(service.shouldRefreshDegradedRoute(new Date(Date.now() + 1).toISOString())).toBe(false);
    nowSpy.mockRestore();
  });

  it('uses Directions road geometry without asking Google to reorder fixed waypoints', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [{
          legs: [
            {
              distance: { value: 1_000, text: '1 km' },
              duration: { value: 120, text: '2 mins' },
              duration_in_traffic: { value: 150, text: '2.5 mins' },
              steps: [],
              start_location: { lat: 23.8, lng: 90.4 },
              end_location: { lat: 23.81, lng: 90.41 },
            },
            {
              distance: { value: 1_400, text: '1.4 km' },
              duration: { value: 180, text: '3 mins' },
              duration_in_traffic: { value: 210, text: '3.5 mins' },
              steps: [],
              start_location: { lat: 23.81, lng: 90.41 },
              end_location: { lat: 23.82, lng: 90.42 },
            },
          ],
          overview_polyline: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
          bounds: {
            northeast: { lat: 23.82, lng: 90.42 },
            southwest: { lat: 23.8, lng: 90.4 },
          },
          summary: 'Road fallback',
        }],
      }),
    });

    const route = await service.getRoute(locations[0], { latitude: 23.82, longitude: 90.42 }, {
      waypoints: [locations[1]],
      trafficModel: 'best_guess',
    });

    expect(route?.geometry.coordinates.length).toBeGreaterThan(1);
    expect(route?.legs).toEqual([
      { distance: 1, duration: 2.5, baseDuration: 2, polyline: '' },
      { distance: 1.4, duration: 3.5, baseDuration: 3, polyline: '' },
    ]);

    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestUrl.pathname).toContain('/maps/api/directions/json');
    expect(requestUrl.searchParams.get('waypoints')).toBe('23.81,90.41');
    expect(requestUrl.searchParams.get('waypoints')).not.toContain('optimize:true');
  });
});
