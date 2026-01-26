import {
  getH3Index,
  getH3Boundary,
  getNearbyHexagons,
  h3ToLatLng,
  calculateRouteHexagons,
  areHexagonsNearby,
} from '../utils/h3Utils';

describe('h3Utils', () => {
  describe('getH3Index', () => {
    it('should convert lat/lng to H3 index', () => {
      const h3Index = getH3Index(37.7749, -122.4194);
      expect(h3Index).toBeTruthy();
      expect(typeof h3Index).toBe('string');
    });
  });

  describe('getH3Boundary', () => {
    it('should return boundary coordinates for H3 index', () => {
      const h3Index = getH3Index(37.7749, -122.4194);
      const boundary = getH3Boundary(h3Index);
      
      expect(Array.isArray(boundary)).toBe(true);
      expect(boundary.length).toBeGreaterThan(0);
      expect(boundary[0]).toHaveLength(2);
    });
  });

  describe('getNearbyHexagons', () => {
    it('should return nearby hexagons', () => {
      const h3Index = getH3Index(37.7749, -122.4194);
      const nearby = getNearbyHexagons(h3Index, 1);
      
      expect(Array.isArray(nearby)).toBe(true);
      expect(nearby.length).toBeGreaterThan(1);
      expect(nearby).toContain(h3Index);
    });
  });

  describe('h3ToLatLng', () => {
    it('should convert H3 index back to lat/lng', () => {
      const originalLat = 37.7749;
      const originalLng = -122.4194;
      const h3Index = getH3Index(originalLat, originalLng);
      const { lat, lng } = h3ToLatLng(h3Index);
      
      expect(lat).toBeCloseTo(originalLat, 2);
      expect(lng).toBeCloseTo(originalLng, 2);
    });
  });

  describe('calculateRouteHexagons', () => {
    it('should calculate hexagons for a route', () => {
      const route = [
        { lat: 37.7749, lng: -122.4194 },
        { lat: 37.7849, lng: -122.4094 },
        { lat: 37.7949, lng: -122.3994 },
      ];
      
      const hexagons = calculateRouteHexagons(route);
      
      expect(Array.isArray(hexagons)).toBe(true);
      expect(hexagons.length).toBeGreaterThan(route.length);
    });
  });

  describe('areHexagonsNearby', () => {
    it('should check if hexagons are nearby', () => {
      const hex1 = getH3Index(37.7749, -122.4194);
      const hex2 = getH3Index(37.7750, -122.4195);
      
      const areNearby = areHexagonsNearby(hex1, hex2, 2);
      expect(typeof areNearby).toBe('boolean');
    });
  });
});
