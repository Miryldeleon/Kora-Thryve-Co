'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import {
  isPdfFile,
  MAX_PDF_FILE_SIZE_BYTES,
  TEACHER_MODULES_BUCKET,
} from '@/lib/modules/config'

function toModulesUrl(kind: 'error' | 'success', message: string) {
  const params = new URLSearchParams({ [kind]: message })
  return `/teacher/modules?${params.toString()}`
}

function resolveReturnPath(formData: FormData) {
  const raw = String(formData.get('return_to') ?? '').trim()
  if (!raw) return null
  if (!raw.startsWith('/teacher/modules')) return null
  return raw
}

function toResultUrl(
  kind: 'error' | 'success',
  message: string,
  returnPath: string | null
) {
  if (!returnPath) return toModulesUrl(kind, message)
  const separator = returnPath.includes('?') ? '&' : '?'
  return `${returnPath}${separator}${new URLSearchParams({ [kind]: message }).toString()}`
}

function getFileFromFormData(formData: FormData) {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return null
  }
  if (file.size === 0) {
    return null
  }
  return file
}

function validateTitleAndDescription(title: string, description: string) {
  if (!title) {
    return 'Module title is required'
  }
  if (title.length > 140) {
    return 'Module title must be 140 characters or fewer'
  }
  if (description.length > 2000) {
    return 'Module description must be 2000 characters or fewer'
  }
  return null
}

function normalizeFolderId(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim()
  return raw || null
}

async function resolveTeacherFullName(
  supabase: Awaited<ReturnType<typeof requireApprovedTeacher>>['supabase'],
  teacherId: string
) {
  const { data: teacherProfile, error: teacherProfileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', teacherId)
    .single()

  if (teacherProfileError) {
    redirect(toModulesUrl('error', teacherProfileError.message))
  }

  return teacherProfile.full_name?.trim() || null
}

export async function uploadModule(formData: FormData) {
  const { supabase, user } = await requireApprovedTeacher()
  const returnPath = resolveReturnPath(formData)

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const folderId = normalizeFolderId(formData.get('folder_id'))
  const file = getFileFromFormData(formData)

  const validationError = validateTitleAndDescription(title, description)
  if (validationError) {
    redirect(toResultUrl('error', validationError, returnPath))
  }

  if (!file) {
    redirect(toResultUrl('error', 'Please upload a PDF file', returnPath))
  }

  if (!isPdfFile(file)) {
    redirect(toResultUrl('error', 'Only PDF files are allowed', returnPath))
  }

  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    redirect(toResultUrl('error', 'PDF exceeds 15MB limit', returnPath))
  }

  if (folderId) {
    const { data: folderRow, error: folderError } = await supabase
      .from('module_folders')
      .select('id')
      .eq('id', folderId)
      .maybeSingle()

    if (folderError || !folderRow) {
      redirect(
        toResultUrl('error', folderError?.message ?? 'Selected folder was not found', returnPath)
      )
    }
  }

  const teacherName = await resolveTeacherFullName(supabase, user.id)

  const moduleId = crypto.randomUUID()
  const storagePath = `${user.id}/${moduleId}.pdf`

  const fileBytes = Buffer.from(await file.arrayBuffer())
  const { error: storageError } = await supabase.storage
    .from(TEACHER_MODULES_BUCKET)
    .upload(storagePath, fileBytes, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (storageError) {
    redirect(toResultUrl('error', storageError.message, returnPath))
  }

  const { error: insertError } = await supabase.from('modules').insert({
    id: moduleId,
    teacher_id: user.id,
    title,
    description: description || null,
    teacher_name: teacherName,
    file_name: file.name,
    file_type: 'application/pdf',
    file_size: file.size,
    storage_path: storagePath,
    folder_id: folderId,
  })

  if (insertError) {
    await supabase.storage.from(TEACHER_MODULES_BUCKET).remove([storagePath])
    redirect(toResultUrl('error', insertError.message, returnPath))
  }

  revalidatePath('/teacher/modules')
  redirect(toResultUrl('success', 'Module uploaded', returnPath))
}

export async function updateModuleMetadata(formData: FormData) {
  const { supabase, user } = await requireApprovedTeacher()
  const returnPath = resolveReturnPath(formData)
  const moduleId = String(formData.get('module_id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()

  if (!moduleId) {
    redirect(toResultUrl('error', 'Module id is required', returnPath))
  }

  const validationError = validateTitleAndDescription(title, description)
  if (validationError) {
    redirect(toResultUrl('error', validationError, returnPath))
  }

  const { error } = await supabase
    .from('modules')
    .update({
      title,
      description: description || null,
    })
    .eq('id', moduleId)
    .eq('teacher_id', user.id)

  if (error) {
    redirect(toResultUrl('error', error.message, returnPath))
  }

  revalidatePath('/teacher/modules')
  redirect(toResultUrl('success', 'Module updated', returnPath))
}

export async function createModuleFolder(formData: FormData) {
  const { supabase, user } = await requireApprovedTeacher()
  const returnPath = resolveReturnPath(formData)
  const name = String(formData.get('name') ?? '').trim()
  const parentFolderIdRaw = String(formData.get('parent_folder_id') ?? '').trim()
  const parentFolderId = parentFolderIdRaw || null

  if (!name) {
    redirect(toResultUrl('error', 'Folder name is required', returnPath))
  }

  if (name.length > 140) {
    redirect(toResultUrl('error', 'Folder name must be 140 characters or fewer', returnPath))
  }

  const { error } = await supabase.from('module_folders').insert({
    id: crypto.randomUUID(),
    created_by: user.id,
    name,
    parent_folder_id: parentFolderId,
  })

  if (error) {
    redirect(toResultUrl('error', error.message, returnPath))
  }

  revalidatePath('/teacher/modules')
  redirect(toResultUrl('success', 'Folder created', returnPath))
}

export async function moveModuleToFolder(formData: FormData) {
  const { supabase } = await requireApprovedTeacher()
  const returnPath = resolveReturnPath(formData)
  const moduleId = String(formData.get('module_id') ?? '').trim()
  const folderId = normalizeFolderId(formData.get('folder_id'))

  if (!moduleId) {
    redirect(toResultUrl('error', 'Module id is required', returnPath))
  }

  if (folderId) {
    const { data: folderRow, error: folderError } = await supabase
      .from('module_folders')
      .select('id')
      .eq('id', folderId)
      .maybeSingle()

    if (folderError || !folderRow) {
      redirect(
        toResultUrl('error', folderError?.message ?? 'Selected folder was not found', returnPath)
      )
    }
  }

  const { error } = await supabase.rpc('move_module_to_folder', {
    p_module_id: moduleId,
    p_folder_id: folderId,
  })

  if (error) {
    redirect(toResultUrl('error', error.message, returnPath))
  }

  revalidatePath('/teacher/modules')
  redirect(toResultUrl('success', 'Module folder updated', returnPath))
}
