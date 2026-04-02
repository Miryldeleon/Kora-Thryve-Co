import { MarketingStatusPage } from '@/components/marketing/status-page'

export default function PendingApprovalPage() {
  return (
    <MarketingStatusPage
      title="Account Pending Approval"
      message="Your account is awaiting admin approval. Please check back later."
      supportingText="You'll be able to access your portal once your account has been reviewed."
    />
  )
}
