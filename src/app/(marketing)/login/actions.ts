'use server'

import { redirect } from 'next/navigation'
import {
  getRedirectPathForProfile,
  isApprovalStatus,
  isUserRole,
  type UserRole,
  type UserProfile,
} from '@/lib/auth/access'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function toLoginErrorUrl(message: string, role?: UserRole) {
  const encoded = encodeURIComponent(message)
  if (role) {
    return `/login/${role}?error=${encoded}`
  }
  return `/login?error=${encoded}`
}

export async function loginWithEmailPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '').trim()
  const selectedRole = String(formData.get('role') ?? '')
  const role = isUserRole(selectedRole) ? selectedRole : undefined

  if (!email || !password) {
    redirect(toLoginErrorUrl('Email and password are required', role))
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    redirect(toLoginErrorUrl(error?.message || 'Invalid email or password', role))
  }

  if (data.session?.access_token && data.session?.refresh_token) {
    // Ensure the same request context has an established auth session before profile lookup.
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  }

  const {
    data: { user: signedInUser },
  } = await supabase.auth.getUser()
  const profileUserId = signedInUser?.id || data.user.id

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, approval_status')
    .eq('id', profileUserId)
    .maybeSingle()

  if (profileError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[loginWithEmailPassword] profile lookup failed', {
        userId: profileUserId,
        message: profileError.message,
      })
    }
    redirect(toLoginErrorUrl('Unable to load your profile right now. Please try again.', role))
  }

  if (!profile) {
    redirect(toLoginErrorUrl('No profile is linked to this account yet.', role))
  }

  if (!isUserRole(profile.role) || !isApprovalStatus(profile.approval_status)) {
    await supabase.auth.signOut()
    redirect(toLoginErrorUrl('Invalid profile configuration', role))
  }

  const userProfile: UserProfile = {
    role: profile.role,
    approval_status: profile.approval_status,
  }

  if (role && userProfile.role !== role) {
    await supabase.auth.signOut()
    redirect(toLoginErrorUrl(`This account is not a ${role}`, role))
  }

  const redirectPath = getRedirectPathForProfile(userProfile)

  if (
    next &&
    next.startsWith('/') &&
    userProfile.approval_status === 'approved' &&
    ((userProfile.role === 'teacher' && next.startsWith('/teacher')) ||
      (userProfile.role === 'student' && next.startsWith('/student')))
  ) {
    redirect(next)
  }

  redirect(redirectPath)
}
