import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from './env'

export function createServiceRoleSupabaseClient() {
  const { supabaseUrl } = getSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Missing Supabase env var: SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
