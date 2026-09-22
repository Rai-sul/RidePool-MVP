import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { z } from 'zod';
import { logger } from '../utils/logger';

import { createdResponse, errorResponse, successResponse, unauthorizedResponse } from '../utils/response';

const SubmitRatingSchema = z.object({
  ride_id: z.string().uuid(),
  rated_user_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review: z.string().max(500).optional(),
  tags: z.array(z.string()).max(5).optional(),
});

const GetRatingsQuerySchema = z.object({
  page: z.string().transform((v) => parseInt(v) || 1).optional(),
  limit: z.string().transform((v) => Math.min(parseInt(v) || 10, 50)).optional(),
});

export class RatingController {
  async submitRating(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = SubmitRatingSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const { ride_id, rated_user_id, rating, review, tags } = parseResult.data;

      if (rated_user_id === userId) {
        return errorResponse(res, 'SELF_RATING', 'Cannot rate yourself', 400);
      }

      const { data: ride, error: rideError } = await supabaseAdmin
        .from('rides')
        .select('id, user_id, pool_id, status, pools(driver_id)')
        .eq('id', ride_id)
        .single();

      if (rideError || !ride) {
        return errorResponse(res, 'RIDE_NOT_FOUND', 'Ride not found', 404);
      }

      if (ride.status !== 'COMPLETED') {
        return errorResponse(res, 'RIDE_NOT_COMPLETED', 'Can only rate completed rides', 400);
      }

      const poolData = ride.pools as any;
      const isPassenger = ride.user_id === userId;
      const isDriver = poolData?.driver_id === userId;
      if (!isPassenger && !isDriver) {
        return errorResponse(res, 'NOT_PARTICIPANT', 'You were not part of this ride', 403);
      }

      const validRatedUser = isPassenger
        ? rated_user_id === poolData?.driver_id
        : ride.user_id === rated_user_id;

      if (!validRatedUser) {
        const { data: poolMember } = await supabaseAdmin
          .from('pool_members')
          .select('user_id')
          .eq('pool_id', ride.pool_id)
          .eq('user_id', rated_user_id)
          .single();

        if (!poolMember && rated_user_id !== poolData?.driver_id) {
          return errorResponse(res, 'INVALID_RATED_USER', 'User was not part of this ride', 400);
        }
      }

      const { data: existingRating } = await supabaseAdmin
        .from('ratings')
        .select('id')
        .eq('ride_id', ride_id)
        .eq('rater_id', userId)
        .eq('rated_id', rated_user_id)
        .single();

      if (existingRating) {
        return errorResponse(res, 'ALREADY_RATED', 'You have already rated this user for this ride', 400);
      }

      const { data: newRating, error: insertError } = await supabaseAdmin
        .from('ratings')
        .insert({
          ride_id,
          rater_id: userId,
          rated_id: rated_user_id,
          rating,
          comment: review || null,
          tags: tags || null,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      await this.updateUserAverageRating(rated_user_id);

      logger.info(`[Rating] User ${userId} rated ${rated_user_id} with ${rating} stars for ride ${ride_id}`);

      createdResponse(res, {
        rating_id: newRating.id,
        rating,
        message: 'Rating submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserRatings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const queryResult = GetRatingsQuerySchema.safeParse(req.query);
      const page = queryResult.success ? queryResult.data.page || 1 : 1;
      const limit = queryResult.success ? queryResult.data.limit || 10 : 10;
      const offset = (page - 1) * limit;

      const { data: ratings, error, count } = await supabaseAdmin
        .from('ratings')
        .select('id, rating, review:comment, tags, created_at, rater:users!rater_id(id)', { count: 'exact' })
        .eq('rated_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const { data: userStats } = await supabaseAdmin
        .from('users')
        .select('average_rating, total_ratings')
        .eq('id', userId)
        .single();

      successResponse(res, {
        ratings: ratings || [],
        summary: {
          average_rating: userStats?.average_rating || 0,
          total_ratings: userStats?.total_ratings || 0,
        },
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getRideRatings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { rideId } = req.params;

      const { data: ratings, error } = await supabaseAdmin
        .from('ratings')
        .select(`
          id,
          rating,
          review:comment,
          tags,
          created_at,
          rater:users!rater_id(id),
          rated:users!rated_id(id)
        `)
        .eq('ride_id', rideId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      successResponse(res, { ratings: ratings || [] });
    } catch (error) {
      next(error);
    }
  }

  async getMyRatings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const queryResult = GetRatingsQuerySchema.safeParse(req.query);
      const page = queryResult.success ? queryResult.data.page || 1 : 1;
      const limit = queryResult.success ? queryResult.data.limit || 10 : 10;
      const offset = (page - 1) * limit;

      const { data: received, error: receivedError, count: receivedCount } = await supabaseAdmin
        .from('ratings')
        .select('id, rating, review:comment, tags, created_at, ride_id, rater:users!rater_id(id)', { count: 'exact' })
        .eq('rated_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (receivedError) {
        throw receivedError;
      }

      const { data: userStats } = await supabaseAdmin
        .from('users')
        .select('average_rating, total_ratings')
        .eq('id', userId)
        .single();

      successResponse(res, {
        ratings_received: received || [],
        summary: {
          average_rating: userStats?.average_rating || 0,
          total_ratings: userStats?.total_ratings || 0,
        },
        pagination: {
          page,
          limit,
          total: receivedCount || 0,
          total_pages: Math.ceil((receivedCount || 0) / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getRatingBreakdown(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      const { data: ratings, error } = await supabaseAdmin
        .from('ratings')
        .select('rating')
        .eq('rated_id', userId);

      if (error) {
        throw error;
      }

      const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      (ratings || []).forEach((r) => {
        if (r.rating >= 1 && r.rating <= 5) {
          breakdown[r.rating as keyof typeof breakdown]++;
        }
      });

      const total = ratings?.length || 0;
      const average = total > 0
        ? Math.round((ratings!.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10
        : 0;

      successResponse(res, {
        breakdown,
        total,
        average,
      });
    } catch (error) {
      next(error);
    }
  }

  private async updateUserAverageRating(userId: string): Promise<void> {
    const { data: ratings } = await supabaseAdmin
      .from('ratings')
      .select('rating')
      .eq('rated_id', userId);

    if (!ratings || ratings.length === 0) {
      return;
    }

    const totalRatings = ratings.length;
    const averageRating = Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) * 10) / 10;

    await supabaseAdmin
      .from('users')
      .update({
        average_rating: averageRating,
        total_ratings: totalRatings,
      })
      .eq('id', userId);
  }
}

export const ratingController = new RatingController();
