
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Access Environment Variables injected by Vite
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

const isValidSupabaseUrl = (url?: string): url is string => {
    return !!url && (url.startsWith('http://') || url.startsWith('https://'));
};

export const isSupabaseConfigured = 
    isValidSupabaseUrl(supabaseUrl) && 
    !!supabaseAnonKey;

function createSupabaseClient(): SupabaseClient | null {
    if (isSupabaseConfigured) {
        return createClient(supabaseUrl, supabaseAnonKey);
    }
    console.warn("Supabase not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
    return null;
}

export const supabase = createSupabaseClient();
