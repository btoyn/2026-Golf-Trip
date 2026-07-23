import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, SYNC_CONFIGURED } from './syncConfig'

/** Shared Supabase client, or null when sync isn't configured yet. */
export const supabase: SupabaseClient | null = SYNC_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null
