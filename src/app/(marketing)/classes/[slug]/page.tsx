import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AnimatedArticle,
  AnimatedDiv,
  AnimatedImageFrame,
  AnimatedLink,
  AnimatedSection,
  AnimatedStagger,
  marketingAnimationVariants,
} from '@/components/marketing/animated'
import {
  MarketingBlob,
  MarketingCtaSection,
  MarketingFooter,
  MarketingIcon,
  MarketingNavbar,
  SectionContainer,
} from '@/components/marketing/site-chrome'
import { getMarketingClassBySlug, marketingClasses, type MarketingClass } from '@/lib/marketing/classes'

type ClassDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return marketingClasses.map((classItem) => ({
    slug: classItem.slug,
  }))
}

function ClassVisual({ classItem }: { classItem: MarketingClass }) {
  return (
    <div className="marketing-surface relative min-h-[340px] overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--soft-mint)_55%,white_45%),color-mix(in_srgb,var(--warm-sand)_42%,white_58%))] p-6 sm:min-h-[460px] sm:p-8 lg:min-h-[560px]">
      <div className="relative h-full min-h-[292px] overflow-hidden rounded-[1.5rem] bg-[var(--cream)] sm:min-h-[396px] lg:min-h-[496px]">
        {classItem.image ? (
          <Image
            src={classItem.image}
            alt={`${classItem.title} class preview`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--sage-green)]">
            <MarketingIcon type="book" className="h-24 w-24" />
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))]" />
      </div>
    </div>
  )
}

function ContentSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <AnimatedSection className="mt-14" variant={marketingAnimationVariants.sectionReveal}>
      <h2 className="text-4xl font-extrabold tracking-tight text-[var(--deep-forest)] sm:text-5xl">{title}</h2>
      <div className="mt-6 text-lg leading-9 text-[var(--body-muted)]">{children}</div>
    </AnimatedSection>
  )
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--cream)] text-[var(--sage-green)]">
        <MarketingIcon type={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-extrabold text-[var(--body-muted)]">{label}</p>
        <p className="mt-1 text-lg font-bold leading-7 text-[var(--deep-forest)]">{value}</p>
      </div>
    </div>
  )
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { slug } = await params
  const classItem = getMarketingClassBySlug(slug)

  if (!classItem) {
    notFound()
  }

  return (
    <main className="overflow-hidden bg-white text-[var(--deep-forest)]">
      <section className="bg-white pt-1">
        <MarketingNavbar activePath="/classes" />
      </section>

      <section className="bg-[var(--cream)] py-7">
        <SectionContainer>
          <AnimatedDiv variant={marketingAnimationVariants.fadeDown} scroll={false}>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-base font-bold text-[var(--body-muted)]">
              <Link href="/" className="hover:text-[var(--deep-forest)]">
                Home
              </Link>
              <span aria-hidden="true">&gt;</span>
              <Link href="/classes" className="hover:text-[var(--deep-forest)]">
                Classes
              </Link>
              <span aria-hidden="true">&gt;</span>
              <span className="text-[var(--deep-forest)]">{classItem.title}</span>
            </nav>
          </AnimatedDiv>
        </SectionContainer>
      </section>

      <section className="relative isolate overflow-hidden bg-white py-20 sm:py-24 lg:py-32">
        <MarketingBlob
          className="left-12 top-36 h-52 w-52 opacity-24"
          color="color-mix(in srgb, var(--soft-peach) 36%, white 64%)"
          path="M55 126Q31 76 76 46t101 4q56 34 52 93t-56 93Q121 270 75 228T55 126Z"
        />
        <MarketingBlob
          className="bottom-[-5rem] right-[-2rem] h-80 w-80 opacity-30"
          color="color-mix(in srgb, var(--warm-sand) 34%, white 66%)"
          path="M62 112Q85 37 158 48t95 80q22 69-29 116t-126 24Q23 222 42 150t20-38Z"
        />
        <SectionContainer>
          <div className="max-w-5xl">
            <AnimatedDiv variant={marketingAnimationVariants.fadeDown} scroll={false}>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(154_163_151/0.24)] bg-[var(--cream)] px-5 py-3 text-base font-extrabold text-[var(--deep-forest)]">
                <MarketingIcon type="calendar" className="h-5 w-5 text-[var(--sage-green)]" />
                Fixed Schedule
              </div>
            </AnimatedDiv>
            <AnimatedDiv variant={marketingAnimationVariants.fadeUp} scroll={false}>
              <h1 className="mt-8 text-5xl font-extrabold leading-[1.02] tracking-tight text-[var(--deep-forest)] sm:text-6xl lg:text-7xl">
                {classItem.title}
              </h1>
            </AnimatedDiv>
            <AnimatedDiv variant={marketingAnimationVariants.fadeUp} scroll={false}>
              <p className="mt-8 max-w-5xl text-xl leading-9 text-[var(--body-muted)] sm:text-2xl">
                {classItem.description}
              </p>
            </AnimatedDiv>
          </div>
        </SectionContainer>
      </section>

      <section className="bg-[color:rgb(248_246_241/0.82)] py-20 sm:py-24 lg:py-28">
        <SectionContainer className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_430px]">
          <div>
            <AnimatedImageFrame>
              <ClassVisual classItem={classItem} />
            </AnimatedImageFrame>

            <ContentSection title="About This Class">
              <p>{classItem.about}</p>
            </ContentSection>

            <ContentSection title="What Learners Will Practice">
              <AnimatedStagger className="space-y-5">
                {classItem.practice.map((item) => (
                  <AnimatedDiv key={item} className="flex items-center gap-4" variant={marketingAnimationVariants.listItemReveal}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--fresh-leaf)] text-white shadow-[0_12px_24px_-18px_rgba(47,58,51,0.5)]">
                      <MarketingIcon type="check" className="h-5 w-5" />
                    </span>
                    <span>{item}</span>
                  </AnimatedDiv>
                ))}
              </AnimatedStagger>
            </ContentSection>

            <ContentSection title="Who This Class Is For">
              <AnimatedStagger className="space-y-5">
                {classItem.audience.map((item) => (
                  <AnimatedDiv key={item} className="marketing-surface flex items-center gap-5 rounded-[2rem] bg-white p-6" variant={marketingAnimationVariants.listItemReveal}>
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--cream)] text-[var(--sage-green)]">
                      <MarketingIcon type="book" className="h-6 w-6" />
                    </span>
                    <p className="font-bold text-[var(--body-muted)]">{item}</p>
                  </AnimatedDiv>
                ))}
              </AnimatedStagger>
            </ContentSection>

            <ContentSection title="Why Parents Choose This Class">
              <AnimatedStagger className="grid gap-6 md:grid-cols-3">
                {classItem.parentReasons.map((reason) => (
                  <AnimatedArticle key={reason.title} className="marketing-surface rounded-[2rem] bg-white p-7 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.3rem] bg-[var(--fresh-leaf)] text-white">
                      <MarketingIcon type={reason.icon} className="h-7 w-7" />
                    </div>
                    <h3 className="mt-6 text-xl font-extrabold text-[var(--deep-forest)]">{reason.title}</h3>
                    <p className="mt-3 text-base leading-7 text-[var(--body-muted)]">{reason.description}</p>
                  </AnimatedArticle>
                ))}
              </AnimatedStagger>
            </ContentSection>

            <AnimatedSection className="marketing-surface mt-14 rounded-[2rem] bg-[color:rgb(220_239_229/0.62)] p-8 sm:p-10">
              <h2 className="text-3xl font-extrabold text-[var(--deep-forest)]">Class Notes</h2>
              <p className="mt-5 text-lg leading-9 text-[var(--body-muted)]">{classItem.notes}</p>
            </AnimatedSection>
          </div>

          <aside className="space-y-8 lg:sticky lg:top-8 lg:self-start">
            <AnimatedArticle className="marketing-surface relative overflow-hidden rounded-[2rem] bg-white p-8 sm:p-10" variant={marketingAnimationVariants.listItemReveal} scroll>
              <MarketingBlob
                className="right-[-2rem] top-[-2rem] h-28 w-28 opacity-18"
                color="var(--soft-mint)"
                path="M39 77Q26 42 57 28t65 8q34 22 27 60t-41 60Q51 168 39 77Z"
              />
              <h2 className="relative z-10 text-3xl font-extrabold text-[var(--deep-forest)]">Class Details</h2>
              <span
                className="relative z-10 mt-7 inline-flex rounded-full px-5 py-3 text-base font-extrabold text-[var(--deep-forest)]"
                style={{ backgroundColor: classItem.accent }}
              >
                {classItem.category}
              </span>
              <div className="relative z-10 mt-8 space-y-7">
                <DetailItem icon="calendar" label="Schedule" value={classItem.schedule} />
                <DetailItem icon="clock" label="Time" value={classItem.time} />
                <DetailItem icon="video" label="Format" value={classItem.format} />
                <DetailItem icon="message" label="Availability" value="Contact for details" />
              </div>
            </AnimatedArticle>

            <AnimatedArticle className="marketing-surface relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,var(--sage-green),var(--fresh-leaf))] p-8 text-white sm:p-10" variant={marketingAnimationVariants.listItemReveal} scroll>
              <MarketingBlob
                className="right-[-1rem] top-8 h-24 w-24 opacity-22"
                color="var(--soft-mint)"
                path="M39 77Q26 42 57 28t65 8q34 22 27 60t-41 60Q51 168 39 77Z"
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/18">
                <MarketingIcon type="mail" className="h-7 w-7" />
              </div>
              <h2 className="mt-8 text-3xl font-extrabold">Interested in this class?</h2>
              <p className="mt-5 text-lg leading-8 text-white/88">
                Reach out to Kora Thryve & Co. to learn more about availability, enrollment, and class details.
              </p>
              <p className="mt-8 text-sm font-bold text-white/72">Email</p>
              <a href="mailto:korathryveco@gmail.com" className="mt-2 block text-xl font-extrabold hover:text-white/80">
                korathryveco@gmail.com
              </a>
              <AnimatedLink
                href="/contact"
                className="mt-9 inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-4 text-lg font-extrabold text-[var(--sage-green)] shadow-[0_20px_38px_-28px_rgba(47,58,51,0.55)] hover:-translate-y-1"
              >
                Book or Inquire
              </AnimatedLink>
              <AnimatedLink
                href="/contact"
                className="mx-auto mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white/18 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-white/24"
              >
                <MarketingIcon type="message" className="h-4 w-4" />
                Start Here
              </AnimatedLink>
            </AnimatedArticle>

            <AnimatedArticle className="marketing-surface rounded-[2rem] bg-white p-8 sm:p-10" variant={marketingAnimationVariants.listItemReveal} scroll>
              <h2 className="text-3xl font-extrabold text-[var(--deep-forest)]">Schedule Overview</h2>
              <div className="mt-8 space-y-5">
                <div className="rounded-[1.5rem] bg-[var(--cream)] p-6">
                  <p className="text-sm font-extrabold text-[var(--body-muted)]">Frequency</p>
                  <p className="mt-2 text-lg font-extrabold text-[var(--deep-forest)]">{classItem.schedule}</p>
                </div>
                <div className="rounded-[1.5rem] bg-[var(--cream)] p-6">
                  <p className="text-sm font-extrabold text-[var(--body-muted)]">Time</p>
                  <p className="mt-2 text-lg font-extrabold text-[var(--deep-forest)]">{classItem.time}</p>
                </div>
                <div className="rounded-[1.5rem] bg-[var(--cream)] p-6">
                  <p className="text-sm font-extrabold text-[var(--body-muted)]">Delivery</p>
                  <p className="mt-2 text-lg font-extrabold text-[var(--deep-forest)]">{classItem.format}</p>
                </div>
                <div className="rounded-[1.5rem] bg-[color:rgb(220_239_229/0.7)] p-6">
                  <p className="text-sm font-extrabold text-[var(--body-muted)]">Focus</p>
                  <p className="mt-2 text-lg font-extrabold text-[var(--deep-forest)]">{classItem.focus}</p>
                </div>
              </div>
            </AnimatedArticle>
          </aside>
        </SectionContainer>
      </section>

      <AnimatedDiv>
        <MarketingCtaSection
          title="Ready to grow with guidance?"
          text="Join a supportive learning environment designed to help every learner build confidence and skill."
          buttonLabel="Inquire About This Class"
          buttonHref="/contact"
        />
      </AnimatedDiv>
      <MarketingFooter />
    </main>
  )
}
