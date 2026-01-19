import { describe, it, expect } from 'vitest';
import { FareService } from '../../src/services/fare.service';

describe('FareService', () => {
  const service = new FareService();

  describe('calculateBaseFare', () => {
    it('should calculate CAR base fare correctly', () => {
      const fare = service.calculateBaseFare(10, 'CAR');
      expect(fare).toBe(50 + 10 * 15);
    });

    it('should calculate CNG base fare correctly', () => {
      const fare = service.calculateBaseFare(10, 'CNG');
      expect(fare).toBe(30 + 10 * 15);
    });
  });

  describe('calculateTimeFare', () => {
    it('should calculate time fare at 2 BDT per minute', () => {
      const fare = service.calculateTimeFare(30);
      expect(fare).toBe(60);
    });
  });

  describe('getPoolDiscountRate', () => {
    it('should return 0 for 1 passenger', () => {
      expect(service.getPoolDiscountRate(1)).toBe(0);
    });

    it('should return 25% for 2 passengers', () => {
      expect(service.getPoolDiscountRate(2)).toBe(0.25);
    });

    it('should return 35% for 3 passengers', () => {
      expect(service.getPoolDiscountRate(3)).toBe(0.35);
    });

    it('should return 40% for 4 passengers', () => {
      expect(service.getPoolDiscountRate(4)).toBe(0.40);
    });
  });

  describe('calculateFullFare', () => {
    it('should apply full pool bonus for 4 passengers', () => {
      const breakdown = service.calculateFullFare(10, 20, 'CAR', 4);
      
      expect(breakdown.fullPoolBonus).toBeGreaterThan(0);
      expect(breakdown.poolDiscount).toBeGreaterThan(0);
      expect(breakdown.platformSurcharge).toBe(10);
    });

    it('should not apply full pool bonus for less than 4 passengers', () => {
      const breakdown = service.calculateFullFare(10, 20, 'CAR', 3);
      
      expect(breakdown.fullPoolBonus).toBe(0);
    });

    it('should calculate fare per person', () => {
      const breakdown = service.calculateFullFare(10, 20, 'CAR', 4);
      
      expect(breakdown.farePerPerson).toBeGreaterThan(0);
      expect(breakdown.farePerPerson).toBeLessThan(breakdown.baseFare);
    });

    it('should include platform surcharge in actual charge', () => {
      const breakdown = service.calculateFullFare(10, 20, 'CAR', 2);
      
      expect(breakdown.actualCharge).toBe(breakdown.displayedFare + 10);
    });
  });

  describe('calculateDriverEarnings', () => {
    it('should calculate 20% platform commission', () => {
      const earnings = service.calculateDriverEarnings(1000, 1);
      
      expect(earnings.platformCommission).toBe(200);
      expect(earnings.driverEarnings).toBe(800);
    });

    it('should add 100 BDT bonus for every 3 trips', () => {
      const noBonus = service.calculateDriverEarnings(1000, 2);
      const withBonus = service.calculateDriverEarnings(1000, 3);
      const doubleBonus = service.calculateDriverEarnings(1000, 6);
      
      expect(noBonus.dailyBonus).toBe(0);
      expect(withBonus.dailyBonus).toBe(100);
      expect(doubleBonus.dailyBonus).toBe(200);
    });

    it('should include tips in net earnings', () => {
      const earnings = service.calculateDriverEarnings(1000, 3, 50);
      
      expect(earnings.tips).toBe(50);
      expect(earnings.netEarnings).toBe(800 + 100 + 50);
    });
  });

  describe('estimateFare', () => {
    it('should return min, max, and estimated fare', () => {
      const estimate = service.estimateFare(10, 'CAR', 2);
      
      expect(estimate).toHaveProperty('minFare');
      expect(estimate).toHaveProperty('maxFare');
      expect(estimate).toHaveProperty('estimatedFare');
      expect(estimate.minFare).toBeLessThan(estimate.maxFare);
    });
  });

  describe('getPlatformSurcharge', () => {
    it('should return 10 BDT', () => {
      expect(service.getPlatformSurcharge()).toBe(10);
    });
  });
});
