import Image from 'next/image'
import {
  MarketingCtaSection,
  MarketingFooter,
  MarketingNavbar,
  SectionContainer,
} from '@/components/marketing/site-chrome'

const coreValues = [
  {
    title: 'Personalization',
    description:
      'Every learner is unique. We tailor our approach to individual needs, learning styles, and goals.',
  },
  {
    title: 'Holistic Growth',
    description:
      'Education encompasses mind, body, and spirit. We support development in all areas of life.',
  },
  {
    title: 'Empowerment',
    description:
      'We believe in helping individuals find their voice and develop the confidence to use it.',
  },
]

export default function AboutPage() {
  return (
    <main className="bg-[#f5f3ef] text-slate-900">
      <section className="bg-[#f7f6f3] pb-16 pt-1 sm:pb-20">
        <MarketingNavbar />
        <SectionContainer>
          <div className="mx-auto max-w-3xl pt-14 text-center sm:pt-20">
            <h1 className="font-serif text-5xl tracking-tight text-[#36383b] sm:text-6xl">About Kora Thryve</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600">
              We are dedicated to empowering individuals through personalized education and holistic
              wellness coaching. Our platform connects learners with passionate educators who are
              committed to helping you thrive in all aspects of life.
            </p>
          </div>
        </SectionContainer>
      </section>

      <section className="bg-[#ece9e5] py-14 sm:py-16">
        <SectionContainer>
          <div className="relative mx-auto min-h-[320px] max-w-4xl overflow-hidden rounded-2xl border border-[#dfd9cf] shadow-[0_24px_40px_-30px_rgba(15,23,42,0.45)] sm:min-h-[360px]">
            <Image
              src="/marketing/homepage_experience2.png"
              alt="Kora Thryve learner profile"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
          </div>
        </SectionContainer>
      </section>

      <section className="bg-[#f7f6f3] py-16 sm:py-20">
        <SectionContainer className="grid gap-12 md:grid-cols-2">
          <article>
            <h2 className="font-serif text-4xl tracking-tight text-[#36383b]">Our Mission</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              To create a nurturing educational environment where every individual can discover
              their potential, develop their unique voice, and cultivate the skills needed to
              thrive in both personal and professional life.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              We believe that education extends beyond traditional academics and embraces wellness,
              organization, communication, and personal growth.
            </p>
          </article>
          <article>
            <h2 className="font-serif text-4xl tracking-tight text-[#36383b]">Our Vision</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              To become the leading platform for personalized, holistic education that transforms
              lives and empowers individuals to reach their full potential.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              We envision a world where learning is accessible, personalized, and integrated with
              wellness practices, where every individual has the support they need to grow, thrive,
              and make a positive impact in their communities.
            </p>
          </article>
        </SectionContainer>
      </section>

      <section className="bg-[#ece9e5] py-16 sm:py-20">
        <SectionContainer>
          <h2 className="text-center font-serif text-4xl tracking-tight text-[#36383b] sm:text-5xl">Our Core Values</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {coreValues.map((value) => (
              <article
                key={value.title}
                className="rounded-2xl border border-[#ddd7ce] bg-white p-6 shadow-[0_14px_28px_-24px_rgba(22,32,22,0.45)]"
              >
                <h3 className="text-lg font-semibold text-[#3a3f45]">{value.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{value.description}</p>
              </article>
            ))}
          </div>
        </SectionContainer>
      </section>

      <MarketingCtaSection title="Ready to Begin Your Journey?" buttonLabel="Get Started" buttonHref="/signup" />
      <MarketingFooter />
    </main>
  )
}
