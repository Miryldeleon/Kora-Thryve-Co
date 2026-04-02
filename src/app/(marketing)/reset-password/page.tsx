import { AuthShell } from '@/components/auth/auth-shell'
import ResetPasswordForm from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset Password"
      subtitle="Enter your new password to complete your account recovery."
    >
      <ResetPasswordForm />
    </AuthShell>
  )
}
