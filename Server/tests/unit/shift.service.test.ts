import { describe, it, expect, beforeEach } from 'vitest';
import { ShiftService } from '../../src/services/shift.service';

describe('ShiftService', () => {
  describe('Time Validation', () => {
    it('should validate correct time format', () => {
      const service = new ShiftService();
      expect(service['isValidTimeFormat']('08:00')).toBe(true);
      expect(service['isValidTimeFormat']('23:59')).toBe(true);
      expect(service['isValidTimeFormat']('00:00')).toBe(true);
    });

    it('should reject invalid time format', () => {
      const service = new ShiftService();
      expect(service['isValidTimeFormat']('8:00')).toBe(false);
      expect(service['isValidTimeFormat']('25:00')).toBe(false);
      expect(service['isValidTimeFormat']('12:60')).toBe(false);
      expect(service['isValidTimeFormat']('invalid')).toBe(false);
    });
  });

  describe('Time Overlap Detection', () => {
    it('should detect overlapping times', () => {
      const service = new ShiftService();
      expect(service['timesOverlap']('08:00', '12:00', '10:00', '14:00')).toBe(true);
      expect(service['timesOverlap']('08:00', '12:00', '11:00', '13:00')).toBe(true);
      expect(service['timesOverlap']('10:00', '14:00', '08:00', '11:00')).toBe(true);
    });

    it('should not detect non-overlapping times', () => {
      const service = new ShiftService();
      expect(service['timesOverlap']('08:00', '10:00', '12:00', '14:00')).toBe(false);
      expect(service['timesOverlap']('08:00', '10:00', '10:00', '12:00')).toBe(false);
    });
  });

  describe('Hours Calculation', () => {
    it('should calculate hours correctly', () => {
      const service = new ShiftService();
      expect(service['calculateHours']('08:00', '12:00')).toBe(4);
      expect(service['calculateHours']('09:00', '17:00')).toBe(8);
      expect(service['calculateHours']('08:30', '10:00')).toBe(1.5);
    });
  });
});
