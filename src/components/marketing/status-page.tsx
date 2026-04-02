import Link from 'next/link'
import { brandName, brandTagline } from '@/components/marketing/site-chrome'

type MarketingStatusPageProps = {
  title: string
  message: string
  supportingText?: string
}

export function MarketingStatusPage({ title, message, supportingText }: MarketingStatusPageProps) {
  return (
    <main className="min-h-screen bg-[#f5f4f2] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <section className="w-full max-w-[620px] rounded-[30px] border border-[#e7e2d9] bg-white p-8 text-center shadow-[0_30px_70px_-44px_rgba(15,23,42,0.3)] sm:p-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.26em] text-[#8b7758]">{brandName}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">{brandTagline}</p>

          <h1 className="mt-8 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2rem]">{title}</h1>
          <p className="mt-4 text-base text-slate-700">{message}</p>
          {supportingText && <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-7 text-slate-500">{supportingText}</p>}

          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#cfb083] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_20px_-14px_rgba(207,176,131,0.8)] transition hover:-translate-y-0.5 hover:bg-[#c2a372]"
          >
            Back to Home
          </Link>
        </section>
      </div>
    </main>
  )
}
