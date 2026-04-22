import { headers } from 'next/headers'

function normalizeConfiguredSiteUrl(value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) return null

  try {
    return new URL(trimmed).origin
  } catch {
    return null
  }
}

async function getRequestOrigin() {
  const headerStore = await headers()
  const forwardedHost = headerStore.get('x-forwarded-host')
  const host = forwardedHost || headerStore.get('host') || 'localhost:3000'
  const forwardedProto = headerStore.get('x-forwarded-proto')
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}

export async function getSiteUrl() {
  const configuredSiteUrl = normalizeConfiguredSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)

  if (configuredSiteUrl) {
    return configuredSiteUrl
  }

  return getRequestOrigin()
}
