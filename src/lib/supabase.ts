import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing env var: SUPABASE_URL');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY');
}

// Server-side only — uses the service role key which bypasses RLS.
// Never expose this client to the browser.
export const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
