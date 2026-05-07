import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only Supabase client using the service-role key.
// Bypasses RLS — never import this from a Vue component or composable.

let cached: SupabaseClient | null = null

export function getServiceSupabase(): SupabaseClient {
  if (cached) return cached

  const config = useRuntimeConfig()
  const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const key = config.supabaseServiceKey

  if (!url) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SUPABASE_URL is not configured',
    })
  }
  if (!key) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_SUPABASE_SERVICE_KEY is not configured',
    })
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
