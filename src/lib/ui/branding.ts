export const brandUi = {
  page:
    'min-h-screen bg-[#f5f4f2] px-6 py-8 text-slate-900',
  container: 'mx-auto w-full max-w-[1180px]',
  header: 'pb-2',
  eyebrow: 'text-xs uppercase tracking-[0.2em] text-slate-500',
  title: 'mt-2 text-3xl font-semibold tracking-tight text-slate-900',
  subtitle: 'mt-2 text-base text-slate-500',
  section: 'mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm',
  sectionTitle: 'text-lg font-semibold text-slate-900',
  card: 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
  mutedCard:
    'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600',
  successAlert:
    'mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700',
  errorAlert:
    'mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700',
  primaryButton:
    'inline-flex items-center justify-center rounded-xl bg-[#cfb083] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c2a372]',
  secondaryButton:
    'inline-flex items-center justify-center rounded-xl border border-[#d9ccb9] bg-white px-5 py-2.5 text-sm font-medium text-[#8b7758] transition hover:bg-[#f7f3ed]',
  infoButton:
    'inline-flex items-center justify-center rounded-xl bg-[#9cae82] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8fa173]',
  dangerButton:
    'inline-flex items-center justify-center rounded-xl bg-[#ef6a6a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e75a5a]',
  input:
    'mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#cfb083]',
  textarea:
    'min-h-[220px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 outline-none transition focus:border-[#cfb083]',
}

export function bookingStatusBadgeClass(status: string) {
  if (status === 'confirmed') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'completed') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}
