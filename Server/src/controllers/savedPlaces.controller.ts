import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { z } from 'zod';

import { createdResponse, errorResponse, successResponse, unauthorizedResponse } from '../utils/response';

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
        return unauthorizedResponse(res, 'Authentication required');
      }

      const { data: places, error } = await supabaseAdmin
        .from('saved_places')
        .select('id, label, address, lat, lng, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      successResponse(res, {
        places: places || [],
        max_places: MAX_SAVED_PLACES,
      });
    } catch (error) {
      next(error);
    }
  }

  async createSavedPlace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = CreateSavedPlaceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const { count } = await supabaseAdmin
        .from('saved_places')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count && count >= MAX_SAVED_PLACES) {
        return errorResponse(res, 'LIMIT_REACHED', `Maximum ${MAX_SAVED_PLACES} saved places allowed`, 400);
      }

      const { label, address, lat, lng } = parseResult.data;

      const { data: existing } = await supabaseAdmin
        .from('saved_places')
        .select('id')
        .eq('user_id', userId)
        .eq('label', label)
        .single();

      if (existing) {
        return errorResponse(res, 'DUPLICATE_LABEL', 'A place with this label already exists', 400);
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

      createdResponse(res, { place });
    } catch (error) {
      next(error);
    }
  }

  async updateSavedPlace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const { placeId } = req.params;

      const parseResult = UpdateSavedPlaceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const updates = parseResult.data;

      if (Object.keys(updates).length === 0) {
        return errorResponse(res, 'NO_UPDATES', 'No valid fields to update', 400);
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
          return errorResponse(res, 'DUPLICATE_LABEL', 'A place with this label already exists', 400);
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

      successResponse(res, { place });
    } catch (error) {
      next(error);
    }
  }

  async deleteSavedPlace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
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

      successResponse(res, { message: 'Place deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getSavedPlace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const { placeId } = req.params;

      const { data: place, error } = await supabaseAdmin
        .from('saved_places')
        .select('id, label, address, lat, lng, created_at, updated_at')
        .eq('id', placeId)
        .eq('user_id', userId)
        .single();

      if (error || !place) {
        return errorResponse(res, 'NOT_FOUND', 'Place not found', 404);
      }

      successResponse(res, { place });
    } catch (error) {
      next(error);
    }
  }
}

export const savedPlacesController = new SavedPlacesController();
