import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getProfileForCurrentUser,
  updateProfileForCurrentUser,
} from '@/lib/services/profile-service'
import { jsonError, jsonOk } from '@/lib/request/responses'
import { parseProfileUpdatePayload } from '@/lib/request/validation'

async function requireRequestUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false as const, response: jsonError('Unauthorized.', 401) }
  return { ok: true as const, supabase, user }
}

export async function GET() {
  const auth = await requireRequestUser()
  if (!auth.ok) return auth.response

  const result = await getProfileForCurrentUser(auth.supabase, auth.user)
  if (!result.ok) return jsonError(result.error, result.status)

  return jsonOk(result.data)
}

export async function PATCH(request: Request) {
  const auth = await requireRequestUser()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  const payload = parseProfileUpdatePayload(body)
  if (!payload.ok) return jsonError(payload.error, 400)

  const result = await updateProfileForCurrentUser(auth.supabase, auth.user, payload.value)
  if (!result.ok) return jsonError(result.error, result.status)

  return jsonOk()
}
