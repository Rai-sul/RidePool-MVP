import { describe, it, expect } from 'vitest';
import { VoiceNavigationService } from '../../src/services/voiceNavigation.service';

describe('VoiceNavigationService', () => {
  const service = new VoiceNavigationService();

  describe('generateVoiceInstructions', () => {
    const mockRoute = {
      totalDistance: 5000,
      totalDuration: 600,
      steps: [
        {
          instruction: 'Turn left onto Main Street',
          distance: 500,
          duration: 60,
          maneuver: 'TURN_LEFT' as const,
          startLocation: { lat: 23.7925, lng: 90.4078 },
          endLocation: { lat: 23.7930, lng: 90.4070 },
          roadName: 'Main Street',
        },
        {
          instruction: 'Continue straight',
          distance: 200,
          duration: 30,
          maneuver: 'STRAIGHT' as const,
          startLocation: { lat: 23.7930, lng: 90.4070 },
          endLocation: { lat: 23.7935, lng: 90.4065 },
          roadName: 'Main Street',
        },
      ],
      polyline: '',
      waypoints: [],
    };

    it('should generate English voice instructions', () => {
      const instructions = service.generateVoiceInstructions(mockRoute, 'en');
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0].language).toBe('en');
      expect(instructions[0].text).toContain('left');
    });

    it('should generate Bengali voice instructions', () => {
      const instructions = service.generateVoiceInstructions(mockRoute, 'bn');
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0].language).toBe('bn');
      expect(instructions[0].text).toContain('বামে');
    });

    it('should include SSML markup', () => {
      const instructions = service.generateVoiceInstructions(mockRoute, 'en');
      expect(instructions[0].ssml).toMatch(/^<speak>.*<\/speak>$/);
    });
  });

  describe('calculateNavigationState', () => {
    const mockRoute = {
      totalDistance: 1000,
      totalDuration: 120,
      steps: [
        {
          instruction: 'Turn right',
          distance: 500,
          duration: 60,
          maneuver: 'TURN_RIGHT' as const,
          startLocation: { lat: 23.7925, lng: 90.4078 },
          endLocation: { lat: 23.7930, lng: 90.4085 },
          roadName: 'Test Road',
        },
        {
          instruction: 'Arrive',
          distance: 500,
          duration: 60,
          maneuver: 'ARRIVE' as const,
          startLocation: { lat: 23.7930, lng: 90.4085 },
          endLocation: { lat: 23.7935, lng: 90.4090 },
          roadName: 'Destination',
        },
      ],
      polyline: '',
      waypoints: [],
    };

    it('should calculate current step index', () => {
      const state = service.calculateNavigationState(
        mockRoute,
        { lat: 23.7925, lng: 90.4078 },
        0
      );
      expect(state.currentStepIndex).toBe(0);
    });

    it('should calculate distance remaining', () => {
      const state = service.calculateNavigationState(
        mockRoute,
        { lat: 23.7925, lng: 90.4078 },
        0
      );
      expect(state.distanceRemaining).toBeGreaterThan(0);
    });

    it('should detect off-route', () => {
      const state = service.calculateNavigationState(
        mockRoute,
        { lat: 23.8000, lng: 90.5000 },
        0
      );
      expect(state.isOffRoute).toBe(true);
    });

    it('should not mark off-route when close', () => {
      const state = service.calculateNavigationState(
        mockRoute,
        { lat: 23.7925, lng: 90.4078 },
        0
      );
      expect(state.isOffRoute).toBe(false);
    });
  });

  describe('generateRecalculatingMessage', () => {
    it('should generate English recalculating message', () => {
      const instruction = service.generateRecalculatingMessage('en');
      expect(instruction.text).toBe('Recalculating route');
      expect(instruction.language).toBe('en');
    });

    it('should generate Bengali recalculating message', () => {
      const instruction = service.generateRecalculatingMessage('bn');
      expect(instruction.text).toBe('রুট পুনর্গণনা করা হচ্ছে');
      expect(instruction.language).toBe('bn');
    });
  });

  describe('generateWaypointApproachMessage', () => {
    it('should generate pickup approach message', () => {
      const instruction = service.generateWaypointApproachMessage('PICKUP', 100, 'en');
      expect(instruction.text).toContain('Pickup');
      expect(instruction.text).toContain('100');
    });

    it('should generate arriving at pickup message', () => {
      const instruction = service.generateWaypointApproachMessage('PICKUP', 20, 'en');
      expect(instruction.text).toBe('Arriving at pickup point');
    });

    it('should generate dropoff approach message', () => {
      const instruction = service.generateWaypointApproachMessage('DROPOFF', 100, 'en');
      expect(instruction.text).toContain('Drop-off');
    });
  });

  describe('distance calculation', () => {
    it('should calculate distance between two points', () => {
      const distance = service['calculateDistance'](
        23.7925, 90.4078,
        23.7935, 90.4088
      );
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200);
    });
  });
});
