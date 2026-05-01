import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  MarketingBlob,
  MarketingCtaSection,
  MarketingFooter,
  MarketingIcon,
  MarketingNavbar,
  SectionContainer,
} from '@/components/marketing/site-chrome'
import { getMarketingTeacherById, marketingTeachers, type MarketingTeacher } from '@/lib/marketing/teachers'

type TeacherDetailsPageProps = {
  params: Promise<{
    teacherId: string
  }>
}

export function generateStaticParams() {
  return marketingTeachers.map((teacher) => ({
    teacherId: teacher.id,
  }))
}

export async function generateMetadata({ params }: TeacherDetailsPageProps): Promise<Metadata> {
  const { teacherId } = await params
  const teacher = getMarketingTeacherById(teacherId)

  if (!teacher) {
    return {
      title: 'Teacher Profile | Kora Thryve & Co.',
    }
  }

  return {
    title: `${teacher.name} - ${teacher.specialty} | Kora Thryve & Co.`,
    description: `Learn from ${teacher.name}, a ${teacher.specialty} mentor. ${teacher.shortDescription}`,
  }
}

function TeacherPhoto({ teacher }: { teacher: MarketingTeacher }) {
  return (
    <div className="relative mx-auto max-w-[430px] lg:max-w-none">
      <MarketingBlob
        className="left-[-2rem] top-[-2rem] h-32 w-32 opacity-22"
        color={teacher.badgeColor}
        path="M70 136Q45 80 88 49t102-7q59 24 63 78t-45 97q-49 43-98 18T70 136Z"
      />
      <div className="marketing-surface relative h-[400px] overflow-hidden rounded-[2.5rem] border-8 border-white bg-[var(--cream)] shadow-[0_34px_70px_-38px_rgba(47,58,51,0.45)] lg:h-[500px]">
        {teacher.image ? (
          <Image
            src={teacher.image}
            alt={teacher.name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 90vw, 34vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[color:rgb(220_239_229/0.55)] text-[var(--sage-green)]">
            <MarketingIcon type="users" className="h-24 w-24" />
          </div>
        )}
      </div>
      <div
        className="absolute bottom-[-1.5rem] right-[-1.5rem] flex h-24 w-24 rotate-[5deg] items-center justify-center rounded-full border-4 border-white text-white shadow-[0_22px_42px_-24px_rgba(47,58,51,0.55)]"
        style={{ backgroundColor: teacher.badgeColor }}
      >
        <MarketingIcon type="award" className="h-10 w-10" />
      </div>
    </div>
  )
}

function QuickInfoCard({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-[var(--cream)] p-6">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--sage-green)]">
          <MarketingIcon type={icon} className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-extrabold text-[var(--body-muted)]">{label}</p>
          <p className="mt-1 font-extrabold text-[var(--deep-forest)]">{value}</p>
        </div>
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
    <section>
      <h2 className="text-3xl font-extrabold tracking-tight text-[var(--deep-forest)] sm:text-4xl">{title}</h2>
      <div className="mt-6 text-lg leading-9 text-[var(--body-muted)]">{children}</div>
    </section>
  )
}

function InfoBox({
  label,
  value,
  highlighted = false,
}: {
  label: string
  value: string
  highlighted?: boolean
}) {
  return (
    <div className={`rounded-xl p-4 ${highlighted ? 'bg-[color:rgb(220_239_229/0.62)]' : 'bg-[var(--cream)]'}`}>
      <p className="text-sm font-extrabold text-[var(--body-muted)]">{label}</p>
      <p className="mt-2 font-extrabold leading-7 text-[var(--deep-forest)]">{value}</p>
    </div>
  )
}

export default async function TeacherDetailsPage({ params }: TeacherDetailsPageProps) {
  const { teacherId } = await params
  const teacher = getMarketingTeacherById(teacherId)

  if (!teacher) {
    notFound()
  }

  const firstName = teacher.name.split(' ')[0]

  return (
    <main className="overflow-hidden bg-white text-[var(--deep-forest)]">
      <section className="bg-white pt-1">
        <MarketingNavbar activePath="/teachers" />
      </section>

      <section className="border-b border-[color:rgb(154_163_151/0.1)] bg-[var(--cream)] py-6">
        <SectionContainer>
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--body-muted)]">
            <Link href="/" className="hover:text-[var(--sage-green)]">
              Home
            </Link>
            <span aria-hidden="true">&gt;</span>
            <Link href="/teachers" className="hover:text-[var(--sage-green)]">
              Teachers
            </Link>
            <span aria-hidden="true">&gt;</span>
            <span className="text-[var(--deep-forest)]">{teacher.name}</span>
          </nav>
        </SectionContainer>
      </section>

      <section className="relative isolate overflow-hidden bg-white py-16 lg:py-24">
        <MarketingBlob
          className="right-[-8rem] top-8 h-[28rem] w-[28rem] opacity-15"
          color="var(--warm-sand)"
          path="M62 112Q85 37 158 48t95 80q22 69-29 116t-126 24Q23 222 42 150t20-38Z"
        />
        <MarketingBlob
          className="bottom-[-6rem] left-1/3 h-72 w-72 opacity-10"
          color="var(--soft-peach)"
          path="M63 128Q27 74 80 39t106 0q53 35 44 97t-70 92Q99 258 63 128Z"
        />
        <SectionContainer className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.55fr]">
          <TeacherPhoto teacher={teacher} />

          <div className="relative z-10">
            <div
              className="inline-flex rounded-full border px-5 py-2 text-sm font-extrabold text-[var(--deep-forest)]"
              style={{ backgroundColor: `${teacher.badgeColor}4D`, borderColor: `${teacher.badgeColor}66` }}
            >
              {teacher.specialty}
            </div>
            <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-[var(--deep-forest)] sm:text-6xl">
              {teacher.name}
            </h1>
            <p className="mt-6 text-xl leading-9 text-[var(--body-muted)]">{teacher.bio}</p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <QuickInfoCard icon="calendar" label="Availability" value={teacher.availability} />
              <QuickInfoCard icon="star" label="Experience" value={teacher.experience} />
            </div>
          </div>
        </SectionContainer>
      </section>

      <section className="bg-[var(--cream)] py-16">
        <SectionContainer className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-16">
            <ContentSection title="Teaching Approach">
              <p>{teacher.approach}</p>
            </ContentSection>

            <ContentSection title="Areas of Expertise">
              <div className="grid gap-4 md:grid-cols-2">
                {teacher.expertise.map((skill) => (
                  <div key={skill} className="marketing-surface flex items-center gap-4 rounded-2xl bg-white p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--fresh-leaf)] text-white">
                      <MarketingIcon type="book" className="h-4 w-4" />
                    </span>
                    <span className="font-bold text-[var(--deep-forest)]">{skill}</span>
                  </div>
                ))}
              </div>
            </ContentSection>

            <ContentSection title="Education & Credentials">
              <div className="space-y-4">
                {teacher.education.map((credential) => (
                  <div key={credential} className="marketing-surface flex gap-4 rounded-2xl bg-white p-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:rgb(154_163_151/0.18)] text-[var(--sage-green)]">
                      <MarketingIcon type="award" className="h-5 w-5" />
                    </span>
                    <p className="text-lg leading-8 text-[var(--deep-forest)]">{credential}</p>
                  </div>
                ))}
              </div>
            </ContentSection>

            <ContentSection title={`Why Choose ${firstName}`}>
              <div className="grid gap-6 md:grid-cols-3">
                {teacher.whyChoose.map((benefit) => (
                  <article
                    key={benefit.title}
                    className="marketing-surface rounded-[1.5rem] bg-white p-6 text-center hover:-translate-y-1 hover:shadow-[0_22px_42px_-30px_rgba(47,58,51,0.45)]"
                  >
                    <div
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${teacher.badgeColor}66`, color: teacher.badgeColor }}
                    >
                      <MarketingIcon type="heart" className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-extrabold text-[var(--deep-forest)]">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--body-muted)]">{benefit.description}</p>
                  </article>
                ))}
              </div>
            </ContentSection>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <article className="marketing-surface relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,var(--sage-green),var(--fresh-leaf))] p-8 text-white shadow-xl">
              <MarketingBlob
                className="right-[-2rem] top-[-2rem] h-24 w-24 opacity-20"
                color="white"
                path="M39 77Q26 42 57 28t65 8q34 22 27 60t-41 60Q51 168 39 77Z"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <MarketingIcon type="mail" className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-extrabold">Book a Session</h2>
              <p className="mt-3 text-sm leading-7 text-white/95">
                Ready to start learning with {firstName}? Get in touch to schedule your first session.
              </p>
              <p className="mt-6 text-xs font-bold text-white/80">Contact</p>
              <a href="mailto:korathryveco@gmail.com" className="mt-1 block font-extrabold hover:underline">
                korathryveco@gmail.com
              </a>
              <a
                href="mailto:korathryveco@gmail.com"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white py-4 font-extrabold text-[var(--sage-green)] shadow-lg hover:-translate-y-1"
              >
                Schedule Now
              </a>
              <a
                href="mailto:korathryveco@gmail.com"
                className="mx-auto mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-extrabold backdrop-blur-sm hover:bg-white/25"
              >
                <MarketingIcon type="message" className="h-4 w-4" />
                Get Started
              </a>
            </article>

            <article className="marketing-surface rounded-[2rem] bg-white p-8 shadow-lg">
              <h2 className="text-xl font-extrabold text-[var(--deep-forest)]">Quick Info</h2>
              <div className="mt-6 space-y-4">
                <InfoBox label="Specialty" value={teacher.specialty} />
                <InfoBox label="Experience" value={teacher.experience} />
                <InfoBox label="Availability" value={teacher.availability} highlighted />
              </div>
            </article>
          </aside>
        </SectionContainer>
      </section>

      <MarketingCtaSection
        title={`Ready to learn with ${firstName}?`}
        text="Take the first step toward growth and confidence with personalized guidance."
        buttonLabel="Get Started"
        buttonHref="mailto:korathryveco@gmail.com"
      />
      <MarketingFooter />
    </main>
  )
}
