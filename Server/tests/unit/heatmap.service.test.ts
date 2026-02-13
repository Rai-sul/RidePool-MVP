import { describe, it, expect } from 'vitest';
import { HeatmapService } from '../../src/services/heatmap.service';

describe('HeatmapService', () => {
  describe('getEmptyHeatmap', () => {
    it('should return empty heatmap structure', () => {
      const service = new HeatmapService();
      const heatmap = service['getEmptyHeatmap']();
      
      expect(heatmap.points).toEqual([]);
      expect(heatmap.generatedAt).toBeDefined();
      expect(heatmap.bounds).toBeDefined();
      expect(heatmap.bounds.north).toBeGreaterThan(heatmap.bounds.south);
      expect(heatmap.bounds.east).toBeGreaterThan(heatmap.bounds.west);
      expect(heatmap.resolution).toBe(7);
    });
  });

  describe('calculateEarningPotential', () => {
    it('should calculate earning potential with surge', () => {
      const service = new HeatmapService();
      const surgeZones = [
        { h3Index: 'test', lat: 0, lng: 0, surgeMultiplier: 1.5, demandLevel: 'HIGH' as const, estimatedWaitMinutes: 5 },
      ];
      const potential = service['calculateEarningPotential'](surgeZones, 3);
      
      expect(potential).toBeGreaterThan(0);
      expect(potential).toBeGreaterThan(120);
    });

    it('should handle empty surge zones', () => {
      const service = new HeatmapService();
      const potential = service['calculateEarningPotential']([], 2);
      
      expect(potential).toBeGreaterThan(0);
    });
  });

  describe('Dhaka bounds validation', () => {
    it('should have valid Dhaka bounds', () => {
      const service = new HeatmapService();
      const heatmap = service['getEmptyHeatmap']();
      
      expect(heatmap.bounds.north).toBeCloseTo(23.92, 1);
      expect(heatmap.bounds.south).toBeCloseTo(23.66, 1);
      expect(heatmap.bounds.east).toBeCloseTo(90.53, 1);
      expect(heatmap.bounds.west).toBeCloseTo(90.32, 1);
    });
  });
});
