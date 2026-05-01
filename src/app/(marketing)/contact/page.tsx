import {
  AnimatedArticle,
  AnimatedDiv,
  AnimatedLink,
  AnimatedMarketingPageHero,
  AnimatedButton,
} from '@/components/marketing/animated'
import {
  MarketingBlob,
  MarketingCtaSection,
  MarketingFooter,
  MarketingIcon,
  SectionContainer,
} from '@/components/marketing/site-chrome'

const contactDetails = [
  {
    label: 'Email',
    value: 'korathryveco@gmail.com',
    href: 'mailto:korathryveco@gmail.com',
    icon: 'mail',
    color: 'var(--cream)',
  },
  {
    label: 'Inquiry Type',
    value: 'Classes, Enrollment, Teaching, Support',
    href: null,
    icon: 'message',
    color: 'var(--soft-mint)',
  },
  {
    label: 'Response Time',
    value: 'We will get back to you as soon as possible',
    href: null,
    icon: 'clock',
    color: 'var(--sunshine-yellow)',
  },
]

const quickLinks = [
  { label: 'View All Classes', href: '/classes' },
  { label: 'Meet Our Teachers', href: '/teachers' },
  { label: 'Learn About Us', href: '/about' },
]

export default function ContactPage() {
  return (
    <main className="overflow-hidden bg-white text-[var(--deep-forest)]">
      <AnimatedMarketingPageHero
        title="Get in Touch"
        subtitle="Have questions about classes, teachers, or enrollment? We'd love to hear from you."
        activePath="/contact"
      />

      <section className="relative bg-white pb-20 sm:pb-24 lg:pb-32">
        <SectionContainer className="grid items-start gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-8">
            <AnimatedArticle className="marketing-surface relative overflow-hidden rounded-[2rem] bg-[var(--cream)] p-8 sm:p-10" scroll>
              <MarketingBlob
                className="right-[-1rem] top-[-1rem] h-28 w-28 opacity-32"
                color="color-mix(in srgb, var(--sage-green) 32%, white 68%)"
                path="M43 112Q47 47 113 37t101 38q35 48 5 99T121 231Q39 204 43 112Z"
              />
              <h2 className="relative z-10 text-3xl font-extrabold text-[var(--deep-forest)]">Contact Information</h2>
              <div className="relative z-10 mt-8 space-y-6">
                {contactDetails.map((detail) => (
                  <div key={detail.label} className="flex gap-4">
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--sage-green)]"
                      style={{ backgroundColor: detail.color }}
                    >
                      <MarketingIcon type={detail.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-[var(--body-muted)]">{detail.label}</p>
                      {detail.href ? (
                        <a href={detail.href} className="mt-1 block text-lg font-extrabold text-[var(--deep-forest)] hover:text-[var(--sage-green)]">
                          {detail.value}
                        </a>
                      ) : (
                        <p className="mt-1 text-lg font-bold text-[var(--deep-forest)]">{detail.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedArticle>

            <AnimatedArticle className="marketing-surface rounded-[2rem] bg-[color:rgb(220_239_229/0.65)] p-8 sm:p-10" scroll>
              <h2 className="text-xl font-extrabold text-[var(--deep-forest)]">Looking for something specific?</h2>
              <div className="mt-6 flex flex-col gap-4">
                {quickLinks.map((link) => (
                  <AnimatedLink
                    key={link.href}
                    href={link.href}
                    className="inline-flex w-fit items-center gap-3 text-base font-extrabold text-[var(--body-muted)] hover:translate-x-1 hover:text-[var(--deep-forest)]"
                  >
                    <MarketingIcon type="arrow" className="h-4 w-4" />
                    {link.label}
                  </AnimatedLink>
                ))}
              </div>
            </AnimatedArticle>
          </div>

          <AnimatedArticle className="marketing-surface rounded-[2rem] bg-white p-8 shadow-[0_34px_80px_-44px_rgba(47,58,51,0.45)] sm:p-10" scroll>
            <h2 className="text-3xl font-extrabold text-[var(--deep-forest)]">Send Us a Message</h2>
            <form className="mt-8 space-y-6">
              <div>
                <label htmlFor="name" className="text-sm font-extrabold text-[var(--deep-forest)]">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  className="mt-3 w-full rounded-2xl border border-transparent bg-[var(--cream)] px-5 py-4 text-base text-[var(--deep-forest)] outline-none transition focus:border-[var(--sage-green)] focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-extrabold text-[var(--deep-forest)]">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  className="mt-3 w-full rounded-2xl border border-transparent bg-[var(--cream)] px-5 py-4 text-base text-[var(--deep-forest)] outline-none transition focus:border-[var(--sage-green)] focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="inquiry" className="text-sm font-extrabold text-[var(--deep-forest)]">
                  Inquiry Type
                </label>
                <select
                  id="inquiry"
                  name="inquiry"
                  defaultValue=""
                  className="mt-3 w-full rounded-2xl border border-transparent bg-[var(--cream)] px-5 py-4 text-base text-[var(--deep-forest)] outline-none transition focus:border-[var(--sage-green)] focus:bg-white"
                >
                  <option value="" disabled>
                    Select an inquiry type
                  </option>
                  <option>Classes</option>
                  <option>Enrollment</option>
                  <option>Teaching</option>
                  <option>Support</option>
                </select>
              </div>
              <div>
                <label htmlFor="message" className="text-sm font-extrabold text-[var(--deep-forest)]">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Tell us how we can help..."
                  rows={6}
                  className="mt-3 w-full resize-none rounded-2xl border border-transparent bg-[var(--cream)] px-5 py-4 text-base text-[var(--deep-forest)] outline-none transition focus:border-[var(--sage-green)] focus:bg-white"
                />
              </div>
              <AnimatedButton
                type="button"
                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--sage-green)] px-8 py-4 text-base font-extrabold text-white shadow-[0_20px_36px_-24px_rgba(47,58,51,0.56)] hover:-translate-y-1 hover:bg-[var(--fresh-leaf)]"
              >
                Send Message
              </AnimatedButton>
            </form>
          </AnimatedArticle>
        </SectionContainer>
      </section>

      <AnimatedDiv>
        <MarketingCtaSection
          title="Ready to start growing with Kora Thryve?"
          text="Explore fixed-schedule classes and supportive mentors designed around steady, confident growth."
          buttonLabel="Explore Classes"
          buttonHref="/classes"
        />
      </AnimatedDiv>
      <MarketingFooter />
    </main>
  )
}
