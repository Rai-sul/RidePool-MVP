import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { z } from 'zod';

const CreateSavedPlaceSchema = z.object({
  label: z.string().min(1).max(50),
  address: z.string().min(5).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const UpdateSavedPlaceSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  address: z.string().min(5).max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

const MAX_SAVED_PLACES = 10;

export class SavedPlacesController {
  async getSavedPlaces(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: places, error } = await supabaseAdmin
        .from('saved_places')
        .select('id, label, address, lat, lng, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: {
          places: places || [],
          max_places: MAX_SAVED_PLACES,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async createSavedPlace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = CreateSavedPlaceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { count } = await supabaseAdmin
        .from('saved_places')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count && count >= MAX_SAVED_PLACES) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'LIMIT_REACHED',
            message: `Maximum ${MAX_SAVED_PLACES} saved places allowed`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { label, address, lat, lng } = parseResult.data;

      const { data: existing } = await supabaseAdmin
        .from('saved_places')
        .select('id')
        .eq('user_id', userId)
        .eq('label', label)
        .single();

      if (existing) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_LABEL', message: 'A place with this label already exists' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: place, error } = await supabaseAdmin
        .from('saved_places')
        .insert({
          user_id: userId,
          label,
          address,
          lat,
          lng,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(201).json({
        success: true,
        data: { place },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSavedPlace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { placeId } = req.params;

      const parseResult = UpdateSavedPlaceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const updates = parseResult.data;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_UPDATES', message: 'No valid fields to update' },
          timestamp: new Date().toISOString(),
        });
      }

      if (updates.label) {
        const { data: existing } = await supabaseAdmin
          .from('saved_places')
          .select('id')
          .eq('user_id', userId)
          .eq('label', updates.label)
          .neq('id', placeId)
          .single();

        if (existing) {
          return res.status(400).json({
            success: false,
            error: { code: 'DUPLICATE_LABEL', message: 'A place with this label already exists' },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const { data: place, error } = await supabaseAdmin
        .from('saved_places')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', placeId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { place },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSavedPlace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { placeId } = req.params;

      const { error } = await supabaseAdmin
        .from('saved_places')
        .delete()
        .eq('id', placeId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { message: 'Place deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getSavedPlace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { placeId } = req.params;

      const { data: place, error } = await supabaseAdmin
        .from('saved_places')
        .select('id, label, address, lat, lng, created_at, updated_at')
        .eq('id', placeId)
        .eq('user_id', userId)
        .single();

      if (error || !place) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Place not found' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { place },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const savedPlacesController = new SavedPlacesController();
