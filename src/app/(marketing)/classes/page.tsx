import Image from 'next/image'
import {
  AnimatedArticle,
  AnimatedDiv,
  AnimatedLink,
  AnimatedMarketingPageHero,
  AnimatedStagger,
} from '@/components/marketing/animated'
import {
  MarketingBlob,
  MarketingDetailRow,
  MarketingFooter,
  MarketingIcon,
  SectionContainer,
} from '@/components/marketing/site-chrome'
import { marketingClasses } from '@/lib/marketing/classes'

function ClassImage({
  src,
  title,
  category,
  accent,
}: {
  src: string | null
  title: string
  category: string
  accent: string
}) {
  return (
    <div className="relative h-56 overflow-hidden bg-[var(--cream)]">
      {src ? (
        <Image
          src={src}
          alt={`${title} class`}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[color:rgb(220_239_229/0.55)] text-[var(--sage-green)]">
          <MarketingIcon type="sparkles" className="h-16 w-16" />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,58,51,0.03),rgba(47,58,51,0.18))]" />
      <span
        className="absolute left-5 top-5 rounded-full px-4 py-2 text-sm font-extrabold text-[var(--deep-forest)] shadow-[0_14px_28px_-22px_rgba(47,58,51,0.45)]"
        style={{ backgroundColor: accent }}
      >
        {category}
      </span>
    </div>
  )
}

export default function ClassesPage() {
  return (
    <main className="overflow-hidden bg-white text-[var(--deep-forest)]">
      <AnimatedMarketingPageHero
        badge="Fixed Schedule Classes"
        icon="calendar"
        title="Explore Our Classes"
        subtitle="Choose from fixed-schedule learning sessions designed to support communication, confidence, creativity, and personal growth."
        activePath="/classes"
      />

      <section className="relative bg-white pb-20 sm:pb-24 lg:pb-32">
        <SectionContainer>
          <AnimatedStagger className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {marketingClasses.map((item) => (
              <AnimatedArticle
                key={item.title}
                className="marketing-surface group overflow-hidden rounded-[2rem] bg-white hover:-translate-y-2 hover:shadow-[0_30px_65px_-30px_rgba(47,58,51,0.28)]"
              >
                <ClassImage src={item.image} title={item.title} category={item.category} accent={item.accent} />
                <div className="relative p-7">
                  <MarketingBlob
                    className="bottom-2 right-2 h-20 w-20 opacity-18"
                    color="color-mix(in srgb, var(--soft-mint) 45%, white 55%)"
                    path="M39 77Q26 42 57 28t65 8q34 22 27 60t-41 60Q51 168 39 77Z"
                  />
                  <h2 className="relative z-10 text-2xl font-extrabold text-[var(--deep-forest)]">{item.title}</h2>
                  <div className="relative z-10 mt-6 space-y-3">
                    <MarketingDetailRow icon="calendar">{item.schedule}</MarketingDetailRow>
                    <MarketingDetailRow icon="clock">{item.time}</MarketingDetailRow>
                    <MarketingDetailRow icon="video">{item.format}</MarketingDetailRow>
                  </div>
                  <AnimatedLink
                    href={`/classes/${item.slug}`}
                    className="relative z-10 mt-7 inline-flex w-full items-center justify-center rounded-full bg-[var(--sage-green)] px-6 py-4 text-sm font-extrabold text-white shadow-[0_18px_35px_-26px_rgba(47,58,51,0.5)] hover:-translate-y-1 hover:bg-[var(--fresh-leaf)]"
                  >
                    View Class Details
                  </AnimatedLink>
                </div>
              </AnimatedArticle>
            ))}
          </AnimatedStagger>
        </SectionContainer>
      </section>

      <section className="bg-[var(--cream)] py-16 sm:py-20">
        <SectionContainer>
          <AnimatedDiv className="marketing-surface mx-auto max-w-3xl rounded-[2rem] bg-white p-8 text-center text-lg leading-8 text-[var(--body-muted)] sm:p-10">
            Schedules are fixed and may be updated depending on availability. For inquiries, please contact{' '}
            <a href="mailto:korathryveco@gmail.com" className="font-extrabold text-[var(--sage-green)] underline underline-offset-4">
              korathryveco@gmail.com
            </a>
            .
          </AnimatedDiv>
        </SectionContainer>
      </section>

      <MarketingFooter />
    </main>
  )
}
