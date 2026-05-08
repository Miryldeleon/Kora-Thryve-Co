import { redirect } from 'next/navigation'

export default function TeacherBookingsPage() {
  redirect('/teacher/classes?type=one_on_one')
}
