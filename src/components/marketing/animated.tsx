'use client'

import Link from 'next/link'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import {
  MarketingBlob,
  MarketingIcon,
  MarketingNavbar,
  MarketingPill,
  SectionContainer,
} from '@/components/marketing/site-chrome'
import {
  cardReveal,
  fadeDown,
  fadeUp,
  imageReveal,
  listItemReveal,
  sectionReveal,
  staggerContainer,
  viewportOnce,
  withReducedMotion,
} from '@/lib/animations'

const MotionLink = motion.create(Link)

type RevealProps = {
  children: React.ReactNode
  className?: string
  variant?: Variants
  scroll?: boolean
  delay?: number
}

type AnimatedLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
}

type AnimatedButtonProps = {
  type?: 'button' | 'submit' | 'reset'
  className?: string
  children: React.ReactNode
  disabled?: boolean
  'aria-label'?: string
}

function useMotionSettings() {
  const shouldReduceMotion = useReducedMotion()
  const reveal = (variant: Variants) => withReducedMotion(variant, shouldReduceMotion)
  const buttonHover = shouldReduceMotion ? undefined : { scale: 1.03 }
  const buttonTap = shouldReduceMotion ? undefined : { scale: 0.98 }
  const cardHover = shouldReduceMotion ? undefined : { y: -8 }
  const imageHover = shouldReduceMotion ? undefined : { scale: 1.03 }

  return { reveal, buttonHover, buttonTap, cardHover, imageHover }
}

export function AnimatedDiv({
  children,
  className,
  variant = fadeUp,
  scroll = true,
  delay,
}: RevealProps) {
  const { reveal } = useMotionSettings()

  return (
    <motion.div
      className={className}
      initial="hidden"
      {...(scroll ? { whileInView: 'visible', viewport: viewportOnce } : { animate: 'visible' })}
      variants={reveal(variant)}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedSection({
  children,
  className,
  variant = fadeUp,
  scroll = true,
}: RevealProps) {
  const { reveal } = useMotionSettings()

  return (
    <motion.section
      className={className}
      initial="hidden"
      {...(scroll ? { whileInView: 'visible', viewport: viewportOnce } : { animate: 'visible' })}
      variants={reveal(variant)}
    >
      {children}
    </motion.section>
  )
}

export function AnimatedArticle({
  children,
  className,
  variant = cardReveal,
  scroll = true,
}: RevealProps) {
  const { reveal, cardHover } = useMotionSettings()

  return (
    <motion.article
      className={className}
      initial="hidden"
      {...(scroll ? { whileInView: 'visible', viewport: viewportOnce } : {})}
      variants={reveal(variant)}
      whileHover={cardHover}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.article>
  )
}

export function AnimatedStagger({
  children,
  className,
  scroll = true,
}: {
  children: React.ReactNode
  className?: string
  scroll?: boolean
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      {...(scroll ? { whileInView: 'visible', viewport: viewportOnce } : { animate: 'visible' })}
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedImageFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  const { reveal, imageHover } = useMotionSettings()

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={reveal(imageReveal)}
      whileHover={imageHover}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedLink({ children, className, href }: AnimatedLinkProps) {
  const { buttonHover, buttonTap } = useMotionSettings()

  return (
    <MotionLink
      className={className}
      whileHover={buttonHover}
      whileTap={buttonTap}
      transition={{ duration: 0.25 }}
      href={href}
    >
      {children}
    </MotionLink>
  )
}

export function AnimatedButton({
  children,
  className,
  type = 'button',
  disabled,
  'aria-label': ariaLabel,
  ...props
}: AnimatedButtonProps) {
  const { buttonHover, buttonTap } = useMotionSettings()

  return (
    <motion.button
      className={className}
      whileHover={buttonHover}
      whileTap={buttonTap}
      transition={{ duration: 0.25 }}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export function AnimatedMarketingPageHero({
  badge,
  icon = 'sparkles',
  title,
  subtitle,
  activePath,
}: {
  badge?: string
  icon?: string
  title: string
  subtitle: string
  activePath?: string
}) {
  const { reveal } = useMotionSettings()

  return (
    <section className="relative isolate overflow-hidden bg-white pb-20 pt-1 sm:pb-24 lg:pb-32">
      <MarketingBlob
        className="left-[-4rem] top-36 h-48 w-48 opacity-22"
        color="color-mix(in srgb, var(--soft-peach) 34%, white 66%)"
        path="M55 126Q31 76 76 46t101 4q56 34 52 93t-56 93Q121 270 75 228T55 126Z"
      />
      <MarketingBlob
        className="right-[-3rem] top-40 h-56 w-56 opacity-28"
        color="color-mix(in srgb, var(--warm-sand) 30%, white 70%)"
        path="M62 112Q85 37 158 48t95 80q22 69-29 116t-126 24Q23 222 42 150t20-38Z"
      />
      <motion.div initial="hidden" animate="visible" variants={reveal(fadeDown)}>
        <MarketingNavbar activePath={activePath} />
      </motion.div>
      <SectionContainer>
        <div className="mx-auto max-w-4xl pt-20 text-center sm:pt-28 lg:pt-32">
          {badge ? (
            <motion.div initial="hidden" animate="visible" variants={reveal(fadeDown)}>
              <MarketingPill className="mx-auto w-fit border-[color:rgb(154_163_151/0.22)] bg-[var(--cream)] text-[var(--deep-forest)]">
                <span className="text-[var(--sage-green)]">
                  <MarketingIcon type={icon} className="h-4 w-4" />
                </span>
                <span>{badge}</span>
              </MarketingPill>
            </motion.div>
          ) : null}
          <motion.h1
            className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-tight text-[var(--deep-forest)] sm:text-6xl lg:text-7xl"
            initial="hidden"
            animate="visible"
            variants={reveal(fadeUp)}
          >
            {title}
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[var(--body-muted)] sm:text-xl"
            initial="hidden"
            animate="visible"
            variants={reveal(fadeUp)}
          >
            {subtitle}
          </motion.p>
        </div>
      </SectionContainer>
    </section>
  )
}

export const marketingAnimationVariants = {
  cardReveal,
  fadeDown,
  fadeUp,
  imageReveal,
  listItemReveal,
  sectionReveal,
}
