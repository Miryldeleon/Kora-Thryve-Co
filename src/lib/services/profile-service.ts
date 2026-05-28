import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getCurrentProfile, updateCurrentProfile } from '@/lib/data/profile-queries'

export async function getProfileForCurrentUser(supabase: SupabaseClient, user: User) {
  const { profile, error } = await getCurrentProfile(supabase, user.id)

  if (error || !profile) {
    return { ok: false as const, error: error?.message || 'Profile not found.', status: 404 }
  }

  return {
    ok: true as const,
    data: {
      profile: {
        ...profile,
        email: user.email || '',
      },
    },
  }
}

export async function updateProfileForCurrentUser(
  supabase: SupabaseClient,
  user: User,
  profile: { full_name: string | null; age: number | null; location: string | null }
) {
  const { error } = await updateCurrentProfile(supabase, user.id, profile)
  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: {} }
}
