'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import {
  isPdfFile,
  MAX_MODULE_UPLOAD_SIZE_BYTES,
  MODULE_UPLOAD_SIZE_ERROR_MESSAGE,
  TEACHER_MODULES_BUCKET,
} from '@/lib/modules/config'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

type UploadedModuleMetadataInput = {
  title: string
  description: string
  folderId: string | null
  fileName: string
  fileSize: number
  fileType: string
  storagePath: string
  returnPath: string | null
}

type UploadedModuleMetadataResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string }

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

function normalizeReturnPath(rawValue: string | null) {
  const raw = String(rawValue ?? '').trim()
  if (!raw) return null
  if (!raw.startsWith('/teacher/modules')) return null
  return raw
}

function validateUploadedStoragePath(storagePath: string, userId: string) {
  const expectedPrefix = `${userId}/`
  const fileName = storagePath.slice(expectedPrefix.length)

  return (
    storagePath.startsWith(expectedPrefix) &&
    storagePath === `${expectedPrefix}${fileName}` &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i.test(fileName)
  )
}

function getStoragePathParts(storagePath: string) {
  const slashIndex = storagePath.indexOf('/')
  if (slashIndex === -1) {
    return null
  }

  return {
    folderPath: storagePath.slice(0, slashIndex),
    objectName: storagePath.slice(slashIndex + 1),
  }
}

async function verifyUploadedObjectForMetadata({
  storagePath,
  fileName,
  fileSize,
  fileType,
  folderId,
}: {
  storagePath: string
  fileName: string
  fileSize: number
  fileType: string
  folderId: string | null
}): Promise<{ ok: true } | { ok: false; error: string; shouldCleanup: boolean }> {
  let serviceSupabase: ReturnType<typeof createServiceRoleSupabaseClient>
  const storagePathParts = getStoragePathParts(storagePath)

  if (!storagePathParts) {
    console.error('[module-upload] storage verification received invalid path parts', {
      bucketName: TEACHER_MODULES_BUCKET,
      fileName,
      fileSize,
      fileType,
      folderId,
      storagePath,
    })
    return {
      ok: false,
      error: 'Upload saved to storage but could not be verified.',
      shouldCleanup: true,
    }
  }

  try {
    serviceSupabase = createServiceRoleSupabaseClient()
  } catch (error) {
    console.error('[module-upload] storage verification could not create service client', {
      bucketName: TEACHER_MODULES_BUCKET,
      fileName,
      fileSize,
      fileType,
      folderId,
      storagePath,
      error: error instanceof Error ? error.message : 'Unknown service client error',
    })
    return {
      ok: false,
      error: 'Upload saved to storage but could not be verified.',
      shouldCleanup: true,
    }
  }

  const { data: existingModule, error: existingModuleError } = await serviceSupabase
    .from('modules')
    .select('id')
    .eq('storage_path', storagePath)
    .maybeSingle()

  if (existingModuleError) {
    console.error('[module-upload] storage path metadata lookup failed', {
      bucketName: TEACHER_MODULES_BUCKET,
      fileName,
      fileSize,
      fileType,
      folderId,
      storagePath,
      error: existingModuleError.message,
      code: existingModuleError.code,
    })
    return {
      ok: false,
      error: 'Upload saved to storage but could not be verified.',
      shouldCleanup: true,
    }
  }

  if (existingModule) {
    console.error('[module-upload] storage path is already linked to module metadata', {
      bucketName: TEACHER_MODULES_BUCKET,
      fileName,
      fileSize,
      fileType,
      folderId,
      storagePath,
      moduleId: existingModule.id,
    })
    return {
      ok: false,
      error: 'This upload has already been saved.',
      shouldCleanup: false,
    }
  }

  const { data: storageObjects, error: storageObjectError } = await serviceSupabase.storage
    .from(TEACHER_MODULES_BUCKET)
    .list(storagePathParts.folderPath, {
      limit: 100,
      offset: 0,
      search: storagePathParts.objectName,
    })

  if (storageObjectError) {
    console.error('[module-upload] uploaded object lookup failed', {
      bucketName: TEACHER_MODULES_BUCKET,
      fileName,
      fileSize,
      fileType,
      folderId,
      storagePath,
      error: storageObjectError.message,
      statusCode: 'statusCode' in storageObjectError ? storageObjectError.statusCode : undefined,
    })
    return {
      ok: false,
      error: 'Upload saved to storage but could not be verified.',
      shouldCleanup: true,
    }
  }

  const storageObject = (storageObjects ?? []).find(
    (object) => object.name === storagePathParts.objectName
  )

  if (!storageObject) {
    console.error('[module-upload] uploaded object was not found before metadata insert', {
      bucketName: TEACHER_MODULES_BUCKET,
      fileName,
      fileSize,
      fileType,
      folderId,
      storagePath,
      listedObjects: storageObjects?.map((object) => object.name) ?? [],
    })
    return {
      ok: false,
      error: 'Upload saved to storage but could not be verified.',
      shouldCleanup: false,
    }
  }

  console.info('[module-upload] uploaded object verified', {
    bucketName: TEACHER_MODULES_BUCKET,
    fileName,
    fileSize,
    fileType,
    folderId,
    storagePath,
    verificationResult: 'found',
  })

  return { ok: true }
}

