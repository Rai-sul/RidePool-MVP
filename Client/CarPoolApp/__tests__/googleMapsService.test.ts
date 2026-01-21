import { searchLocation, getRoute, reverseGeocode } from '../services/googleMapsService';

// Mock fetch globally
global.fetch = jest.fn();

describe('googleMapsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchLocation', () => {
    it('should search for locations', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            place_id: '1',
            name: 'San Francisco',
            formatted_address: 'San Francisco, CA, USA',
            geometry: {
              location: { lat: 37.7749, lng: -122.4194 },
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await searchLocation('San Francisco');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('San Francisco');
      expect(results[0].coordinates.latitude).toBe(37.7749);
      expect(results[0].coordinates.longitude).toBe(-122.4194);
    });

    it('should throw error on failed search', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await expect(searchLocation('Invalid')).rejects.toThrow('Failed to search location');
    });
  });

  describe('getRoute', () => {
    it('should get route between two points', async () => {
      const mockResponse = {
        status: 'OK',
        routes: [
          {
            legs: [
              {
                duration: { value: 1200, text: '20 mins' },
                distance: { value: 5000, text: '5 km' },
              },
            ],
            overview_polyline: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const route = await getRoute(
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 }
      );

      expect(route.routes).toHaveLength(1);
      expect(route.routes[0].duration).toBe(1200);
      expect(route.routes[0].distance).toBe(5000);
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            formatted_address: 'San Francisco, CA, USA',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const address = await reverseGeocode(37.7749, -122.4194);

      expect(address).toBe('San Francisco, CA, USA');
    });

    it('should return default message for unknown location', async () => {
      const mockResponse = {
        status: 'OK',
        results: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const address = await reverseGeocode(0, 0);

      expect(address).toBe('Unknown location');
    });
  });
});
