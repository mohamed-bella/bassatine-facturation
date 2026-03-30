import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('ATTENTION: Les clés Supabase ne sont pas configurées dans .env.local');
}

// Use native fetch bound to globalThis to bypass Chrome extensions that override window.fetch
const nativeFetch = globalThis.fetch.bind(globalThis);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: nativeFetch },
});
