'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

type RoleHint = 'student' | 'teacher'

function normalizeRole(value: string | null): RoleHint | null {
  if (value === 'student' || value === 'teacher') return value
  return null
}

function buildRecoveryRedirectUrl(origin: string) {
  return new URL('/reset-password', origin).toString()
}

function buildReturnUrl(role: RoleHint | null, params: Record<string, string>) {
  const query = new URLSearchParams()
  if (role) {
    query.set('role', role)
  }
  Object.entries(params).forEach(([key, value]) => {
    query.set(key, value)
  })
  const queryString = query.toString()
  if (!queryString) return '/forgot-password'
  return `/forgot-password?${queryString}`
}

export async function sendPasswordResetEmail(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const role = normalizeRole(String(formData.get('role') ?? ''))

  if (!email) {
    redirect(buildReturnUrl(role, { error: 'Email is required' }))
  }

  const supabase = await createServerSupabaseClient()
  const origin = await getSiteUrl()
  const redirectTo = buildRecoveryRedirectUrl(origin)

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    redirect(buildReturnUrl(role, { error: error.message }))
  }

  redirect(buildReturnUrl(role, { sent: '1' }))
}
