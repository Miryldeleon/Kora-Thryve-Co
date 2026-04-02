'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAccess } from '@/lib/auth/admin'

async function updateApprovalStatus(profileId: string, status: 'approved' | 'rejected') {
  const { supabase } = await requireAdminAccess()

  const { error } = await supabase
    .from('profiles')
    .update({ approval_status: status })
    .eq('id', profileId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/approvals')
  revalidatePath('/admin/dashboard')
}

export async function approveProfile(formData: FormData) {
  const profileId = String(formData.get('profile_id') ?? '')
  if (!profileId) return

  await updateApprovalStatus(profileId, 'approved')
}

export async function rejectProfile(formData: FormData) {
  const profileId = String(formData.get('profile_id') ?? '')
  if (!profileId) return

  await updateApprovalStatus(profileId, 'rejected')
}
