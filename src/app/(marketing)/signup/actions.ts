'use server'

import { redirect } from 'next/navigation'
import { isUserRole, type UserRole } from '@/lib/auth/access'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

function toSignupErrorUrl(message: string, role: UserRole) {
  const encoded = encodeURIComponent(message)
  return `/signup/${role}?error=${encoded}`
}

function getEnrollmentClientOrRedirect(role: UserRole) {
  try {
    return createServiceRoleSupabaseClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup is not configured for class enrollment.'
    redirect(toSignupErrorUrl(message, role))
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function signUpWithEmailPassword(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const selectedRole = String(formData.get('role') ?? '')
  const selectedGroupClassTemplateIds = Array.from(
    new Set(
      formData
        .getAll('group_class_template_ids')
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0)
    )
  )

  if (!isUserRole(selectedRole)) {
    redirect('/signup')
  }

  if (!fullName) {
    redirect(toSignupErrorUrl('Full name is required', selectedRole))
  }

  if (!email || !password) {
    redirect(toSignupErrorUrl('Full name, email, and password are required', selectedRole))
  }

  if (selectedRole === 'student' && selectedGroupClassTemplateIds.length === 0) {
    redirect(toSignupErrorUrl('Please choose at least one group class before creating your account.', selectedRole))
  }

  if (selectedRole === 'student' && selectedGroupClassTemplateIds.some((templateId) => !isUuid(templateId))) {
    redirect(toSignupErrorUrl('Please choose valid active group classes.', selectedRole))
  }

  const supabase = await createServerSupabaseClient()

  let signupClasses: Array<{
    id: string
    created_by_admin: string | null
  }> = []

  if (selectedRole === 'student') {
    const adminClient = getEnrollmentClientOrRedirect(selectedRole)
    const { data: classRows, error: classError } = await adminClient
      .from('group_class_templates')
      .select('id, created_by_admin')
      .eq('is_active', true)
      .in('id', selectedGroupClassTemplateIds)

    if (classError) {
      redirect(toSignupErrorUrl(classError.message, selectedRole))
    }

    if ((classRows ?? []).length !== selectedGroupClassTemplateIds.length) {
      redirect(toSignupErrorUrl('Please choose only active group classes.', selectedRole))
    }

    signupClasses = (classRows ?? []) as Array<{ id: string; created_by_admin: string | null }>

    if (signupClasses.some((classRow) => !classRow.created_by_admin)) {
      redirect(toSignupErrorUrl('One selected class is missing admin ownership. Please contact support.', selectedRole))
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: selectedRole,
      },
    },
  })

  if (error) {
    redirect(toSignupErrorUrl(error.message, selectedRole))
  }

  if (!data.user?.id) {
    redirect(toSignupErrorUrl('Could not create your profile. Please try again.', selectedRole))
  }

  const createdUserId = data.user.id

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', createdUserId)

  if (profileError) {
    redirect(toSignupErrorUrl(profileError.message, selectedRole))
  }

  if (selectedRole === 'student' && signupClasses.length > 0) {
    const adminClient = getEnrollmentClientOrRedirect(selectedRole)
    const enrollmentRows = signupClasses.map((classRow) => ({
      template_id: classRow.id,
      student_id: createdUserId,
      status: 'active',
      is_active: true,
      assigned_by_admin: classRow.created_by_admin as string,
      enrollment_source: 'student_signup',
      selected_during_signup: true,
    }))

    const { error: enrollmentError } = await adminClient
      .from('group_class_enrollments')
      .upsert(enrollmentRows, { onConflict: 'template_id,student_id' })

    if (enrollmentError) {
      redirect(toSignupErrorUrl(enrollmentError.message, selectedRole))
    }
  }

  redirect('/pending-approval')
}
