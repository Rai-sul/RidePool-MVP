import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import {
  successResponse,
  createdResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  conflictResponse,
} from '../utils/response';
import { logger } from '../utils/logger';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  gender_preference: z.enum(['FEMALE_ONLY', 'ANY']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validationResult = registerSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((e: z.core.$ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return validationErrorResponse(res, 'Validation failed', { errors });
      }

      const { email, password, phone, full_name, gender, gender_preference } =
        validationResult.data;

      if (gender === 'FEMALE' && !gender_preference) {
        return validationErrorResponse(
          res,
          'Female users must specify gender preference'
        );
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            phone,
            gender,
          },
        },
      });

      if (authError) {
        logger.error('Auth signup error:', authError);

        if (authError.message.includes('already registered')) {
          return conflictResponse(res, 'User with this email already exists');
        }

        return errorResponse(
          res,
          'AUTH_ERROR',
          authError.message,
          400
        );
      }

      if (!authData.user) {
        return errorResponse(res, 'AUTH_ERROR', 'Failed to create user', 500);
      }

      const { error: profileError } = await supabaseAdmin.from('users').insert({
        id: authData.user.id,
        phone,
        phone_verified: false,
        gender,
        gender_preference: gender_preference || 'ANY',
        is_driver: false,
        average_rating: null,
        total_ratings: 0,
        total_rides: 0,
      });

      if (profileError) {
        logger.error('Profile creation error:', profileError);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return errorResponse(
          res,
          'PROFILE_ERROR',
          'Failed to create user profile',
          500
        );
      }

      const { error: walletError } = await supabaseAdmin.from('wallets').insert({
        user_id: authData.user.id,
        balance: 0,
        currency: 'BDT',
      });

      if (walletError) {
        logger.warn('Wallet creation warning:', walletError);
      }

      logger.info(`User registered: ${authData.user.id}`);

      return createdResponse(
        res,
        {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            phone,
            full_name,
            gender,
            gender_preference: gender_preference || 'ANY',
          },
          session: authData.session
            ? {
                access_token: authData.session.access_token,
                refresh_token: authData.session.refresh_token,
                expires_at: authData.session.expires_at,
              }
            : null,
        },
        'Registration successful. Please verify your email.'
      );
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validationResult = loginSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((e: z.core.$ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return validationErrorResponse(res, 'Validation failed', { errors });
      }

      const { email, password } = validationResult.data;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.warn(`Login failed for ${email}: ${error.message}`);
        return unauthorizedResponse(res, 'Invalid email or password');
      }

      if (!data.session || !data.user) {
        return unauthorizedResponse(res, 'Authentication failed');
      }

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      logger.info(`User logged in: ${data.user.id}`);

      return successResponse(res, {
        user: {
          id: data.user.id,
          email: data.user.email,
          ...profile,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.warn('Logout error:', error);
      }

      logger.info(`User logged out: ${req.user?.id}`);

      return successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const validationResult = refreshSchema.safeParse(req.body);

      if (!validationResult.success) {
        return validationErrorResponse(res, 'Refresh token is required');
      }

      const { refresh_token } = validationResult.data;

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token,
      });

      if (error || !data.session) {
        return unauthorizedResponse(res, 'Invalid or expired refresh token');
      }

      return successResponse(res, {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, type } = req.query;

      if (!token || type !== 'email') {
        return validationErrorResponse(res, 'Invalid verification link');
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: token as string,
        type: 'email',
      });

      if (error) {
        return errorResponse(
          res,
          'VERIFICATION_ERROR',
          'Email verification failed',
          400
        );
      }

      return successResponse(res, null, 'Email verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validationResult = resetPasswordSchema.safeParse(req.body);

      if (!validationResult.success) {
        return validationErrorResponse(res, 'Valid email is required');
      }

      const { email } = validationResult.data;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
      });

      if (error) {
        logger.warn('Password reset error:', error);
      }

      return successResponse(
        res,
        null,
        'If an account exists with this email, a password reset link has been sent'
      );
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validationResult = changePasswordSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((e: z.core.$ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return validationErrorResponse(res, 'Validation failed', { errors });
      }

      const { new_password } = validationResult.data;

      const { error } = await supabase.auth.updateUser({
        password: new_password,
      });

      if (error) {
        return errorResponse(
          res,
          'PASSWORD_ERROR',
          'Failed to change password',
          400
        );
      }

      logger.info(`Password changed for user: ${req.user?.id}`);

      return successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return unauthorizedResponse(res);
      }

      const { data: profile, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        return errorResponse(res, 'PROFILE_ERROR', 'User profile not found', 404);
      }

      return successResponse(res, {
        id: req.user.id,
        email: req.user.email,
        ...profile,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
