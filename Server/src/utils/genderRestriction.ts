import { supabaseAdmin } from '../config/supabase';
import { GenderPreference } from '../types';
import { logger } from './logger';

/**
 * Resolve the gender restriction to apply to a ride, pool or search.
 *
 * A client can ask for FEMALE_ONLY, but only the stored profile decides
 * whether it is granted. Anything else falls back to ANY, so a manipulated
 * request can never place a user into a female-only pool.
 */
export async function resolveGenderRestriction(
  userId: string,
  requested?: string | null
): Promise<GenderPreference> {
  if (requested !== 'FEMALE_ONLY') {
    return 'ANY';
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('gender')
    .eq('id', userId)
    .single();

  if (error || !user) {
    logger.warn(`[Gender] Could not read profile for ${userId}, falling back to ANY`);
    return 'ANY';
  }

  if (user.gender !== 'FEMALE') {
    logger.warn(`[Gender] User ${userId} requested FEMALE_ONLY but profile gender is ${user.gender}`);
    return 'ANY';
  }

  return 'FEMALE_ONLY';
}
