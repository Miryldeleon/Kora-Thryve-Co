import { NextResponse } from 'next/server'

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

export function jsonOk<T extends Record<string, unknown>>(payload: T = {} as T) {
  return NextResponse.json({ ok: true, ...payload })
}
