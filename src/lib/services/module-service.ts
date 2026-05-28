import type { SupabaseClient } from '@supabase/supabase-js'
import { listTeachingMaterialsWithSignedUrls } from '@/lib/data/module-queries'

export async function getTeachingMaterials(supabase: SupabaseClient) {
  const { modules, folders, error } = await listTeachingMaterialsWithSignedUrls(supabase)

  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: { modules, folders } }
}
