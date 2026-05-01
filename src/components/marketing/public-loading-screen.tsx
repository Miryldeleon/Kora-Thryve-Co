'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import logoIcon from '@/app/Kora-Thryve-Co-Logo.png'

const loaderStorageKey = 'kora-public-loader-seen'
const visibleDurationMs = 2000
const reducedMotionVisibleDurationMs = 650
const fadeDurationSeconds = 0.45
const reducedMotionFadeDurationSeconds = 0.18

const publicMarketingRoutes = ['/', '/about', '/teachers', '/classes', '/contact']

const particles = [
  { x: '-7.5rem', y: '-4.5rem', color: '#8FBF7A', delay: 0 },
  { x: '-3.75rem', y: '-7.75rem', color: '#F2D46B', delay: 0.12 },
  { x: '2.75rem', y: '-7.5rem', color: '#F4B39A', delay: 0.24 },
  { x: '7.25rem', y: '-3.75rem', color: '#DCEFE5', delay: 0.36 },
  { x: '7.75rem', y: '2.5rem', color: '#D9C19E', delay: 0.48 },
  { x: '2.75rem', y: '7.5rem', color: '#9AA397', delay: 0.6 },
  { x: '-4.75rem', y: '7rem', color: '#8FBF7A', delay: 0.72 },
  { x: '-8rem', y: '1.5rem', color: '#F2D46B', delay: 0.84 },
]