async function cleanupUploadedModuleObject({
  storagePath,
  userId,
  fileName,
  fileSize,
  fileType,
  reason,
}: {
  storagePath: string
  userId: string
  fileName: string
  fileSize: number
  fileType: string
  reason: string
}) {
  if (!validateUploadedStoragePath(storagePath, userId)) {
    console.error('[module-upload] skipped orphan cleanup for invalid storage path', {
      fileName,
      fileSize,
      fileType,
      storagePath,
      reason,
    })
    return
  }

  try {
    const serviceSupabase = createServiceRoleSupabaseClient()
    const { error } = await serviceSupabase.storage
      .from(TEACHER_MODULES_BUCKET)
      .remove([storagePath])

    if (error) {
      console.error('[module-upload] orphan cleanup failed', {
        fileName,
        fileSize,
        fileType,
        storagePath,
        reason,
        error: error.message,
        statusCode: 'statusCode' in error ? error.statusCode : undefined,
      })
      return
    }

    console.info('[module-upload] orphan cleanup completed', {
      fileName,
      fileSize,
      fileType,
      storagePath,
      reason,
    })
  } catch (error) {
    console.error('[module-upload] orphan cleanup threw', {
      fileName,
      fileSize,
      fileType,
      storagePath,
      reason,
      error: error instanceof Error ? error.message : 'Unknown cleanup error',
    })
  }
}

async function failUploadedMetadataSave({
  error,
  storagePath,
  userId,
  fileName,
  fileSize,
  fileType,
  reason,
}: {
  error: string
  storagePath: string
  userId: string
  fileName: string
  fileSize: number
  fileType: string
  reason: string
}): Promise<UploadedModuleMetadataResult> {
  await cleanupUploadedModuleObject({
    storagePath,
    userId,
    fileName,
    fileSize,
    fileType,
    reason,
  })

  return { ok: false, error }
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

  if (file.size > MAX_MODULE_UPLOAD_SIZE_BYTES) {
    redirect(toResultUrl('error', MODULE_UPLOAD_SIZE_ERROR_MESSAGE, returnPath))
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
    await cleanupUploadedModuleObject({
      storagePath,
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/pdf',
      reason: 'legacy_metadata_insert_failed',
    })
    redirect(toResultUrl('error', insertError.message, returnPath))
  }

  revalidatePath('/teacher/modules')
  redirect(toResultUrl('success', 'Module uploaded', returnPath))
}

