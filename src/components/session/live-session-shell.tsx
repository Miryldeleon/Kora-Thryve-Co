'use client'

import { useEffect, useState, type ReactNode } from 'react'

type LiveSessionTab = 'whiteboard' | 'presentation' | 'notes' | 'participants'

type LiveSessionShellProps = {
  sessionId: string
  viewerRole: 'teacher' | 'student'
  backHref: string
  title: string
  subtitle?: string
  statusLabel: string
  statusClassName: string
  sessionBadge?: string
  defaultContentTab?: Extract<LiveSessionTab, 'whiteboard' | 'presentation'>
  meeting: ReactNode
  teachingTools: ReactNode
  notes: ReactNode
  participants: ReactNode
  details?: ReactNode
}

const tabs: Array<{ id: LiveSessionTab; label: string }> = [
  { id: 'whiteboard', label: 'Whiteboard' },
  { id: 'presentation', label: 'Presentation' },
  { id: 'notes', label: 'Notes' },
  { id: 'participants', label: 'Participants' },
]

function isContentTab(tab: LiveSessionTab) {
  return tab === 'whiteboard' || tab === 'presentation'
}

export default function LiveSessionShell({
  sessionId,
  viewerRole,
  backHref,
  title,
  subtitle,
  statusLabel,
  statusClassName,
  sessionBadge = 'Student View',
  defaultContentTab = 'presentation',
  meeting,
  teachingTools,
  notes,
  participants,
  details,
}: LiveSessionShellProps) {
  const [contentTab, setContentTab] = useState<Extract<LiveSessionTab, 'whiteboard' | 'presentation'>>(
    defaultContentTab
  )
  const [activeTab, setActiveTab] = useState<LiveSessionTab>(defaultContentTab)
  const [stageExpanded, setStageExpanded] = useState(false)
  const auxiliaryOpen = activeTab === 'notes' || activeTab === 'participants'
  const visibleContentTab = isContentTab(activeTab) ? activeTab : contentTab
  const isTeacher = viewerRole === 'teacher'

  useEffect(() => {
    const handleSurfaceChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        sessionId?: string
        surface?: 'materials' | 'whiteboard'
      }>
      if (customEvent.detail?.sessionId !== sessionId) return

      const nextContentTab = customEvent.detail.surface === 'whiteboard' ? 'whiteboard' : 'presentation'
      setContentTab(nextContentTab)
      setActiveTab((current) => (isContentTab(current) ? nextContentTab : current))
    }

    window.addEventListener('kora:teaching-surface-change', handleSurfaceChange)
    return () => window.removeEventListener('kora:teaching-surface-change', handleSurfaceChange)
  }, [sessionId])

  return (
    <main className="min-h-dvh bg-[#0b0f14] pb-20 text-slate-100 lg:min-h-screen lg:px-8 lg:py-4 lg:pb-8 xl:px-10 [@media_(orientation:landscape)_and_(max-width:1023px)]:pb-0">
      <div className="w-full">
        <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0b0f14]/95 px-3 py-2.5 backdrop-blur lg:static lg:mb-4 lg:rounded-xl lg:border lg:bg-[#0f141b]/90">
          <div className="flex items-center justify-between gap-3">
            <a
              href={backHref}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#111926] px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-[#162131]"
            >
              Back
            </a>
            <div className="min-w-0 flex-1 text-center lg:text-left">
              <div className="flex min-w-0 items-center justify-center gap-2 lg:justify-start">
                <h1 className="truncate text-sm font-semibold text-slate-100 lg:text-base">{title}</h1>
                <span className="hidden shrink-0 rounded-full border border-indigo-700/60 bg-indigo-900/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-indigo-200 sm:inline-flex">
                  {sessionBadge}
                </span>
              </div>
              {subtitle && <p className="mt-0.5 truncate text-[11px] text-slate-400">{subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`hidden rounded-lg border px-3 py-2 text-xs font-medium transition lg:inline-flex [@media_(orientation:landscape)_and_(max-width:1023px)]:inline-flex ${
                  activeTab === 'notes'
                    ? 'border-[#cfb083] bg-[#cfb083] text-white'
                    : 'border-slate-700 bg-[#111926] text-slate-200 hover:bg-[#162131]'
                }`}
              >
                Notes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('participants')}
                className={`hidden rounded-lg border px-3 py-2 text-xs font-medium transition lg:inline-flex [@media_(orientation:landscape)_and_(max-width:1023px)]:inline-flex ${
                  activeTab === 'participants'
                    ? 'border-[#cfb083] bg-[#cfb083] text-white'
                    : 'border-slate-700 bg-[#111926] text-slate-200 hover:bg-[#162131]'
                }`}
              >
                Participants
              </button>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] ${statusClassName}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </header>

        <div className="sticky top-[57px] z-20 grid grid-cols-2 gap-2 border-b border-slate-800 bg-[#0b0f14]/95 px-3 py-2 backdrop-blur lg:hidden [@media_(orientation:landscape)_and_(max-width:1023px)]:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`min-h-11 rounded-xl border px-3 text-xs font-semibold transition ${
              activeTab === 'notes'
                ? 'border-[#cfb083] bg-[#cfb083] text-white'
                : 'border-slate-800 bg-[#101722] text-slate-200 hover:bg-[#162131]'
            }`}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('participants')}
            className={`min-h-11 rounded-xl border px-3 text-xs font-semibold transition ${
              activeTab === 'participants'
                ? 'border-[#cfb083] bg-[#cfb083] text-white'
                : 'border-slate-800 bg-[#101722] text-slate-200 hover:bg-[#162131]'
            }`}
          >
            Participants
          </button>
        </div>

        <section className="grid min-h-0 gap-3 px-3 py-3 lg:grid-cols-[minmax(260px,330px)_minmax(0,1fr)] lg:px-0 lg:py-0 [@media_(orientation:landscape)_and_(max-width:1023px)]:grid-cols-[minmax(0,1fr)_minmax(240px,34vw)] [@media_(orientation:landscape)_and_(max-width:1023px)]:gap-2 [@media_(orientation:landscape)_and_(max-width:1023px)]:py-2">
          <article
            className={`order-1 flex h-[52dvh] min-h-[320px] min-w-0 flex-col rounded-2xl border border-slate-800/70 bg-[#0f141d] p-2 lg:order-2 lg:h-auto lg:min-h-[calc(100dvh-96px)] lg:p-4 xl:p-5 [@media_(orientation:landscape)_and_(max-width:1023px)]:h-[calc(100dvh-76px)] [@media_(orientation:landscape)_and_(max-width:1023px)]:min-h-[250px] ${
              stageExpanded ? 'fixed inset-0 z-50 h-auto min-h-0 rounded-none p-3 lg:p-5' : ''
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                <span className="hidden lg:inline">Teaching Tools</span>
                <span className="lg:hidden">{tabs.find((tab) => tab.id === visibleContentTab)?.label}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-300">
                  {isTeacher ? 'Live controls' : 'Following teacher'}
                </span>
                <button
                  type="button"
                  onClick={() => setStageExpanded((current) => !current)}
                  className="rounded-lg border border-slate-700 bg-[#111926] px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-[#162131]"
                >
                  {stageExpanded ? 'Close' : 'Expand'}
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 rounded-2xl bg-[#111a27] p-1">{teachingTools}</div>
          </article>

          <article className="order-2 flex h-[25dvh] min-h-[180px] max-h-[250px] min-w-0 flex-col rounded-2xl border border-slate-800 bg-[#111722] p-2 lg:order-1 lg:h-auto lg:max-h-none lg:min-h-[calc(100dvh-96px)] lg:p-3 [@media_(orientation:landscape)_and_(max-width:1023px)]:h-[calc(100dvh-76px)] [@media_(orientation:landscape)_and_(max-width:1023px)]:max-h-none">
            <div className="mb-1.5 flex items-center justify-between gap-2 px-1 lg:mb-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 lg:text-sm lg:text-slate-200">
                Live Meeting
              </h2>
            </div>
            <div className="min-h-0 flex-1">{meeting}</div>
          </article>
        </section>

        {details && <div className="mt-4 hidden lg:block">{details}</div>}

        <section
          className={`${
            auxiliaryOpen
              ? 'fixed inset-x-3 bottom-[78px] z-30 max-h-[58dvh] lg:inset-x-auto lg:bottom-6 lg:right-8 lg:top-[96px] lg:max-h-none lg:w-[430px] [@media_(orientation:landscape)_and_(max-width:1023px)]:bottom-3 [@media_(orientation:landscape)_and_(max-width:1023px)]:left-auto [@media_(orientation:landscape)_and_(max-width:1023px)]:right-3 [@media_(orientation:landscape)_and_(max-width:1023px)]:top-[70px] [@media_(orientation:landscape)_and_(max-width:1023px)]:w-[360px] [@media_(orientation:landscape)_and_(max-width:1023px)]:max-h-none'
              : 'hidden'
          } overflow-y-auto rounded-2xl border border-slate-700 bg-[#111a27] p-3 shadow-2xl shadow-black/50 lg:p-4`}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-300">
              {activeTab === 'notes' ? 'Notes' : 'Participants'}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab(contentTab)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200"
            >
              Close
            </button>
          </div>
          <div className="grid gap-3">
            <div className={activeTab === 'notes' ? 'block' : 'hidden'}>{notes}</div>
            <div className={activeTab === 'participants' ? 'block' : 'hidden'}>{participants}</div>
          </div>
        </section>

        {auxiliaryOpen && (
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setActiveTab(contentTab)}
            className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          />
        )}

        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-[#0b0f14]/95 px-3 py-2 backdrop-blur lg:hidden [@media_(orientation:landscape)_and_(max-width:1023px)]:hidden">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(contentTab)}
              className="rounded-lg border border-slate-700 bg-[#111926] px-3 py-2 text-xs font-medium text-slate-100"
            >
              {isTeacher ? 'Stage' : 'Teaching'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className="rounded-lg border border-slate-700 bg-[#111926] px-3 py-2 text-xs font-medium text-slate-100"
            >
              Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('participants')}
              className="rounded-lg border border-slate-700 bg-[#111926] px-3 py-2 text-xs font-medium text-slate-100"
            >
              People
            </button>
          </div>
        </footer>
      </div>
    </main>
  )
}
