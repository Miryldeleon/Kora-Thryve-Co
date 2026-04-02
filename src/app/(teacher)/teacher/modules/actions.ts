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

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const file = getFileFromFormData(formData)

  const validationError = validateTitleAndDescription(title, description)
  if (validationError) {
    redirect(toModulesUrl('error', validationError))
  }

  if (!file) {
    redirect(toModulesUrl('error', 'Please upload a PDF file'))
  }

  if (!isPdfFile(file)) {
    redirect(toModulesUrl('error', 'Only PDF files are allowed'))
  }

  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    redirect(toModulesUrl('error', 'PDF exceeds 15MB limit'))
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
    redirect(toModulesUrl('error', storageError.message))
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
  })

  if (insertError) {
    await supabase.storage.from(TEACHER_MODULES_BUCKET).remove([storagePath])
    redirect(toModulesUrl('error', insertError.message))
  }

  revalidatePath('/teacher/modules')
  redirect(toModulesUrl('success', 'Module uploaded'))
}

export async function updateModuleMetadata(formData: FormData) {
  const { supabase, user } = await requireApprovedTeacher()
  const moduleId = String(formData.get('module_id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()

  if (!moduleId) {
    redirect(toModulesUrl('error', 'Module id is required'))
  }

  const validationError = validateTitleAndDescription(title, description)
  if (validationError) {
    redirect(toModulesUrl('error', validationError))
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
    redirect(toModulesUrl('error', error.message))
  }

  revalidatePath('/teacher/modules')
  redirect(toModulesUrl('success', 'Module updated'))
}

export async function deleteModule(formData: FormData) {
  const { supabase, user } = await requireApprovedTeacher()
  const moduleId = String(formData.get('module_id') ?? '').trim()

  if (!moduleId) {
    redirect(toModulesUrl('error', 'Module id is required'))
  }

  const { data: moduleRow, error: moduleError } = await supabase
    .from('modules')
    .select('storage_path')
    .eq('id', moduleId)
    .eq('teacher_id', user.id)
    .maybeSingle()

  if (moduleError || !moduleRow) {
    redirect(toModulesUrl('error', moduleError?.message ?? 'Module not found'))
  }

  const { error: storageError } = await supabase.storage
    .from(TEACHER_MODULES_BUCKET)
    .remove([moduleRow.storage_path])

  if (storageError) {
    redirect(toModulesUrl('error', storageError.message))
  }

  const { error: deleteError } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId)
    .eq('teacher_id', user.id)

  if (deleteError) {
    redirect(toModulesUrl('error', deleteError.message))
  }

  revalidatePath('/teacher/modules')
  redirect(toModulesUrl('success', 'Module deleted'))
}
