import { MarketingStatusPage } from '@/components/marketing/status-page'

export default function AccessRejectedPage() {
  return (
    <MarketingStatusPage
      title="Access Rejected"
      message="Your account was not approved for portal access."
      supportingText="Please contact the administrator if you believe this was a mistake."
    />
  )
}
