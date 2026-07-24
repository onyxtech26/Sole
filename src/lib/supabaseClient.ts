import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Single shared browser client. Auth session is persisted to localStorage and
// auto-refreshed so a logged-in operator stays signed in across reloads.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sole_supabase_auth',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
