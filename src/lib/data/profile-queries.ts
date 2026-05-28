import type { SupabaseClient } from '@supabase/supabase-js'

export type ProfileSummaryRow = {
  id: string
  full_name: string | null
  email: string | null
}

export type CurrentProfileRow = {
  id: string
  role: string | null
  approval_status: string | null
  full_name: string | null
  age: number | null
  location: string | null
  created_at: string
}

export async function listProfileSummariesById(supabase: SupabaseClient, profileIds: string[]) {
  if (profileIds.length === 0) return { profiles: [] as ProfileSummaryRow[], error: null }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', profileIds)

  return { profiles: (data ?? []) as ProfileSummaryRow[], error }
}

export async function getCurrentProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, approval_status, full_name, age, location, created_at')
    .eq('id', userId)
    .maybeSingle()

  return { profile: (data ?? null) as CurrentProfileRow | null, error }
}

export async function updateCurrentProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: { full_name: string | null; age: number | null; location: string | null }
) {
  const { error } = await supabase.from('profiles').update(profile).eq('id', userId)
  return { error }
}
