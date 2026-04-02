import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { brandUi } from '@/lib/ui/branding'
import ProfileForm from '@/components/profile/profile-form'

type TeacherProfile = {
  full_name: string | null
  age: number | null
  location: string | null
  role: 'student' | 'teacher'
  created_at: string
}

export default async function TeacherProfilePage() {
  const { supabase, user } = await requireApprovedTeacher()

  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, age, location, role, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) {
    throw new Error(error?.message || 'Profile not found')
  }

  const profile = data as TeacherProfile

  return (
    <div className={brandUi.container}>
      <header className={brandUi.header}>
        <p className={brandUi.eyebrow}>Kora Thryve</p>
        <h1 className={brandUi.title}>My Profile</h1>
        <p className={brandUi.subtitle}>Manage your teacher profile information.</p>
      </header>

      <ProfileForm
        initialFullName={profile.full_name ?? ''}
        initialAge={profile.age}
        initialLocation={profile.location}
        email={user.email || ''}
        role="teacher"
      />
    </div>
  )
}
