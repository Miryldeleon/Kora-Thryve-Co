import Image from 'next/image'
import Link from 'next/link'
import {
  MarketingCtaSection,
  MarketingFooter,
  MarketingNavbar,
  SectionContainer,
} from '@/components/marketing/site-chrome'

const services = [
  {
    title: 'Tutoring & Academic Support',
    description: 'Personalized learning paths designed for every student.',
    color: 'var(--soft-mint)',
    icon: 'book',
  },
  {
    title: 'Life Skills & Confidence Coaching',
    description: 'Build essential skills for everyday success and stronger self-trust.',
    color: 'color-mix(in srgb, var(--sunshine-yellow) 42%, white 58%)',
    icon: 'sparkles',
  },
  {
    title: 'Wellness Buddy Support',
    description: 'Nurture mental and physical well-being with calm, caring guidance.',
    color: 'color-mix(in srgb, var(--soft-peach) 42%, white 58%)',
    icon: 'heart',
  },
  {
    title: 'Vocal Coaching & Voice Care',
    description: 'Develop your voice with professional guidance and healthy habits.',
    color: 'color-mix(in srgb, var(--warm-sand) 56%, white 44%)',
    icon: 'mic',
  },
]

const featuredClasses = [
  {
    title: 'English Level 3-4',
    category: 'English',
    badgeColor: 'var(--soft-mint)',
    image: '/marketing/homepage_experience1.png',
    schedule: 'Every 1st & 3rd Saturday',
    time: '5:00 PM - 5:45 PM',
    format: 'Online Class',
  },
  {
    title: 'Public Speaking',
    category: 'Communication',
    badgeColor: 'var(--sunshine-yellow)',
    image: '/marketing/homepage_environment.png',
    schedule: 'Every 1st & 3rd Monday',
    time: '5:00 PM - 5:45 PM',
    format: 'Online Class',
  },
  {
    title: 'Vocal Session',
    category: 'Voice',
    badgeColor: 'var(--warm-sand)',
    image: '/marketing/homepage_experience2.png',
    schedule: 'Every 1st & 3rd Monday',
    time: '6:00 PM - 6:45 PM',
    format: 'Online Class',
  },
]

const reasons = [
  {
    title: 'Personalized Learning',
    description: 'Every session is tailored to each learner’s goals, pace, and preferred style.',
  },
  {
    title: 'Flexible Scheduling',
    description: 'Book sessions that fit smoothly into family routines and changing needs.',
  },
  {
    title: 'Supportive Mentors',
    description: 'Learn with caring educators and coaches who invest deeply in growth.',
  },
  {
    title: 'Growth-Focused Approach',
    description: 'We celebrate progress, build confidence, and keep learning grounded in care.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create Account',
    description: 'Sign up and choose the support or learning path that fits your learner best.',
    color: 'var(--sage-green)',
  },
  {
    number: '02',
    title: 'Choose a Service',
    description: 'Browse tutoring, wellness support, life skills coaching, or voice-focused sessions.',
    color: 'var(--sunshine-yellow)',
  },
  {
    number: '03',
    title: 'Book a Session',
    description: 'Pick a class or session that matches your schedule, goals, and comfort level.',
    color: 'var(--soft-peach)',
  },
  {
    number: '04',
    title: 'Start Learning',
    description: 'Join a warm learning environment where confidence and growth come first.',
    color: 'var(--fresh-leaf)',
  },
]

function Blob({
  className,
  color,
  path,
}: {
  className: string
  color: string
  path: string
}) {
  return (
    <div className={`marketing-blob ${className}`}>
      <svg viewBox="0 0 320 320" className="h-full w-full" fill="none" aria-hidden="true">
        <path d={path} fill={color} />
      </svg>
    </div>
  )
}

