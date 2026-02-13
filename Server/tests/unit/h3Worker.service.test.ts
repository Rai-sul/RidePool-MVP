import { describe, it, expect } from 'vitest';
import { h3Sync } from '../../src/services/h3Worker.service';

describe('H3 Worker Service - Sync Functions', () => {
  describe('getSearchHexagons', () => {
    it('should return hexagons for a given location', () => {
      const result = h3Sync('getSearchHexagons', {
        lat: 23.8103,
        lng: 90.4125,
        resolution: 7,
        ringSize: 1,
      }) as { centerCell: string; hexagons: string[]; count: number };

      expect(result).toHaveProperty('centerCell');
      expect(result).toHaveProperty('hexagons');
      expect(result).toHaveProperty('count');
      expect(result.hexagons.length).toBeGreaterThan(0);
      expect(result.count).toBe(result.hexagons.length);
    });

    it('should include center cell in hexagons', () => {
      const result = h3Sync('getSearchHexagons', {
        lat: 23.8103,
        lng: 90.4125,
        resolution: 7,
        ringSize: 1,
      }) as { centerCell: string; hexagons: string[] };

      expect(result.hexagons).toContain(result.centerCell);
    });

    it('should return more hexagons with larger ring size', () => {
      const result1 = h3Sync('getSearchHexagons', {
        lat: 23.8103,
        lng: 90.4125,
        resolution: 7,
        ringSize: 1,
      }) as { count: number };

      const result2 = h3Sync('getSearchHexagons', {
        lat: 23.8103,
        lng: 90.4125,
        resolution: 7,
        ringSize: 2,
      }) as { count: number };

      expect(result2.count).toBeGreaterThan(result1.count);
    });
  });

  describe('latLngToCell', () => {
    it('should convert coordinates to H3 cell', () => {
      const result = h3Sync('latLngToCell', {
        lat: 23.8103,
        lng: 90.4125,
        resolution: 7,
      }) as string;

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return different cells for different resolutions', () => {
      const cell7 = h3Sync('latLngToCell', {
        lat: 23.8103,
        lng: 90.4125,
        resolution: 7,
      }) as string;

      const cell9 = h3Sync('latLngToCell', {
        lat: 23.8103,
        lng: 90.4125,
        resolution: 9,
      }) as string;

      expect(cell7).not.toBe(cell9);
    });
  });

  describe('error handling', () => {
    it('should throw for unknown task', () => {
      expect(() => h3Sync('unknownTask', {})).toThrow('Unknown sync task');
    });
  });
});
