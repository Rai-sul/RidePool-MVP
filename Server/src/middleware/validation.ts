import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);
export const GenderPreferenceEnum = z.enum(['FEMALE_ONLY', 'ANY']);
export const VehicleTypeEnum = z.enum(['CAR', 'CNG']);

export const RideStatusEnum = z.enum([
  'CREATING_POOL',
  'WAITING_FOR_DRIVER',
  'DRIVER_ASSIGNED',
  'STARTED',
  'COMPLETED',
  'CANCELLED',
]);

export const PoolStatusEnum = z.enum([
  'WAITING_FOR_RIDERS',
  'WAITING_FOR_DRIVER',
  'READY_TO_START',
  'STARTED',
  'COMPLETED',
  'CANCELLED',
]);

export const DriverStatusEnum = z.enum(['ONLINE', 'OFFLINE', 'BUSY']);

export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const CreateRideSchema = z.object({
  pickup_lat: z.number().min(-90).max(90),
  pickup_lng: z.number().min(-180).max(180),
  pickup_address: z.string().max(500).optional(),
  dropoff_lat: z.number().min(-90).max(90),
  dropoff_lng: z.number().min(-180).max(180),
  dropoff_address: z.string().max(500).optional(),
  vehicle_type: VehicleTypeEnum,
  gender_restriction: GenderPreferenceEnum.optional().default('ANY'),
});

export const CreatePoolSchema = z.object({
  pickup_lat: z.number().min(-90).max(90),
  pickup_lng: z.number().min(-180).max(180),
  pickup_address: z.string().max(500).optional(),
  pickup_name: z.string().max(200).optional(),
  destination_lat: z.number().min(-90).max(90),
  destination_lng: z.number().min(-180).max(180),
  destination_address: z.string().max(500).optional(),
  destination_name: z.string().max(200).optional(),
  vehicle_type: VehicleTypeEnum,
  max_passengers: z.number().int().min(2).max(4).default(4),
  gender_restriction: GenderPreferenceEnum.optional().default('ANY'),
});

export const JoinPoolSchema = z.object({
  ride_id: z.string().uuid(),
});

export const GoOnlineSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  vehicle_id: z.string().uuid().optional(),
  heading: z.number().min(0).max(360).optional(),
});

export const UpdateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed_kmh: z.number().min(0).max(200).optional(),
});

export const SetPriorityLocationSchema = z.object({
  priority_lat: z.number().min(-90).max(90),
  priority_lng: z.number().min(-180).max(180),
  priority_address: z.string().max(500).optional(),
});

export const SearchZoneSchema = z.object({
  destination_lat: z.number().min(-90).max(90),
  destination_lng: z.number().min(-180).max(180),
  destination_address: z.string().max(500).optional(),
});

export const RegisterVehicleSchema = z.object({
  vehicle_type: z.enum(['CAR', 'CNG']),
  vehicle_number: z.string().min(1).max(20),
  model: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
});

export const CancelRideSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const UpdateProfileSchema = z.object({
  gender: GenderEnum.optional(),
  gender_preference: GenderPreferenceEnum.optional(),
  full_name: z.string().min(2).max(100).optional(),
  driver_priority_lat: z.number().min(-90).max(90).optional(),
  driver_priority_lng: z.number().min(-180).max(180).optional(),
  driver_priority_address: z.string().max(500).optional(),
});

export const SearchPoolsSchema = z.object({
  pickup_lat: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(-90).max(90)),
  pickup_lng: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(-180).max(180)),
  dropoff_lat: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(-90).max(90)),
  dropoff_lng: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(-180).max(180)),
  vehicle_type: VehicleTypeEnum,
  gender_restriction: GenderPreferenceEnum.optional().default('ANY'),
});

export const PoolPreviewSchema = z.object({
  pickup_lat: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(-90).max(90)),
  pickup_lng: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(-180).max(180)),
  dropoff_lat: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(-90).max(90)),
  dropoff_lng: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(-180).max(180)),
  pickup_address: z.string().max(500).optional(),
  pickup_name: z.string().max(200).optional(),
  dropoff_address: z.string().max(500).optional(),
  dropoff_name: z.string().max(200).optional(),
});

export const ProcessPaymentSchema = z.object({
  ride_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(['WALLET', 'CARD', 'MOBILE_BANKING', 'CASH']),
  idempotency_key: z.string().uuid().optional(),
});

export const PriyoSathiAddSchema = z.object({
  companion_id: z.string().uuid(),
});

export const UUIDParamSchema = z.object({
  id: z.string().uuid(),
});

export const PoolIdParamSchema = z.object({
  poolId: z.string().uuid(),
});

export const RideIdParamSchema = z.object({
  rideId: z.string().uuid(),
});

export const PassengerIdParamSchema = z.object({
  passengerId: z.string().uuid(),
});

export const CompanionIdParamSchema = z.object({
  companionId: z.string().uuid(),
});

export function validate<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors,
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (source === 'body') {
        req.body = result.data;
      } else if (source === 'query') {
        (req as any).validatedQuery = result.data;
      } else {
        (req as any).validatedParams = result.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
