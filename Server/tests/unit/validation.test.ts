import { describe, it, expect, beforeEach } from 'vitest';
import {
  CreateRideSchema,
  CreatePoolSchema,
  GoOnlineSchema,
  UpdateLocationSchema,
  SetPriorityLocationSchema,
  ProcessPaymentSchema,
  validate,
} from '../../src/middleware/validation';

describe('Validation Schemas', () => {
  describe('CreateRideSchema', () => {
    it('should validate valid ride data', () => {
      const validData = {
        pickup_lat: 23.8103,
        pickup_lng: 90.4125,
        dropoff_lat: 23.7808,
        dropoff_lng: 90.4193,
        vehicle_type: 'CAR',
      };

      const result = CreateRideSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid latitude (out of range)', () => {
      const invalidData = {
        pickup_lat: 91,
        pickup_lng: 90.4125,
        dropoff_lat: 23.7808,
        dropoff_lng: 90.4193,
        vehicle_type: 'CAR',
      };

      const result = CreateRideSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid vehicle type', () => {
      const invalidData = {
        pickup_lat: 23.8103,
        pickup_lng: 90.4125,
        dropoff_lat: 23.7808,
        dropoff_lng: 90.4193,
        vehicle_type: 'BIKE',
      };

      const result = CreateRideSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should apply default gender_restriction', () => {
      const data = {
        pickup_lat: 23.8103,
        pickup_lng: 90.4125,
        dropoff_lat: 23.7808,
        dropoff_lng: 90.4193,
        vehicle_type: 'CNG',
      };

      const result = CreateRideSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender_restriction).toBe('ANY');
      }
    });
  });

  describe('CreatePoolSchema', () => {
    const validData = {
      pickup_lat: 23.8103,
      pickup_lng: 90.4125,
      destination_lat: 23.7808,
      destination_lng: 90.4193,
      vehicle_type: 'CAR',
    };

    it('should validate valid pool data', () => {
      const result = CreatePoolSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require a pickup location', () => {
      const { pickup_lat, ...withoutPickup } = validData;

      const result = CreatePoolSchema.safeParse(withoutPickup);
      expect(result.success).toBe(false);
    });

    it('should ignore a client-supplied max_passengers', () => {
      // Capacity is fixed per vehicle type on the server (CNG 2, CAR 3), so a
      // value sent by the client must never reach the pool row.
      const result = CreatePoolSchema.safeParse({ ...validData, max_passengers: 99 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('max_passengers');
      }
    });

    it('should default gender_restriction to ANY', () => {
      const result = CreatePoolSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender_restriction).toBe('ANY');
      }
    });
  });

  describe('GoOnlineSchema', () => {
    it('should validate valid go-online data', () => {
      const validData = {
        lat: 23.8103,
        lng: 90.4125,
        vehicle_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      };

      const result = GoOnlineSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for vehicle_id', () => {
      const invalidData = {
        lat: 23.8103,
        lng: 90.4125,
        vehicle_id: 'not-a-uuid',
      };

      const result = GoOnlineSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateLocationSchema', () => {
    it('should validate location update', () => {
      const validData = {
        lat: 23.8103,
        lng: 90.4125,
        heading: 45.5,
        speed_kmh: 30,
      };

      const result = UpdateLocationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject heading above 360', () => {
      const invalidData = {
        lat: 23.8103,
        lng: 90.4125,
        heading: 400,
      };

      const result = UpdateLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject speed above 200', () => {
      const invalidData = {
        lat: 23.8103,
        lng: 90.4125,
        speed_kmh: 250,
      };

      const result = UpdateLocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ProcessPaymentSchema', () => {
    it('should validate payment data', () => {
      const validData = {
        ride_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount: 150,
        payment_method: 'WALLET',
      };

      const result = ProcessPaymentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject zero amount', () => {
      const invalidData = {
        ride_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount: 0,
        payment_method: 'WALLET',
      };

      const result = ProcessPaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const invalidData = {
        ride_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount: -50,
        payment_method: 'WALLET',
      };

      const result = ProcessPaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid payment method', () => {
      const invalidData = {
        ride_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount: 150,
        payment_method: 'BITCOIN',
      };

      const result = ProcessPaymentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