function isPublicMarketingRoute(pathname: string) {
  if (pathname === '/') return true

  return publicMarketingRoutes
    .filter((route) => route !== '/')
    .some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function FloatingBlob({
  className,
  color,
  delay = 0,
  disabled,
}: {
  className: string
  color: string
  delay?: number
  disabled: boolean
}) {
  return (
    <motion.div
      aria-hidden="true"
      className={`absolute rounded-[45%_55%_52%_48%/52%_45%_55%_48%] blur-[1px] ${className}`}
      style={{ backgroundColor: color }}
      animate={disabled ? undefined : { y: [-12, 12, -12], rotate: [-3, 3, -3], scale: [0.98, 1.03, 0.98] }}
      transition={{ duration: 5.2, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

function Leaf({
  className,
  color,
  delay = 0,
  disabled,
}: {
  className: string
  color: string
  delay?: number
  disabled: boolean
}) {
  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 54 80"
      className={`absolute ${className}`}
      fill="none"
      initial={{ opacity: 0, scale: disabled ? 1 : 0.9, rotate: disabled ? 0 : -8 }}
      animate={
        disabled
          ? { opacity: 1 }
          : { opacity: 1, y: [0, -8, 0], rotate: [-10, 8, -10], scale: [0.94, 1.03, 0.94] }
      }
      transition={{ duration: disabled ? 0.2 : 3.1, delay, repeat: disabled ? 0 : Infinity, ease: 'easeInOut' }}
    >
      <path d="M27 76V12" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <path d="M27 23C16 18 10 12 7 4c11 1 19 6 20 19Z" fill={color} opacity="0.72" />
      <path d="M27 36c12-5 19-12 22-22-12 1-20 8-22 22Z" fill={color} opacity="0.74" />
      <path d="M27 50C15 44 8 36 5 25c13 2 21 10 22 25Z" fill={color} opacity="0.62" />
      <path d="M27 62c12-5 19-13 22-24-13 2-21 10-22 24Z" fill={color} opacity="0.66" />
    </motion.svg>
  )
}

export function PublicLoadingScreen() {
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timers: number[] = []
    const safelySetVisible = (value: boolean, delay = 0) => {
      const timer = window.setTimeout(() => setIsVisible(value), delay)
      timers.push(timer)
    }

    if (!isPublicMarketingRoute(pathname)) {
      safelySetVisible(false)
      return () => timers.forEach((timer) => window.clearTimeout(timer))
    }

    try {
      if (window.sessionStorage.getItem(loaderStorageKey)) {
        safelySetVisible(false)
        return () => timers.forEach((timer) => window.clearTimeout(timer))
      }
    } catch {
      safelySetVisible(false)
      return () => timers.forEach((timer) => window.clearTimeout(timer))
    }

    safelySetVisible(true)

    const visibleDuration = shouldReduceMotion ? reducedMotionVisibleDurationMs : visibleDurationMs
    const hideTimer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(loaderStorageKey, 'true')
      } catch {
        // If storage is unavailable, still let the overlay leave normally.
      }
      setIsVisible(false)
    }, visibleDuration)
    timers.push(hideTimer)

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [pathname, shouldReduceMotion])

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center overflow-hidden bg-[#F8F6F1] bg-[linear-gradient(135deg,#F8F6F1_0%,#FFFFFF_54%,#F4FAF7_100%)] px-6 text-[var(--deep-forest)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: shouldReduceMotion ? reducedMotionFadeDurationSeconds : fadeDurationSeconds,
            ease: [0.22, 1, 0.36, 1],
          }}
          role="status"
          aria-live="polite"
          aria-label="Loading Kora Thryve & Co."
        >
          {!shouldReduceMotion ? (
            <>
              <FloatingBlob
                disabled={false}
                className="left-[-5rem] top-[-2rem] h-52 w-52 opacity-[0.18] sm:h-72 sm:w-72"
                color="#D9C19E"
              />
              <FloatingBlob
                disabled={false}
                className="bottom-[-6rem] right-[-4rem] h-60 w-60 opacity-[0.13] sm:h-80 sm:w-80"
                color="#F4B39A"
                delay={0.35}
              />
              <FloatingBlob
                disabled={false}
                className="right-[11%] top-[32%] h-36 w-36 opacity-[0.18] sm:h-52 sm:w-52"
                color="#DCEFE5"
                delay={0.65}
              />
            </>
          ) : null}

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80">
              {!shouldReduceMotion ? (
                <>
                  <motion.span
                    aria-hidden="true"
                    className="absolute h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(154,163,151,0.34)_0%,rgba(154,163,151,0.13)_42%,transparent_72%)] sm:h-80 sm:w-80"
                    animate={{ scale: [0.76, 1.18, 0.76], opacity: [0.48, 0.12, 0.48] }}
                    transition={{ duration: 1.95, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.span
                    aria-hidden="true"
                    className="absolute h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(220,239,229,0.48)_0%,rgba(220,239,229,0.18)_44%,transparent_74%)] sm:h-72 sm:w-72"
                    animate={{ scale: [0.88, 1.32, 0.88], opacity: [0.46, 0.14, 0.46] }}
                    transition={{ duration: 2.35, delay: 0.22, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {particles.map((particle, index) => (
                    <motion.span
                      key={`${particle.color}-${index}`}
                      aria-hidden="true"
                      className="absolute h-2.5 w-2.5 rounded-full shadow-[0_0_18px_rgba(154,163,151,0.18)] sm:h-3 sm:w-3"
                      style={{ backgroundColor: particle.color, x: particle.x, y: particle.y }}
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={{
                        opacity: [0, 0.82, 0],
                        scale: [0.75, 1.08, 0.88],
                        y: [particle.y, `calc(${particle.y} - 46px)`],
                        x: [particle.x, `calc(${particle.x} + ${index % 2 === 0 ? 14 : -14}px)`],
                      }}
                      transition={{ duration: 2.05, delay: particle.delay, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ))}
                  <Leaf
                    disabled={false}
                    className="left-5 top-8 h-14 w-10 -rotate-12 sm:left-8 sm:top-10 sm:h-16 sm:w-12"
                    color="#6F806F"
                    delay={0.2}
                  />
                  <Leaf
                    disabled={false}
                    className="bottom-7 right-8 h-12 w-9 rotate-45 sm:bottom-9 sm:right-12 sm:h-14 sm:w-10"
                    color="#F2D46B"
                    delay={0.42}
                  />
                </>
              ) : null}
              <motion.div
                className="relative flex h-48 w-48 items-center justify-center drop-shadow-[0_34px_48px_rgba(47,58,51,0.18)] sm:h-56 sm:w-56 lg:h-72 lg:w-72"
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.62, rotate: shouldReduceMotion ? 0 : -9 }}
                animate={
                  shouldReduceMotion
                    ? { opacity: 1, scale: 1, rotate: 0 }
                    : { opacity: 1, scale: [1, 1.035, 1], rotate: 0, y: [0, -12, 0] }
                }
                transition={
                  shouldReduceMotion
                    ? { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
                    : {
                        opacity: { duration: 0.62, ease: [0.22, 1, 0.36, 1] },
                        rotate: { duration: 0.68, ease: [0.22, 1, 0.36, 1] },
                        scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                        y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                      }
                }
              >
                <Image
                  src={logoIcon}
                  alt="Kora Thryve & Co. logo"
                  className="h-full w-full object-contain"
                  priority
                />
              </motion.div>
            </div>

            <motion.p
              className="mt-4 text-sm font-bold tracking-[0.26em] text-[color:rgb(90_107_94/0.76)] sm:mt-5 sm:text-base"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
              animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: [1, 0.72, 1], y: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.2 }
                  : {
                      opacity: { duration: 2.4, delay: 0.45, repeat: Infinity, ease: 'easeInOut' },
                      y: { duration: 0.5, delay: 0.22 },
                    }
              }
            >
              Growing with guidance
            </motion.p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
