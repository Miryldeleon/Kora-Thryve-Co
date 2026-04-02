import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type ProfileUpdatePayload = {
  full_name?: string
  age?: number | null
  location?: string | null
}

function normalizeAge(input: unknown) {
  if (input === null || input === undefined || input === '') return null
  const parsed = Number(input)
  if (!Number.isFinite(parsed)) return NaN
  return Math.floor(parsed)
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, approval_status, full_name, age, location, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile) {
    return NextResponse.json({ error: error?.message || 'Profile not found.' }, { status: 404 })
  }

  return NextResponse.json({
    profile: {
      ...profile,
      email: user.email || '',
    },
  })
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = (await request.json()) as ProfileUpdatePayload
  const fullName = String(body.full_name ?? '').trim()
  const location = String(body.location ?? '').trim()
  const age = normalizeAge(body.age)

  if (age !== null && (!Number.isFinite(age) || age < 1 || age > 120)) {
    return NextResponse.json({ error: 'Age must be between 1 and 120.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName || null,
      age,
      location: location || null,
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
