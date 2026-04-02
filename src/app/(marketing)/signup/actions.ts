'use server'

import { redirect } from 'next/navigation'
import { isUserRole, type UserRole } from '@/lib/auth/access'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function toSignupErrorUrl(message: string, role: UserRole) {
  const encoded = encodeURIComponent(message)
  return `/signup/${role}?error=${encoded}`
}

export async function signUpWithEmailPassword(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const selectedRole = String(formData.get('role') ?? '')

  if (!isUserRole(selectedRole)) {
    redirect('/signup')
  }

  if (!fullName) {
    redirect(toSignupErrorUrl('Full name is required', selectedRole))
  }

  if (!email || !password) {
    redirect(toSignupErrorUrl('Full name, email, and password are required', selectedRole))
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: selectedRole,
      },
    },
  })

  if (error) {
    redirect(toSignupErrorUrl(error.message, selectedRole))
  }

  if (!data.user?.id) {
    redirect(toSignupErrorUrl('Could not create your profile. Please try again.', selectedRole))
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', data.user.id)

  if (profileError) {
    redirect(toSignupErrorUrl(profileError.message, selectedRole))
  }

  redirect('/pending-approval')
}
