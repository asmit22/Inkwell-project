// config/supabase.js
// ─────────────────────────────────────────────────────────
//  Supabase client initialisation — used by all frontend JS
//  Reads credentials from window.__ENV injected by the server
//  so the real keys never appear in static source files.
// ─────────────────────────────────────────────────────────

const SUPABASE_URL  = window.__ENV?.SUPABASE_URL  || '';
const SUPABASE_ANON = window.__ENV?.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('[Inkwell] Supabase credentials missing. Check your .env and server config.');
}

// Initialise the Supabase JS client (v2)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
