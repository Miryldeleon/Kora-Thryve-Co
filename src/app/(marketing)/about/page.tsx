import Image from 'next/image'
import logoIcon from '@/app/Kora-Thryve-Co-Logo.png'
import {
  AnimatedArticle,
  AnimatedDiv,
  AnimatedImageFrame,
  AnimatedLink,
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

const coreValues = [
  {
    title: 'Personalization',
    description:
      'Every learner is unique. We tailor our approach to individual needs, learning styles, and goals.',
    icon: 'book',
    color: 'var(--soft-mint)',
  },
  {
    title: 'Holistic Growth',
    description: 'Education encompasses mind, body, and spirit. We support development in all areas of life.',
    icon: 'sparkles',
    color: 'var(--sunshine-yellow)',
  },
  {
    title: 'Empowerment',
    description: 'We help individuals find their voice and develop the confidence to use it.',
    icon: 'heart',
    color: 'var(--soft-peach)',
  },
]

const beliefCards = [
  { title: 'Learn with purpose', icon: 'book', color: 'var(--soft-mint)' },
  { title: 'Grow with guidance', icon: 'sparkles', color: 'var(--soft-mint)' },
]

export default function AboutPage() {
  return (
    <main className="overflow-hidden bg-white text-[var(--deep-forest)]">
      <section className="relative isolate overflow-hidden bg-white pb-20 pt-1 sm:pb-24 lg:pb-32">
        <MarketingBlob
          className="left-[-4rem] bottom-12 h-52 w-52 opacity-24"
          color="color-mix(in srgb, var(--soft-peach) 34%, white 66%)"
          path="M55 126Q31 76 76 46t101 4q56 34 52 93t-56 93Q121 270 75 228T55 126Z"
        />
        <MarketingBlob
          className="right-[-2rem] top-40 h-56 w-56 opacity-26"
          color="color-mix(in srgb, var(--warm-sand) 32%, white 68%)"
          path="M62 112Q85 37 158 48t95 80q22 69-29 116t-126 24Q23 222 42 150t20-38Z"
        />
        <MarketingNavbar activePath="/about" />
        <SectionContainer className="grid items-center gap-14 pt-16 sm:pt-24 lg:grid-cols-[0.98fr_1.02fr] lg:pt-28">
          <div>
            <AnimatedDiv variant={marketingAnimationVariants.fadeUp} scroll={false}>
              <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight text-[var(--deep-forest)] sm:text-6xl lg:text-7xl">
              Who We Are & What We Stand For
              </h1>
            </AnimatedDiv>
            <AnimatedDiv variant={marketingAnimationVariants.fadeUp} scroll={false}>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--body-muted)] sm:text-xl">
              Kora Thryve & Co is a non-profit Singapore-based service provider offering English tutoring, vocal
              coaching, life wellness and health coaching, supporting individuals in personal growth, confidence,
              communication, and overall well-being.
              </p>
            </AnimatedDiv>
            <AnimatedLink
              href="/classes"
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-[var(--sage-green)] px-8 py-4 text-base font-extrabold text-white shadow-[0_20px_36px_-24px_rgba(47,58,51,0.56)] hover:-translate-y-1 hover:bg-[var(--fresh-leaf)]"
            >
              Explore Classes
              <MarketingIcon type="arrow" className="h-4 w-4" />
            </AnimatedLink>
          </div>

          <AnimatedImageFrame className="marketing-surface relative min-h-[340px] overflow-hidden rounded-[2rem] bg-[var(--sage-green)] p-8 shadow-[0_34px_70px_-42px_rgba(47,58,51,0.55)] sm:min-h-[430px] lg:min-h-[500px]">
            <MarketingBlob
              className="right-[-4rem] top-[-3rem] h-44 w-44 opacity-16"
              color="white"
              path="M62 112Q85 37 158 48t95 80q22 69-29 116t-126 24Q23 222 42 150t20-38Z"
            />
            <MarketingBlob
              className="bottom-[-4rem] left-[-4rem] h-48 w-48 opacity-12"
              color="var(--sunshine-yellow)"
              path="M63 128Q27 74 80 39t106 0q53 35 44 97t-70 92Q99 258 63 128Z"
            />
            <div className="relative z-10 flex h-full min-h-[276px] flex-col items-center justify-center rounded-[1.6rem] border border-white/12 bg-white/8 text-center sm:min-h-[366px] lg:min-h-[436px]">
              <Image
                src={logoIcon}
                alt="Kora Thryve & Co. logo"
                className="h-36 w-36 object-contain brightness-0 invert sm:h-44 sm:w-44"
                priority
              />
              <p className="mt-7 text-3xl font-extrabold tracking-[0.08em] text-white sm:text-4xl">KORA THRYVE</p>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.28em] text-white/82">and Co.</p>
            </div>
          </AnimatedImageFrame>
        </SectionContainer>
      </section>

      <section className="bg-[var(--cream)] py-20 text-center sm:py-24 lg:py-28">
        <SectionContainer>
          <h2 className="text-4xl font-extrabold tracking-tight text-[var(--sage-green)] sm:text-5xl lg:text-6xl">
            Guided learning, rooted in care.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[var(--body-muted)]">
            Kora Thryve & Co. was created to support learners beyond academics. Through tutoring, voice care, wellness
            support, life skills coaching, and confidence-building sessions, we provide a space where students can feel
            seen, supported, and encouraged to grow.
          </p>
        </SectionContainer>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <SectionContainer>
          <AnimatedStagger className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {beliefCards.map((card) => (
              <AnimatedArticle key={card.title} className="marketing-surface rounded-[2rem] bg-white p-8 text-center">
                <div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] text-[var(--deep-forest)]"
                  style={{ backgroundColor: card.color }}
                >
                  <MarketingIcon type={card.icon} className="h-7 w-7" />
                </div>
                <h3 className="mt-6 text-xl font-extrabold text-[var(--deep-forest)]">{card.title}</h3>
              </AnimatedArticle>
            ))}
          </AnimatedStagger>
        </SectionContainer>
      </section>

      <section className="bg-[var(--cream)] py-20 sm:py-24 lg:py-28">
        <SectionContainer className="grid gap-8 lg:grid-cols-2">
          <AnimatedArticle className="marketing-surface rounded-[2rem] bg-white p-8 sm:p-10" scroll>
            <h2 className="text-3xl font-extrabold text-[var(--deep-forest)]">Our Mission</h2>
            <p className="mt-5 text-base leading-8 text-[var(--body-muted)]">
              To create a nurturing educational environment where every individual can discover their potential, develop
              their unique voice, and cultivate the skills needed to thrive in both personal and everyday life.
            </p>
          </AnimatedArticle>
          <AnimatedArticle className="marketing-surface rounded-[2rem] bg-white p-8 sm:p-10" scroll>
            <h2 className="text-3xl font-extrabold text-[var(--deep-forest)]">Our Vision</h2>
            <p className="mt-5 text-base leading-8 text-[var(--body-muted)]">
              To become a trusted home for personalized, holistic education that empowers learners to grow with
              confidence, wellness, communication, and meaningful support.
            </p>
          </AnimatedArticle>
        </SectionContainer>
      </section>

      <section className="bg-white py-20 sm:py-24 lg:py-28">
        <SectionContainer>
          <h2 className="text-center text-4xl font-extrabold tracking-tight text-[var(--sage-green)] sm:text-5xl lg:text-6xl">
            Core Values
          </h2>
          <AnimatedStagger className="mt-12 grid gap-6 md:grid-cols-3">
            {coreValues.map((value) => (
              <AnimatedArticle key={value.title} className="marketing-surface rounded-[2rem] bg-white p-8">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] text-[var(--deep-forest)]"
                  style={{ backgroundColor: value.color }}
                >
                  <MarketingIcon type={value.icon} className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-2xl font-extrabold text-[var(--deep-forest)]">{value.title}</h3>
                <p className="mt-4 text-base leading-7 text-[var(--body-muted)]">{value.description}</p>
              </AnimatedArticle>
            ))}
          </AnimatedStagger>
        </SectionContainer>
      </section>

      <section className="bg-white pb-20 sm:pb-24 lg:pb-32">
        <SectionContainer>
          <AnimatedDiv className="marketing-surface relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-[color:rgb(220_239_229/0.62)] p-9 text-center sm:p-12">
            <MarketingBlob
              className="left-5 top-4 h-24 w-24 opacity-20"
              color="var(--sage-green)"
              path="M43 112Q47 47 113 37t101 38q35 48 5 99T121 231Q39 204 43 112Z"
            />
            <MarketingBlob
              className="bottom-3 right-8 h-24 w-24 opacity-24"
              color="var(--soft-peach)"
              path="M39 77Q26 42 57 28t65 8q34 22 27 60t-41 60Q51 168 39 77Z"
            />
            <p className="relative z-10 text-2xl font-extrabold leading-relaxed text-[var(--deep-forest)] sm:text-3xl">
              We believe every learner deserves a safe, encouraging space where their voice, confidence, and potential
              can grow.
            </p>
          </AnimatedDiv>
        </SectionContainer>
      </section>

      <AnimatedDiv>
        <MarketingCtaSection
          title="Ready to Begin Your Journey?"
          text="Build confidence, discover support, and grow with guidance every step of the way."
          buttonLabel="Get Started"
          buttonHref="/signup"
        />
      </AnimatedDiv>
      <MarketingFooter />
    </main>
  )
}