export async function createUploadedModuleRecord(
  input: UploadedModuleMetadataInput
): Promise<UploadedModuleMetadataResult> {
  const { supabase, user } = await requireApprovedTeacher()
  const returnPath = normalizeReturnPath(input.returnPath)

  const title = String(input.title ?? '').trim()
  const description = String(input.description ?? '').trim()
  const folderId = input.folderId ? String(input.folderId).trim() : null
  const fileName = String(input.fileName ?? '').trim()
  const fileSize = Number(input.fileSize)
  const fileType = String(input.fileType ?? '').trim()
  const storagePath = String(input.storagePath ?? '').trim()

  console.info('[module-upload] metadata save requested', {
    bucketName: TEACHER_MODULES_BUCKET,
    fileName,
    fileSize,
    fileType,
    folderId,
    storagePath,
    reachedServerAction: true,
  })

  if (!validateUploadedStoragePath(storagePath, user.id)) {
    return { ok: false, error: 'Uploaded file path is invalid.' }
  }

  const uploadedObjectVerification = await verifyUploadedObjectForMetadata({
    storagePath,
    fileName,
    fileSize,
    fileType,
    folderId,
  })

  if (!uploadedObjectVerification.ok) {
    if (uploadedObjectVerification.shouldCleanup) {
      return failUploadedMetadataSave({
        error: uploadedObjectVerification.error,
        storagePath,
        userId: user.id,
        fileName,
        fileSize,
        fileType,
        reason: 'uploaded_object_verification_failed',
      })
    }

    return { ok: false, error: uploadedObjectVerification.error }
  }

  const validationError = validateTitleAndDescription(title, description)
  if (validationError) {
    return failUploadedMetadataSave({
      error: validationError,
      storagePath,
      userId: user.id,
      fileName,
      fileSize,
      fileType,
      reason: 'title_or_description_validation_failed',
    })
  }

  if (!fileName || !fileName.toLowerCase().endsWith('.pdf')) {
    return failUploadedMetadataSave({
      error: 'Only PDF files are allowed',
      storagePath,
      userId: user.id,
      fileName,
      fileSize,
      fileType,
      reason: 'file_name_validation_failed',
    })
  }

  if (fileType && fileType !== 'application/pdf') {
    return failUploadedMetadataSave({
      error: 'Only PDF files are allowed',
      storagePath,
      userId: user.id,
      fileName,
      fileSize,
      fileType,
      reason: 'file_type_validation_failed',
    })
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return failUploadedMetadataSave({
      error: 'Please upload a PDF file',
      storagePath,
      userId: user.id,
      fileName,
      fileSize,
      fileType,
      reason: 'file_size_validation_failed',
    })
  }

  if (fileSize > MAX_MODULE_UPLOAD_SIZE_BYTES) {
    return failUploadedMetadataSave({
      error: MODULE_UPLOAD_SIZE_ERROR_MESSAGE,
      storagePath,
      userId: user.id,
      fileName,
      fileSize,
      fileType,
      reason: 'file_size_limit_exceeded',
    })
  }

  if (folderId) {
    const { data: folderRow, error: folderError } = await supabase
      .from('module_folders')
      .select('id')
      .eq('id', folderId)
      .maybeSingle()

    if (folderError || !folderRow) {
      console.error('[module-upload] folder validation failed', {
        bucketName: TEACHER_MODULES_BUCKET,
        folderId,
        fileName,
        fileSize,
        fileType,
        storagePath,
        error: folderError?.message,
      })
      return failUploadedMetadataSave({
        error: folderError?.message ?? 'Folder could not be verified.',
        storagePath,
        userId: user.id,
        fileName,
        fileSize,
        fileType,
        reason: 'folder_validation_failed',
      })
    }
  }

  const { data: teacherProfile, error: teacherProfileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (teacherProfileError) {
    console.error('[module-upload] teacher profile lookup failed', {
      bucketName: TEACHER_MODULES_BUCKET,
      fileName,
      fileSize,
      fileType,
      folderId,
      storagePath,
      error: teacherProfileError.message,
      code: teacherProfileError.code,
    })
    return failUploadedMetadataSave({
      error: 'Module details could not be saved.',
      storagePath,
      userId: user.id,
      fileName,
      fileSize,
      fileType,
      reason: 'teacher_profile_lookup_failed',
    })
  }

  const teacherName = teacherProfile.full_name?.trim() || null
  const moduleId = crypto.randomUUID()

  const { error: insertError } = await supabase.from('modules').insert({
    id: moduleId,
    teacher_id: user.id,
    title,
    description: description || null,
    teacher_name: teacherName,
    file_name: fileName,
    file_type: 'application/pdf',
    file_size: fileSize,
    storage_path: storagePath,
    folder_id: folderId,
  })

  if (insertError) {
    console.error('[module-upload] metadata insert failed', {
      bucketName: TEACHER_MODULES_BUCKET,
      fileName,
      fileSize,
      fileType,
      folderId,
      storagePath,
      error: insertError.message,
      code: insertError.code,
    })
    return failUploadedMetadataSave({
      error: 'Module details could not be saved.',
      storagePath,
      userId: user.id,
      fileName,
      fileSize,
      fileType,
      reason: 'metadata_insert_failed',
    })
  }

  revalidatePath('/teacher/modules')
  return {
    ok: true,
    redirectTo: toResultUrl('success', 'Module uploaded', returnPath),
  }
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
