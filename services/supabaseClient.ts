import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    SUPABASE_CONFIG?: {
      URL: string;
      ANON_KEY: string;
    };
  }
}

const supabaseUrl = window.SUPABASE_CONFIG?.URL;
const supabaseAnonKey = window.SUPABASE_CONFIG?.ANON_KEY;

const isValidSupabaseUrl = (url?: string): url is string => {
    return !!url && (url.startsWith('http://') || url.startsWith('https://'));
};

export const isSupabaseConfigured = 
    isValidSupabaseUrl(supabaseUrl) && 
    !!supabaseAnonKey && 
    supabaseAnonKey !== 'TU_SUPABASE_ANON_KEY';

function createSupabaseClient(): SupabaseClient | null {
    if (isSupabaseConfigured) {
        // We can now safely assert that supabaseUrl and supabaseAnonKey are valid strings
        return createClient(supabaseUrl, supabaseAnonKey);
    }
    // No need to log an error, the UI will handle showing the notice.
    return null;
}

export const supabase = createSupabaseClient();