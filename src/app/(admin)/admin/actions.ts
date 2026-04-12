'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/lib/auth/admin'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function resolveAdminReturnPath(formData: FormData) {
  const raw = String(formData.get('return_to') ?? '').trim()
  if (!raw) return '/admin/modules'
  if (!raw.startsWith('/admin/modules')) return '/admin/modules'
  return raw
}

function toAdminResultUrl(kind: 'error' | 'success', message: string, returnPath: string) {
  const separator = returnPath.includes('?') ? '&' : '?'
  return `${returnPath}${separator}${new URLSearchParams({ [kind]: message }).toString()}`
}

export async function adminSignOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

export async function deleteModuleAsAdmin(formData: FormData) {
  const { supabase } = await requireAdminAccess()
  const returnPath = resolveAdminReturnPath(formData)
  const moduleId = String(formData.get('module_id') ?? '').trim()

  if (!moduleId) {
    redirect(toAdminResultUrl('error', 'Module id is required', returnPath))
  }

  const { data: moduleRow, error: moduleError } = await supabase
    .from('modules')
    .select('storage_path')
    .eq('id', moduleId)
    .maybeSingle()

  if (moduleError || !moduleRow) {
    redirect(toAdminResultUrl('error', moduleError?.message ?? 'Module not found', returnPath))
  }

  const { error: storageError } = await supabase.storage
    .from(TEACHER_MODULES_BUCKET)
    .remove([moduleRow.storage_path])

  if (storageError) {
    redirect(toAdminResultUrl('error', storageError.message, returnPath))
  }

  const { error: deleteError } = await supabase.from('modules').delete().eq('id', moduleId)
  if (deleteError) {
    redirect(toAdminResultUrl('error', deleteError.message, returnPath))
  }

  revalidatePath('/teacher/modules')
  revalidatePath('/teacher/modules/folders/[folderId]', 'page')
  revalidatePath('/student/modules')
  revalidatePath('/student/modules/folders/[folderId]', 'page')
  revalidatePath('/admin/modules')
  redirect(toAdminResultUrl('success', 'Module deleted', returnPath))
}

export async function deleteModuleFolderAsAdmin(formData: FormData) {
  const { supabase } = await requireAdminAccess()
  const returnPath = resolveAdminReturnPath(formData)
  const folderId = String(formData.get('folder_id') ?? '').trim()

  if (!folderId) {
    redirect(toAdminResultUrl('error', 'Folder id is required', returnPath))
  }

  const { error: ungroupError } = await supabase
    .from('modules')
    .update({ folder_id: null })
    .eq('folder_id', folderId)

  if (ungroupError) {
    redirect(toAdminResultUrl('error', ungroupError.message, returnPath))
  }

  const { error: deleteError } = await supabase
    .from('module_folders')
    .delete()
    .eq('id', folderId)

  if (deleteError) {
    redirect(toAdminResultUrl('error', deleteError.message, returnPath))
  }

  revalidatePath('/teacher/modules')
  revalidatePath('/teacher/modules/folders/[folderId]', 'page')
  revalidatePath('/student/modules')
  revalidatePath('/student/modules/folders/[folderId]', 'page')
  revalidatePath('/admin/modules')
  redirect(toAdminResultUrl('success', 'Folder deleted and modules ungrouped', returnPath))
}
