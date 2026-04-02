import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getRedirectPathForProfile,
  isAdminLoginRoute,
  isAdminRoute,
  getRoleRoutePrefix,
  isApprovalStatus,
  isAuthRoute,
  isProtectedRoleRoute,
  isUserRole,
  type UserProfile,
} from '@/lib/auth/access'
import { getSupabaseEnv } from './env'

async function resolveRoleFromProfile(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, approval_status')
    .eq('id', userId)
    .single()

  if (
    error ||
    !data ||
    !isUserRole(data.role) ||
    !isApprovalStatus(data.approval_status)
  ) {
    return null
  }

  return {
    role: data.role,
    approval_status: data.approval_status,
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({
          request,
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const hasAuthErrorParam = request.nextUrl.searchParams.has('error')

  if (!user && isAdminRoute(pathname) && !isAdminLoginRoute(pathname)) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (!user && isProtectedRoleRoute(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const isAdmin = Boolean(adminRow?.user_id)

    if (isAdminRoute(pathname)) {
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/access-rejected', request.url))
      }

      if (isAdmin && isAdminLoginRoute(pathname)) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }

      if (isAdmin) {
        return response
      }
    }

    // Avoid auth-route redirect loops when login/signup intentionally displays an error state.
    if (isAuthRoute(pathname) && hasAuthErrorParam) {
      return response
    }

    const profile = await resolveRoleFromProfile(supabase, user.id)

    if (!profile) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'Profile not found')
      return NextResponse.redirect(loginUrl)
    }

    const expectedRole = getRoleRoutePrefix(pathname)
    const redirectPath = getRedirectPathForProfile(profile)

    if (isAuthRoute(pathname)) {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    if (pathname === '/pending-approval' && profile.approval_status !== 'pending') {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    if (pathname === '/access-rejected' && profile.approval_status !== 'rejected') {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    if (isProtectedRoleRoute(pathname)) {
      if (profile.approval_status !== 'approved') {
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }

      if (expectedRole && profile.role !== expectedRole) {
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }
    }
  }

  return response
}