function Pill({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${className}`}
    >
      {children}
    </div>
  )
}

function Icon({ type, className = 'h-5 w-5' }: { type: string; className?: string }) {
  switch (type) {
    case 'book':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v15.5A1.5 1.5 0 0 0 18.5 18H6.5A2.5 2.5 0 0 0 4 20.5Z" />
          <path d="M8 8h8M8 12h8" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z" />
          <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7ZM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7Z" />
        </svg>
      )
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 20-1.1-1C5.1 13.8 2 11 2 7.5 2 5 4 3 6.5 3c1.7 0 3.4.8 4.5 2.1C12.1 3.8 13.8 3 15.5 3 18 3 20 5 20 7.5c0 3.5-3.1 6.3-8.9 11.5Z" />
        </svg>
      )
    case 'mic':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Z" />
          <path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8" />
        </svg>
      )
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 2v4M16 2v4M3 10h18" />
          <rect x="3" y="4" width="18" height="17" rx="3" />
        </svg>
      )
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" />
        </svg>
      )
    case 'video':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="m16 10 5-3v10l-5-3Z" />
        </svg>
      )
    case 'check':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.3">
          <path d="m5 12 4 4L19 6" />
        </svg>
      )
    case 'arrow':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      )
    case 'quote':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <path d="M10.6 6.2c-2.8 1.4-4.7 3.8-5 8.2H10v5H4.2C4 14 5.6 9.2 9.8 6l.8.2Zm9 0c-2.8 1.4-4.7 3.8-5 8.2H19v5h-5.8c-.2-5.4 1.4-10.2 5.6-13.4l.8.2Z" />
        </svg>
      )
    default:
      return null
  }
}

function DetailRow({
  icon,
  children,
}: {
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--body-muted)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/82 text-[var(--sage-green)]">
        <Icon type={icon} className="h-4.5 w-4.5" />
      </span>
      <span>{children}</span>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-white text-[var(--deep-forest)]">
      <section className="relative isolate overflow-hidden bg-white">
        <Blob
          className="animate-float-soft left-[-3rem] top-24 h-24 w-24 opacity-45 sm:left-6 sm:h-32 sm:w-32"
          color="color-mix(in srgb, var(--soft-mint) 55%, white 45%)"
          path="M86 214Q37 176 52 122T120 49q53-19 104 17t43 93q-8 57-67 75T86 214Z"
        />
        <Blob
          className="animate-float-slower bottom-0 left-[-2rem] h-32 w-32 opacity-40 sm:bottom-8 sm:left-10 sm:h-44 sm:w-44"
          color="color-mix(in srgb, var(--soft-peach) 45%, white 55%)"
          path="M56 163Q28 120 67 78t98-27q59 15 71 66t-28 88q-40 37-88 27T56 163Z"
        />
        <Blob
          className="animate-float-soft right-[-4rem] top-20 h-40 w-40 opacity-45 sm:right-8 sm:h-52 sm:w-52"
          color="color-mix(in srgb, var(--warm-sand) 55%, white 45%)"
          path="M73 119Q78 42 153 56t107 68q32 54-15 106T129 245Q18 196 73 119Z"
        />

        <MarketingNavbar />

        <SectionContainer className="grid min-h-[calc(100vh-6rem)] items-center gap-10 pb-16 pt-8 md:gap-12 lg:grid-cols-[1.18fr_0.82fr] lg:gap-12 lg:pb-24 lg:pt-10">
          <div className="relative z-10">
            <Pill className="animate-fade-rise w-fit border-[color:rgb(217_193_158/0.35)] bg-[color:rgb(217_193_158/0.18)] text-[var(--deep-forest)]">
              <span className="text-[var(--sunshine-yellow)]">
                <Icon type="sparkles" className="h-4 w-4" />
              </span>
              <span>A gentle learning space for every learner</span>
            </Pill>

            <h1 className="animate-fade-rise animate-fade-delay-1 mt-6 text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] text-[var(--sage-green)] min-[380px]:text-5xl sm:text-6xl lg:text-7xl">
              <span className="block whitespace-nowrap">Learn with</span>
              <span className="block whitespace-nowrap">Purpose. Grow</span>
              <span className="block whitespace-nowrap">with Guidance.</span>
            </h1>

            <p className="animate-fade-rise animate-fade-delay-2 mt-6 max-w-2xl text-lg leading-8 text-[var(--body-muted)] sm:text-xl">
              Personalized tutoring, wellness support, life skills coaching, and voice care designed to
              help every learner thrive.
            </p>

            <div className="animate-fade-rise animate-fade-delay-3 mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-[var(--sage-green)] px-10 py-5 text-lg font-bold text-white shadow-[0_24px_45px_-24px_rgba(47,58,51,0.55)] hover:-translate-y-1 hover:bg-[var(--fresh-leaf)]"
              >
                Get Started
              </Link>
              <Link
                href="/classes"
                className="inline-flex items-center justify-center rounded-full border border-[color:rgb(154_163_151/0.25)] bg-[var(--cream)] px-10 py-5 text-lg font-bold text-[var(--deep-forest)] shadow-[0_18px_35px_-30px_rgba(47,58,51,0.35)] hover:-translate-y-1 hover:bg-white"
              >
                Explore Classes
              </Link>
            </div>
          </div>

          <div className="relative z-10 mx-auto min-h-[250px] w-full max-w-[700px] md:min-h-[360px] lg:min-h-[470px]">
            <Blob
              className="animate-float-soft left-0 top-6 h-40 w-40 opacity-50 md:left-4 md:top-10 md:h-52 md:w-52 md:opacity-65"
              color="color-mix(in srgb, var(--soft-peach) 48%, white 52%)"
              path="M70 136Q45 80 88 49t102-7q59 24 63 78t-45 97q-49 43-98 18T70 136Z"
            />
            <Blob
              className="animate-float-slower bottom-4 right-0 h-48 w-48 opacity-50 md:bottom-6 md:right-4 md:h-60 md:w-60 md:opacity-62"
              color="color-mix(in srgb, var(--warm-sand) 40%, white 60%)"
              path="M91 104Q116 38 184 54t75 84q7 68-50 114T83 227q-69-41-48-123 21 0 56-104Z"
            />
            <div className="relative left-1/2 h-[250px] w-[min(92vw,520px)] -translate-x-1/2 md:h-[370px] md:w-[min(82vw,640px)] lg:h-[540px] lg:w-[980px] lg:-translate-x-[28%] xl:w-[1060px]">
              <Image
                src="/marketing/hero-page-3.png"
                alt="Children smiling while learning together with a tablet"
                fill
                priority
                className="object-contain drop-shadow-[0_32px_42px_rgba(47,58,51,0.16)]"
                sizes="(max-width: 768px) 92vw, (max-width: 1024px) 82vw, (max-width: 1280px) 980px, 1060px"
              />
            </div>
          </div>
        </SectionContainer>
      </section>

      <section id="services" className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-28">
        <Blob
          className="right-[-2rem] top-4 h-36 w-36 opacity-25"
          color="color-mix(in srgb, var(--soft-mint) 42%, white 58%)"
          path="M55 126Q31 76 76 46t101 4q56 34 52 93t-56 93Q121 270 75 228T55 126Z"
        />
        <SectionContainer>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-extrabold tracking-[-0.04em] text-[var(--deep-forest)] sm:text-5xl lg:text-6xl">
              Our Services
            </h2>
            <p className="mt-4 text-lg text-[var(--body-muted)] sm:text-xl">
              Choose the support that helps you bloom.
            </p>
          </div>

          <div className="mt-12 flex snap-x gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-4">
            {services.map((service, index) => (
              <article
                key={service.title}
                className="marketing-surface min-w-[290px] snap-start rounded-[2rem] bg-[var(--cream)] p-8 hover:-translate-y-2 hover:shadow-[0_30px_60px_-30px_rgba(47,58,51,0.28)] md:min-w-0"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] text-[var(--deep-forest)]"
                  style={{ backgroundColor: service.color }}
                >
                  <Icon type={service.icon} className="h-9 w-9" />
                </div>
                <h3 className="mt-6 text-2xl font-extrabold leading-tight text-[var(--deep-forest)]">
                  {service.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-[var(--body-muted)]">{service.description}</p>
              </article>
            ))}
          </div>
        </SectionContainer>
      </section>

      <section id="featured-classes" className="relative overflow-hidden bg-[var(--cream)] py-16 sm:py-20 lg:py-28">
        <Blob
          className="right-[-3rem] top-12 h-48 w-48 opacity-35"
          color="color-mix(in srgb, var(--warm-sand) 48%, white 52%)"
          path="M62 112Q85 37 158 48t95 80q22 69-29 116t-126 24Q23 222 42 150t20-38Z"
        />
        <SectionContainer>
          <div className="mx-auto max-w-3xl text-center">
            <Pill className="mx-auto w-fit border-[color:rgb(242_212_107/0.3)] bg-[color:rgb(242_212_107/0.18)] text-[var(--deep-forest)]">
              <span className="text-[var(--sunshine-yellow)]">
                <Icon type="sparkles" className="h-4 w-4" />
              </span>
              <span>Popular Choices</span>
            </Pill>
            <h2 className="mt-6 text-4xl font-extrabold tracking-[-0.04em] text-[var(--deep-forest)] sm:text-5xl lg:text-6xl">
              Featured Classes
            </h2>
            <p className="mt-4 text-lg leading-8 text-[var(--body-muted)] sm:text-xl">
              Discover our most loved classes designed to build confidence and strengthen skills.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {featuredClasses.map((item) => (
              <article
                key={item.title}
                className="marketing-surface group overflow-hidden rounded-[2rem] bg-white hover:-translate-y-2 hover:shadow-[0_30px_65px_-30px_rgba(47,58,51,0.28)]"
              >
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,58,51,0.05),rgba(47,58,51,0.14))]" />
                  <div
                    className="absolute left-5 top-5 rounded-full px-4 py-2 text-sm font-bold text-[var(--deep-forest)]"
                    style={{ backgroundColor: item.badgeColor }}
                  >
                    {item.category}
                  </div>
                </div>

                <div className="relative p-8">
                  <Blob
                    className="bottom-2 right-2 h-24 w-24 opacity-20"
                    color="color-mix(in srgb, var(--soft-mint) 40%, white 60%)"
                    path="M39 77Q26 42 57 28t65 8q34 22 27 60t-41 60Q51 168 39 77Z"
                  />
                  <h3 className="relative z-10 text-3xl font-extrabold leading-tight text-[var(--deep-forest)]">
                    {item.title}
                  </h3>
                  <div className="relative z-10 mt-6 space-y-3">
                    <DetailRow icon="calendar">{item.schedule}</DetailRow>
                    <DetailRow icon="clock">{item.time}</DetailRow>
                    <DetailRow icon="video">{item.format}</DetailRow>
                  </div>
                  <Link
                    href="/classes"
                    className="relative z-10 mt-7 inline-flex items-center gap-2 rounded-full border border-[color:rgb(154_163_151/0.2)] bg-[var(--cream)] px-6 py-3.5 text-sm font-bold text-[var(--deep-forest)] hover:bg-[var(--sage-green)] hover:text-white"
                  >
                    Learn More
                    <Icon type="arrow" className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/classes"
              className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(154_163_151/0.24)] bg-white px-8 py-4 text-lg font-bold text-[var(--sage-green)] shadow-[0_18px_38px_-28px_rgba(47,58,51,0.35)] hover:-translate-y-1 hover:bg-[var(--sage-green)] hover:text-white"
            >
              View All Classes
              <Icon type="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </SectionContainer>
      </section>

      <section id="why-kora-thryve" className="bg-[color:rgb(217_193_158/0.12)] py-16 sm:py-20 lg:py-28">
        <SectionContainer className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative">
            <div className="marketing-surface relative min-h-[350px] overflow-hidden rounded-[2rem] border-8 border-white sm:min-h-[440px] lg:min-h-[550px]">
              <Image
                src="/marketing/homepage_environment.png"
                alt="A supportive Kora Thryve learning moment"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 44vw"
              />
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-extrabold tracking-[-0.04em] text-[var(--deep-forest)] sm:text-5xl lg:text-6xl">
              Why Choose Kora Thryve
            </h2>
            <div className="mt-10 space-y-6">
              {reasons.map((reason) => (
                <div key={reason.title} className="flex gap-5 rounded-[2rem] bg-white/70 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--fresh-leaf)] text-white">
                    <Icon type="check" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[var(--deep-forest)]">{reason.title}</h3>
                    <p className="mt-2 text-base leading-7 text-[var(--body-muted)]">{reason.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionContainer>
      </section>

      <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-28">
        <Blob
          className="left-[-3rem] top-10 h-40 w-40 opacity-30"
          color="color-mix(in srgb, var(--soft-mint) 48%, white 52%)"
          path="M47 117Q39 70 78 44t78-4q39 22 46 61t-18 77q-25 38-73 39T47 117Z"
        />
        <Blob
          className="bottom-0 right-[-2rem] h-32 w-32 opacity-28"
          color="color-mix(in srgb, var(--soft-peach) 48%, white 52%)"
          path="M36 73Q47 25 95 27t68 41q20 39-10 76T73 170Q25 121 36 73Z"
        />
        <SectionContainer className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <h2 className="text-4xl font-extrabold tracking-[-0.04em] text-[var(--deep-forest)] sm:text-5xl lg:text-6xl">
              How It Works
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--body-muted)] sm:text-xl">
              Getting started is simple, supportive, and designed around every learner’s journey.
            </p>

            <div className="mt-10 space-y-5">
              {steps.map((step) => (
                <article key={step.number} className="marketing-surface rounded-[2rem] bg-[var(--cream)] p-6">
                  <div className="flex gap-5">
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] text-xl font-extrabold text-white"
                      style={{ backgroundColor: step.color }}
                    >
                      {step.number}
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-[var(--deep-forest)]">{step.title}</h3>
                      <p className="mt-2 text-base leading-7 text-[var(--body-muted)]">{step.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-[color:rgb(220_239_229/0.65)] px-5 py-3 text-sm font-semibold text-[var(--deep-forest)]">
              <span className="text-[var(--fresh-leaf)]">
                <Icon type="sparkles" className="h-4 w-4" />
              </span>
              Start your journey with Kora Thryve today
            </div>
          </div>

          <div className="relative">
            <Blob
              className="bottom-6 left-[-2rem] h-44 w-44 opacity-35"
              color="color-mix(in srgb, var(--warm-sand) 45%, white 55%)"
              path="M43 112Q47 47 113 37t101 38q35 48 5 99T121 231Q39 204 43 112Z"
            />
            <div className="marketing-surface relative min-h-[350px] overflow-hidden rounded-[2.5rem] border-8 border-white sm:min-h-[470px] lg:min-h-[600px]">
              <Image
                src="/marketing/homepage_experience2.png"
                alt="Learners working with a supportive tutor"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
            </div>
            <div className="absolute bottom-5 right-5 rounded-full border-4 border-white bg-[var(--sunshine-yellow)] px-5 py-4 text-center text-sm font-extrabold text-[var(--deep-forest)] shadow-[0_20px_40px_-26px_rgba(47,58,51,0.45)]">
              Guided
              <br />
              Growth
            </div>
          </div>
        </SectionContainer>
      </section>

      <section className="relative overflow-hidden bg-[var(--cream)] py-16 sm:py-20 lg:py-28">
        <SectionContainer className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative">
            <Blob
              className="left-[-2rem] top-6 h-44 w-44 opacity-30"
              color="color-mix(in srgb, var(--soft-peach) 44%, white 56%)"
              path="M63 128Q27 74 80 39t106 0q53 35 44 97t-70 92Q99 258 63 128Z"
            />
            <div className="marketing-surface relative min-h-[360px] overflow-hidden rounded-[2.5rem] border-8 border-white sm:min-h-[500px]">
              <Image
                src="/marketing/homepage_main.png"
                alt="Families and learners growing with Kora Thryve"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
            </div>
            <div className="absolute left-5 top-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--fresh-leaf)] text-white shadow-[0_20px_40px_-28px_rgba(47,58,51,0.55)]">
              <Icon type="quote" className="h-8 w-8" />
            </div>
            <div className="absolute bottom-5 right-5 rounded-full border-4 border-white bg-[var(--sunshine-yellow)] px-5 py-3 text-sm font-extrabold text-[var(--deep-forest)] shadow-[0_18px_35px_-24px_rgba(47,58,51,0.48)]">
              Parent Feedback
            </div>
          </div>

          <div>
            <Pill className="w-fit border-[color:rgb(154_163_151/0.2)] bg-white text-[var(--sage-green)]">
              TESTIMONIAL
            </Pill>
            <h2 className="mt-6 text-4xl font-extrabold tracking-[-0.04em] text-[var(--deep-forest)] sm:text-5xl lg:text-6xl">
              What Our Families Say
            </h2>
            <p className="mt-4 text-lg leading-8 text-[var(--body-muted)] sm:text-xl">
              Real feedback from learners and families who have grown with Kora Thryve.
            </p>

            <div className="marketing-surface relative mt-10 overflow-hidden rounded-[2rem] bg-white p-8 sm:p-10">
              <Blob
                className="right-2 top-2 h-28 w-28 opacity-18"
                color="color-mix(in srgb, var(--soft-mint) 55%, white 45%)"
                path="M37 71Q31 30 71 26t61 24q21 28 5 63T74 154Q43 112 37 71Z"
              />
              <p className="relative z-10 text-2xl leading-relaxed text-[var(--deep-forest)]">
                “Kora Thryve has transformed the way we approach learning. The personalized attention
                and supportive environment gave our family the confidence to keep growing.”
              </p>

              <div className="relative z-10 mt-8 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,var(--sage-green),var(--fresh-leaf))] text-lg font-extrabold text-white">
                  JW
                </div>
                <div>
                  <p className="text-lg font-extrabold text-[var(--deep-forest)]">Janet Williams</p>
                  <p className="text-sm text-[var(--body-muted)]">Parent</p>
                </div>
              </div>

              <div className="relative z-10 mt-8 flex items-center justify-between">
                <div className="flex gap-3">
                  <button
                    type="button"
                    aria-label="Previous testimonial"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sage-green)] text-white hover:bg-[var(--fresh-leaf)]"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next testimonial"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sage-green)] text-white hover:bg-[var(--fresh-leaf)]"
                  >
                    ›
                  </button>
                </div>
                <div className="flex gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--sage-green)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[color:rgb(154_163_151/0.28)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[color:rgb(154_163_151/0.28)]" />
                </div>
              </div>
            </div>

            <p className="mt-5 text-sm italic text-[var(--body-muted)]">
              Growing with guidance, every step of the way.
            </p>
          </div>
        </SectionContainer>
      </section>

      <MarketingCtaSection
        title="Start Your Journey with Kora Thryve"
        buttonLabel="Get Started Today"
        buttonHref="/signup"
      />

      <MarketingFooter />
    </main>
  )
}
