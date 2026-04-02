'use server'

import { redirect } from 'next/navigation'
import { isAdminUser } from '@/lib/auth/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function toAdminLoginErrorUrl(message: string) {
  const encoded = encodeURIComponent(message)
  return `/admin/login?error=${encoded}`
}

export async function adminLoginWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    redirect(toAdminLoginErrorUrl('Email and password are required'))
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    redirect(toAdminLoginErrorUrl(error?.message ?? 'Unable to sign in'))
  }

  const isAdmin = await isAdminUser(data.user.id)
  if (!isAdmin) {
    await supabase.auth.signOut()
    redirect(toAdminLoginErrorUrl('This account is not an admin'))
  }

  redirect('/admin/dashboard')
}
