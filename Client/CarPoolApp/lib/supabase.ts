import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// OAuth providers configuration
export const oAuthProviders = ['google', 'facebook'] as const;
export type OAuthProvider = typeof oAuthProviders[number];

export async function signInWithOAuth(provider: OAuthProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: process.env.EXPO_PUBLIC_REDIRECT_URL || 'carpoolapp://auth',
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    console.error('OAuth sign in error:', error);
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Get user error:', error);
    return null;
  }
  return user;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Get session error:', error);
    return null;
  }
  return session;
}
