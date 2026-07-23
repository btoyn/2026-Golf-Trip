/* build marker: redeploy 2 — force Vercel to pick up live-sync credentials */
/**
 * Supabase connection for the live "follow along" scoreboard.
 *
 * Fill these two constants with your Supabase project's values (Project
 * Settings → API): the Project URL and the anon/public key. The anon key is
 * safe to ship in the client — it's designed to be public and is limited by
 * the table's row-level-security policies.
 *
 * Env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) take precedence if set.
 */
const CONST_URL = 'https://egrtwvkcoxqcfdvmewyo.supabase.co'
const CONST_ANON_KEY = 'sb_publishable_QQTiWT5F5YP8Xmeh6i2o7w_Z3LadRnX'

const ENV_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const SUPABASE_URL = (ENV_URL || CONST_URL).trim()
export const SUPABASE_ANON_KEY = (ENV_KEY || CONST_ANON_KEY).trim()

/** True once real credentials are present; sync UI stays inert until then. */
export const SYNC_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** Name of the table holding one row per trip code. */
export const GAMES_TABLE = 'games'
