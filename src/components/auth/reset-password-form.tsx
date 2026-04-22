'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { authUi } from './auth-shell'
import { PasswordInput } from './password-input'

type RecoveryState = 'checking' | 'ready' | 'invalid'

function getHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  return new URLSearchParams(hash)
}

export default function ResetPasswordForm() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [successText, setSuccessText] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initRecovery = async () => {
      try {
        const url = new URL(window.location.href)
        const searchParams = url.searchParams
        const hashParams = getHashParams()
        const code = searchParams.get('code')
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        let hasValidRecovery = false

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          hasValidRecovery = true
        } else if (tokenHash && type === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })
          if (error) throw error
          hasValidRecovery = true
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          hasValidRecovery = true
        } else {
          const { data } = await supabase.auth.getSession()
          hasValidRecovery = Boolean(data.session)
        }

        if (mounted) {
          setRecoveryState(hasValidRecovery ? 'ready' : 'invalid')
          setErrorText(hasValidRecovery ? null : 'This password reset link is invalid or expired.')
        }

        if (hasValidRecovery) {
          window.history.replaceState(null, '', '/reset-password')
        }
      } catch {
        if (mounted) {
          setRecoveryState('invalid')
          setErrorText('This password reset link is invalid or expired.')
        }
      }
    }

    void initRecovery()

    return () => {
      mounted = false
    }
  }, [supabase])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorText(null)
    setSuccessText(null)

    if (!password || !confirmPassword) {
      setErrorText('Both password fields are required.')
      return
    }

    if (password !== confirmPassword) {
      setErrorText('Passwords do not match.')
      return
    }

    setIsSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setIsSaving(false)

    if (error) {
      setErrorText(error.message)
      return
    }

    setSuccessText('Your password has been updated successfully.')
    setPassword('')
    setConfirmPassword('')
  }

  if (recoveryState === 'checking') {
    return <p className="mt-6 text-center text-sm text-slate-600">Preparing secure reset…</p>
  }

  if (recoveryState === 'invalid') {
    return (
      <div className="mt-6">
        {errorText && <p className={authUi.alertError}>{errorText}</p>}
        <p className="mt-4 text-center text-sm text-slate-600">
          Request a new reset link from{' '}
          <Link href="/forgot-password" className={authUi.secondaryLink}>
            forgot password
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
      {errorText && <p className={authUi.alertError}>{errorText}</p>}
      {successText && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successText}
        </p>
      )}
      <PasswordInput
        label="New password"
        name="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
      />
      <PasswordInput
        label="Confirm new password"
        name="confirm_password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        autoComplete="new-password"
      />
      <button type="submit" disabled={isSaving} className={authUi.button}>
        {isSaving ? 'Updating password...' : 'Update password'}
      </button>
      <p className="text-center text-sm text-slate-600">
        Back to{' '}
        <Link href="/login" className={authUi.secondaryLink}>
          login
        </Link>
      </p>
    </form>
  )
}
