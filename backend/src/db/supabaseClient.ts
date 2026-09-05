import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let supabaseServiceClient: SupabaseClient | null = null;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseServiceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Supabase service-role client initialized successfully.');
  } catch (err) {
    console.warn('⚠️ Failed to initialize Supabase service-role client:', err);
  }
} else {
  console.info('ℹ️ Supabase credentials not fully provided. Operating in demo/mock data fallback mode.');
}

export const getSupabaseClient = () => supabaseServiceClient;
export const isSupabaseConfigured = () => supabaseServiceClient !== null;
