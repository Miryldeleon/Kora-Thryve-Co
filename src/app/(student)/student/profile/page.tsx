import { requireApprovedStudent } from '@/lib/auth/student'
import { brandUi } from '@/lib/ui/branding'
import ProfileForm from '@/components/profile/profile-form'

type StudentProfile = {
  full_name: string | null
  age: number | null
  location: string | null
  role: 'student' | 'teacher'
  created_at: string
}

export default async function StudentProfilePage() {
  const { supabase, user } = await requireApprovedStudent()

  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, age, location, role, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) {
    throw new Error(error?.message || 'Profile not found')
  }

  const profile = data as StudentProfile

  return (
    <div className={brandUi.container}>
      <header className={brandUi.header}>
        <p className={brandUi.eyebrow}>Kora Thryve</p>
        <h1 className={brandUi.title}>My Profile</h1>
        <p className={brandUi.subtitle}>Manage your student profile information.</p>
      </header>

      <ProfileForm
        initialFullName={profile.full_name ?? ''}
        initialAge={profile.age}
        initialLocation={profile.location}
        email={user.email || ''}
        role="student"
      />
    </div>
  )
}
