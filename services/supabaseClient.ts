
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Access Environment Variables safely using Vite's import.meta.env
// FIX: Cast import.meta to any to avoid TypeScript error 'Property env does not exist on type ImportMeta'
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
    console.warn("Supabase not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.");
    return null;
}

export const supabase = createSupabaseClient();
