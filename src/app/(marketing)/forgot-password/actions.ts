'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RoleHint = 'student' | 'teacher'

function normalizeRole(value: string | null): RoleHint | null {
  if (value === 'student' || value === 'teacher') return value
  return null
}

function buildRecoveryRedirectUrl(origin: string) {
  return `${origin}/reset-password`
}

async function resolveOrigin() {
  const headerStore = await headers()
  const forwardedHost = headerStore.get('x-forwarded-host')
  const host = forwardedHost || headerStore.get('host') || 'localhost:3000'
  const forwardedProto = headerStore.get('x-forwarded-proto')
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
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
  const origin = await resolveOrigin()
  const redirectTo = buildRecoveryRedirectUrl(origin)

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    redirect(buildReturnUrl(role, { error: error.message }))
  }

  redirect(buildReturnUrl(role, { sent: '1' }))
}
