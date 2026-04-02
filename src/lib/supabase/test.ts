import { supabase } from './client'

export async function testConnection() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    return {
      ok: false,
      message: `Supabase auth error: ${error.message}`,
      session: null,
    }
  }

  return {
    ok: true,
    message: data.session
      ? 'Supabase is configured. Active session found.'
      : 'Supabase is configured. No active session yet (expected before login).',
    session: data.session,
  }
}
