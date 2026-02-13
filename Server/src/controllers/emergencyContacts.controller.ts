import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { z } from 'zod';

const CreateEmergencyContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(6).max(20),
  relationship: z.string().max(50).optional(),
  is_primary: z.boolean().optional().default(false),
});

const UpdateEmergencyContactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(6).max(20).optional(),
  relationship: z.string().max(50).optional(),
  is_primary: z.boolean().optional(),
});

const MAX_EMERGENCY_CONTACTS = 5;

export class EmergencyContactsController {
  async getEmergencyContacts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: contacts, error } = await supabaseAdmin
        .from('emergency_contacts')
        .select('id, name, phone, relationship, is_primary, created_at')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: {
          contacts: contacts || [],
          max_contacts: MAX_EMERGENCY_CONTACTS,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async createEmergencyContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = CreateEmergencyContactSchema.safeParse(req.body);
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
        .from('emergency_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count && count >= MAX_EMERGENCY_CONTACTS) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'LIMIT_REACHED',
            message: `Maximum ${MAX_EMERGENCY_CONTACTS} emergency contacts allowed`,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { name, phone, relationship, is_primary } = parseResult.data;

      if (is_primary) {
        await supabaseAdmin
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('user_id', userId)
          .eq('is_primary', true);
      }

      const shouldBePrimary = is_primary || (count === 0);

      const { data: contact, error } = await supabaseAdmin
        .from('emergency_contacts')
        .insert({
          user_id: userId,
          name,
          phone,
          relationship: relationship || null,
          is_primary: shouldBePrimary,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(201).json({
        success: true,
        data: { contact },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEmergencyContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { contactId } = req.params;

      const parseResult = UpdateEmergencyContactSchema.safeParse(req.body);
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

      if (updates.is_primary === true) {
        await supabaseAdmin
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('user_id', userId)
          .eq('is_primary', true);
      }

      const { data: contact, error } = await supabaseAdmin
        .from('emergency_contacts')
        .update(updates)
        .eq('id', contactId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { contact },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteEmergencyContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { contactId } = req.params;

      const { data: deletedContact, error } = await supabaseAdmin
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (deletedContact?.is_primary) {
        const { data: firstContact } = await supabaseAdmin
          .from('emergency_contacts')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (firstContact) {
          await supabaseAdmin
            .from('emergency_contacts')
            .update({ is_primary: true })
            .eq('id', firstContact.id);
        }
      }

      res.json({
        success: true,
        data: { message: 'Contact deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async setPrimaryContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { contactId } = req.params;

      await supabaseAdmin
        .from('emergency_contacts')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);

      const { data: contact, error } = await supabaseAdmin
        .from('emergency_contacts')
        .update({ is_primary: true })
        .eq('id', contactId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: { contact },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPrimaryContact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { data: contact, error } = await supabaseAdmin
        .from('emergency_contacts')
        .select('id, name, phone, relationship, is_primary, created_at')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();

      if (error || !contact) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'No primary contact set' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { contact },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const emergencyContactsController = new EmergencyContactsController();
