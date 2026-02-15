import { z } from 'zod';

export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
});

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  pickup: z.string(),
  destination: z.string(),
  rating: z.number().min(0).max(5).optional(),
  phone: z.string().optional(),
});

export const PoolSchema = z.object({
  id: z.string(),
  customers: z.array(CustomerSchema),
  totalEarnings: z.number(),
  distance: z.number(),
  estimatedTime: z.number(),
  firstPickup: z.string(),
  finalDestination: z.string(),
  isPriority: z.boolean(),
  status: z.enum(['WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const DriverStatusSchema = z.enum(['ONLINE', 'OFFLINE', 'BUSY']);

export const EarningEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  passengers: z.number(),
  amount: z.number(),
  distance: z.number(),
  poolId: z.string().optional(),
});

export const DriverProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  rating: z.number().min(0).max(5),
  totalRides: z.number(),
  acceptanceRate: z.number().min(0).max(100),
  vehicle: z.object({
    make: z.string(),
    model: z.string(),
    year: z.number(),
    color: z.string(),
    licensePlate: z.string(),
    isVerified: z.boolean(),
  }),
  location: z.string().optional(),
  createdAt: z.string().optional(),
});

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Invalid phone number'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  vehicle_type: z.enum(['CAR', 'CNG']),
  vehicle_plate: z.string().min(1, 'Vehicle plate is required'),
  vehicle_model: z.string().min(1, 'Vehicle model is required'),
  driving_license: z.string().min(1, 'Driving license is required'),
});

export type Location = z.infer<typeof LocationSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type Pool = z.infer<typeof PoolSchema>;
export type DriverStatus = z.infer<typeof DriverStatusSchema>;
export type EarningEntry = z.infer<typeof EarningEntrySchema>;
export type DriverProfile = z.infer<typeof DriverProfileSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in?: number;
}

export interface Vehicle {
  id: string;
  vehicle_type: 'CAR' | 'CNG';
  vehicle_number: string;
  model?: string;
  max_passengers?: number;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  is_driver?: boolean;
  average_rating?: number;
  total_rides?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | string;
  timestamp?: string;
}
