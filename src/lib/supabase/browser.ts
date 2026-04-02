'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './env'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createBrowserSupabaseClient() {
  if (client) {
    return client
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()
  client = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return client
}
