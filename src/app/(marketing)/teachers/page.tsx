import Image from 'next/image'
import {
  AnimatedArticle,
  AnimatedButton,
  AnimatedLink,
  AnimatedMarketingPageHero,
  AnimatedStagger,
  AnimatedDiv,
} from '@/components/marketing/animated'
import {
  MarketingBlob,
  MarketingFooter,
  MarketingIcon,
  SectionContainer,
} from '@/components/marketing/site-chrome'
import { marketingTeachers } from '@/lib/marketing/teachers'

const filters = ['All', 'English', 'Life Coaching', 'Speech & Drama', 'Voice', 'Learner Support']

const supportCards = [
  { title: 'Patient Guidance', icon: 'heart', color: 'var(--soft-peach)' },
  { title: 'Personalized Support', icon: 'users', color: 'var(--soft-mint)' },
  { title: 'Confidence Building', icon: 'sparkles', color: 'var(--sunshine-yellow)' },
]

function MentorImage({
  src,
  alt,
  category,
  accent,
}: {
  src: string | null
  alt: string
  category: string
  accent: string
}) {
  return (
    <div className="relative h-64 overflow-hidden bg-[var(--cream)]">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[color:rgb(220_239_229/0.55)] text-[var(--sage-green)]">
          <MarketingIcon type="users" className="h-16 w-16" />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(47,58,51,0.02),rgba(47,58,51,0.12))]" />
      <span
        className="absolute right-5 top-5 rounded-full border border-white/70 px-4 py-2 text-sm font-extrabold text-[var(--deep-forest)] shadow-[0_14px_28px_-22px_rgba(47,58,51,0.45)]"
        style={{ backgroundColor: accent }}
      >
        {category}
      </span>
    </div>
  )
}

export default function TeachersPage() {
  return (
    <main className="overflow-hidden bg-white text-[var(--deep-forest)]">
      <AnimatedMarketingPageHero
        badge="Supportive Mentors"
        icon="users"
        title="Meet the Mentors Behind Kora Thryve"
        subtitle="Caring teachers, coaches, and support guides dedicated to helping every learner grow with confidence."
        activePath="/teachers"
      />

      <section className="bg-white pb-20 sm:pb-24 lg:pb-32">
        <SectionContainer>
          <div className="flex flex-wrap justify-center gap-3">
            {filters.map((filter, index) => (
              <AnimatedButton
                key={filter}
                type="button"
                className={`rounded-full px-5 py-3 text-sm font-extrabold shadow-[0_12px_26px_-24px_rgba(47,58,51,0.42)] ${
                  index === 0
                    ? 'bg-[var(--sage-green)] text-white'
                    : 'bg-[var(--cream)] text-[var(--deep-forest)] hover:bg-[var(--soft-mint)]'
                  }`}
              >
                {filter}
              </AnimatedButton>
            ))}
          </div>

          <AnimatedStagger className="mt-20 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {marketingTeachers.map((mentor) => (
              <AnimatedArticle
                key={mentor.name}
                className="marketing-surface group overflow-hidden rounded-[2rem] bg-white hover:-translate-y-2 hover:shadow-[0_30px_65px_-30px_rgba(47,58,51,0.28)]"
              >
                <MentorImage
                  src={mentor.image}
                  alt={`${mentor.name}, ${mentor.category} mentor`}
                  category={mentor.category}
                  accent={mentor.badgeColor}
                />
                <div className="relative p-7">
                  <MarketingBlob
                    className="bottom-4 right-3 h-20 w-20 opacity-18"
                    color="color-mix(in srgb, var(--soft-mint) 48%, white 52%)"
                    path="M39 77Q26 42 57 28t65 8q34 22 27 60t-41 60Q51 168 39 77Z"
                  />
                  <h2 className="relative z-10 text-2xl font-extrabold text-[var(--deep-forest)]">{mentor.name}</h2>
                  <p className="relative z-10 mt-3 min-h-[4.5rem] text-sm leading-7 text-[var(--body-muted)]">
                    {mentor.shortDescription}
                  </p>
                  <div className="relative z-10 mt-5 flex flex-wrap gap-2">
                    {mentor.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--cream)] px-3 py-1.5 text-xs font-bold text-[var(--deep-forest)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <AnimatedLink
                    href={`/teachers/${mentor.id}`}
                    className="relative z-10 mt-7 inline-flex w-full items-center justify-center rounded-full bg-[var(--sage-green)] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_18px_35px_-26px_rgba(47,58,51,0.5)] hover:-translate-y-1 hover:bg-[var(--fresh-leaf)]"
                  >
                    Learn More
                  </AnimatedLink>
                </div>
              </AnimatedArticle>
            ))}
          </AnimatedStagger>
        </SectionContainer>
      </section>

      <section className="relative overflow-hidden bg-[var(--cream)] py-20 sm:py-24 lg:py-28">
        <MarketingBlob
          className="left-[-3rem] top-8 h-44 w-44 opacity-24"
          color="color-mix(in srgb, var(--soft-peach) 38%, white 62%)"
          path="M63 128Q27 74 80 39t106 0q53 35 44 97t-70 92Q99 258 63 128Z"
        />
        <SectionContainer>
          <AnimatedDiv>
            <h2 className="mx-auto max-w-4xl text-center text-4xl font-extrabold tracking-tight text-[var(--sage-green)] sm:text-5xl lg:text-6xl">
              Every learner deserves a mentor who listens.
            </h2>
          </AnimatedDiv>
          <AnimatedStagger className="mt-12 grid gap-6 md:grid-cols-3">
            {supportCards.map((card) => (
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

      <MarketingFooter />
    </main>
  )
}
