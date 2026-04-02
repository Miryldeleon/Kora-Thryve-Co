import Image from 'next/image'
import Link from 'next/link'
import {
  MarketingCtaSection,
  MarketingFooter,
  MarketingNavbar,
  SectionContainer,
  brandName,
  brandTagline,
} from '@/components/marketing/site-chrome'

const services = [
  {
    title: 'Life Skills',
    description: 'Personal development and growth',
  },
  {
    title: 'Wellness & Health Buddy',
    description: 'Holistic health support',
  },
  {
    title: 'Vocal Coaching',
    description: 'Find and strengthen your voice',
  },
  {
    title: 'Private Tutor',
    description: 'One-on-one learning',
  },
]

export default function HomePage() {
  return (
    <main className="bg-[#f5f3ef] text-slate-900">
      <section className="relative isolate overflow-hidden">
        <Image
          src="/marketing/homepage_main.png"
          alt="Kora Thryve community learning circle"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,27,33,0.78)_0%,rgba(30,33,36,0.34)_48%,rgba(38,42,45,0.2)_100%)]" />

        <div className="relative z-10">
          <MarketingNavbar dark />
          <SectionContainer className="flex min-h-[560px] flex-col items-center justify-center pb-24 pt-12 text-center sm:min-h-[610px] sm:pt-14">
            <h1 className="font-serif text-5xl leading-tight tracking-tight text-white sm:text-6xl md:text-7xl">
              {brandName}
            </h1>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-white/80 sm:text-sm">{brandTagline}</p>
            <Link
              href="/student/booking"
              className="mt-10 inline-flex items-center justify-center rounded-full bg-[#cfb083] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_14px_28px_-16px_rgba(207,176,131,0.95)] transition hover:-translate-y-0.5 hover:bg-[#c39f6a]"
            >
              Book a Session
            </Link>
          </SectionContainer>
        </div>
      </section>

      <section className="bg-[#f8f7f4] py-20 sm:py-24">
        <SectionContainer>
          <p className="text-center font-serif text-4xl leading-tight tracking-tight text-[#36383b] sm:text-5xl">
            &quot;Empowering Your Voice to Thrive in Life.&quot;
          </p>
        </SectionContainer>
      </section>

      <section className="bg-[#ece9e5] py-16 sm:py-20">
        <SectionContainer>
          <h2 className="text-center font-serif text-3xl text-[#37393c] sm:text-4xl">Our Services</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => (
              <article
                key={service.title}
                className="rounded-2xl border border-[#ddd7ce] bg-white p-5 shadow-[0_14px_28px_-24px_rgba(22,32,22,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_34px_-24px_rgba(22,32,22,0.55)]"
              >
                <div className="mb-4 h-7 w-7 rounded-full border border-[#b8c5a7] bg-[#eff3e7]" />
                <h3 className="text-[1.05rem] font-semibold text-[#3a3f45]">{service.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{service.description}</p>
              </article>
            ))}
          </div>
        </SectionContainer>
      </section>

      <section className="bg-[#f8f7f4] py-16 sm:py-20">
        <SectionContainer className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div>
            <h2 className="font-serif text-4xl tracking-tight text-[#34373a] sm:text-5xl">
              Personalized Learning Experience
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              At Kora Thryve, we believe in the power of personalized education. Our platform
              connects you with dedicated instructors who tailor each lesson to your unique needs
              and learning style.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#ceb085] px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-16px_rgba(206,176,133,0.9)] transition hover:-translate-y-0.5 hover:bg-[#c49f6f]"
            >
              Start Learning
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative min-h-[230px] overflow-hidden rounded-3xl border border-[#e4e1dc] shadow-[0_20px_35px_-26px_rgba(12,20,15,0.6)] sm:min-h-[270px]">
              <Image
                src="/marketing/homepage_experience1.png"
                alt="Personalized lesson planning"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
            <div className="relative min-h-[230px] overflow-hidden rounded-3xl border border-[#e4e1dc] shadow-[0_20px_35px_-26px_rgba(12,20,15,0.6)] sm:min-h-[270px]">
              <Image
                src="/marketing/homepage_experience2.png"
                alt="Vocal coaching portrait"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          </div>
        </SectionContainer>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <SectionContainer className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div className="order-2 lg:order-1">
            <div className="relative min-h-[330px] overflow-hidden rounded-3xl border border-[#e2ddd3] shadow-[0_24px_40px_-30px_rgba(18,28,20,0.65)] sm:min-h-[390px]">
              <Image
                src="/marketing/homepage_environment.png"
                alt="Flexible learning environment"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="font-serif text-4xl tracking-tight text-[#34373a] sm:text-5xl">
              Flexible Learning Environment
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              Our virtual classroom brings the learning experience directly to you. With
              interactive tools, real-time collaboration, and a secure digital environment, you can
              learn from anywhere while still having the guidance and support you need.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#9cab84] px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-16px_rgba(124,143,103,0.9)] transition hover:-translate-y-0.5 hover:bg-[#8d9f75]"
            >
              Learn More
            </Link>
          </div>
        </SectionContainer>
      </section>

      <MarketingCtaSection
        title="Start Your Journey with Kora Thryve"
        buttonLabel="Create Account"
        buttonHref="/signup"
      />
      <MarketingFooter />
    </main>
  )
}
