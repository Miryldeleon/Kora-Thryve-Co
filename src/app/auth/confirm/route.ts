import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const DEFAULT_SUCCESS_PATH = '/reset-password'
const DEFAULT_ERROR_PATH = '/reset-password?error=access_denied&error_code=otp_expired'

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_SUCCESS_PATH
  }

  return value
}

function getOtpType(value: string | null): EmailOtpType | null {
  if (
    value === 'signup' ||
    value === 'invite' ||
    value === 'magiclink' ||
    value === 'recovery' ||
    value === 'email_change' ||
    value === 'email'
  ) {
    return value
  }

  return null
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tokenHash = searchParams.get('token_hash')
  const type = getOtpType(searchParams.get('type'))
  const next = getSafeNextPath(searchParams.get('next'))

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL(DEFAULT_ERROR_PATH, request.url))
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error) {
    const errorUrl = new URL(DEFAULT_SUCCESS_PATH, request.url)
    errorUrl.searchParams.set('error', 'access_denied')
    errorUrl.searchParams.set('error_code', 'otp_expired')
    return NextResponse.redirect(errorUrl)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
