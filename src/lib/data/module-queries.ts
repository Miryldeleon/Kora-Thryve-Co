import type { SupabaseClient } from '@supabase/supabase-js'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'

export type TeachingModuleRow = {
  id: string
  folder_id: string | null
  title: string
  description: string | null
  teacher_name: string | null
  storage_path: string
}

export type TeachingFolderRow = {
  id: string
  name: string
}

export type TeachingModuleWithUrl = TeachingModuleRow & {
  signedUrl: string | null
}

export type RecentModuleRow = {
  id: string
  title: string
  teacher_name?: string | null
  created_at: string
}

export async function listRecentModules(
  supabase: SupabaseClient,
  input: { limit: number; teacherId?: string }
) {
  if (input.teacherId) {
    const { data, error } = await supabase
      .from('modules')
      .select('id, title, created_at')
      .eq('teacher_id', input.teacherId)
      .order('created_at', { ascending: false })
      .limit(input.limit)

    return { modules: (data ?? []) as RecentModuleRow[], error }
  }

  const { data, error } = await supabase
    .from('modules')
    .select('id, title, teacher_name, created_at')
    .order('created_at', { ascending: false })
    .limit(input.limit)

  return { modules: (data ?? []) as RecentModuleRow[], error }
}

export async function listTeachingModules(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('modules')
    .select('id, folder_id, title, description, teacher_name, storage_path')
    .order('created_at', { ascending: false })

  return { modules: (data ?? []) as TeachingModuleRow[], error }
}

export async function listTeachingFolders(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('module_folders')
    .select('id, name')
    .order('created_at', { ascending: true })

  return { folders: (data ?? []) as TeachingFolderRow[], error }
}

export async function createModuleSignedUrls<TModule extends { storage_path: string }>(
  supabase: SupabaseClient,
  modules: TModule[],
  expiresInSeconds = 60 * 10
) {
  if (modules.length === 0) return []

  const storagePaths = modules.map((module) => module.storage_path)
  const { data } = await supabase.storage
    .from(TEACHER_MODULES_BUCKET)
    .createSignedUrls(storagePaths, expiresInSeconds)
  const signedUrlByPath = new Map(
    (data ?? []).map((item) => [item.path, item.signedUrl ?? null])
  )

  return modules.map((module) => ({
    ...module,
    signedUrl: signedUrlByPath.get(module.storage_path) ?? null,
  }))
}

export async function listTeachingMaterialsWithSignedUrls(supabase: SupabaseClient) {
  const [moduleResult, folderResult] = await Promise.all([
    listTeachingModules(supabase),
    listTeachingFolders(supabase),
  ])

  if (moduleResult.error) return { modules: [], folders: [], error: moduleResult.error }
  if (folderResult.error) return { modules: [], folders: [], error: folderResult.error }

  return {
    modules: await createModuleSignedUrls(supabase, moduleResult.modules),
    folders: folderResult.folders,
    error: null,
  }
}
