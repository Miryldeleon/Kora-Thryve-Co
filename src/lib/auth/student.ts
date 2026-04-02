import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function requireApprovedStudent() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login/student')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, approval_status')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'student' || profile.approval_status !== 'approved') {
    redirect('/access-rejected')
  }

  return { supabase, user }
}
