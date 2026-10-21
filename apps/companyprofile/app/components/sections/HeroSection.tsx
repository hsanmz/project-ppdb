'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Award, Calendar } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollAnimations'
import dynamic from 'next/dynamic'
import MagneticButton from '../ui/MagneticButton'
import { buildSchedule, type ActivePpdbWave } from '@/app/lib/ppdb'
import type { HeroSlide } from '@/app/lib/types'
import { gsap, ScrollTrigger } from '@/app/lib/gsap'
import { onLayoutReady, prefersReducedMotion } from '@/app/lib/motion'
import HeroWaveSVG from './HeroWaveSVG'

// Dipakai di HeroSection tapi import-nya belum ada — TypeScript gagal dengan
// "Cannot find name 'Particles'". Pola dynamic + ssr:false disamakan dengan
// CTASection yang memakai komponen yang sama, supaya tidak ada dua cara
// memuatnya di app ini.
const Particles = dynamic(() => import('../ui/Particles'), { ssr: false })

/** Jeda auto-geser antar slide (ms). */
const AUTOPLAY_MS = 6000

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2071&auto=format&fit=crop'

/**
 * Slide bawaan ketika CMS `hero-slides` masih kosong. Isinya sengaja disamakan
 * persis dengan hero sebelum ada CMS, supaya beranda tidak berubah sampai
 * panitia mengisi tab "Hero Beranda" di dashboard. Karena hanya ada satu
 * slide, tombol geser otomatis tidak muncul.
 */
const FALLBACK_SLIDE: HeroSlide = {
  id: '__fallback__',
  image: FALLBACK_IMAGE,
  content: {
    label: 'DIDIRIKAN 2021',
    title: 'Pesantren\nTahfidz\nDigital',
    subtitle:
      'Mendidik generasi hafizh yang melek teknologi. Tempat Al-Quran dan Artificial Intelligence berjalan berdampingan.',
    button_label: 'Lihat Program',
    button_href: '/programs',
  },
}

/**
 * Render judul slide. Baris dipisah oleh `\n` (jadi admin bisa menyusun judul
 * beberapa baris), dan kata terakhir diberi warna aksen. Aturan "kata terakhir"
 * ini yang mempertahankan tampilan hero lama — "Digital" hijau — tanpa perlu
 * markup khusus dari admin.
 */
function renderTitle(title: string) {
  const lines = title.split('\n')
  return lines.map((line, i) => {
    const isLast = i === lines.length - 1
    if (!isLast) {
      return (
        <span key={i}>
          {line}
          <br />
        </span>
      )
    }
    const match = line.match(/^(.*?)(\S+)(\s*)$/)
    if (!match) return <span key={i}>{line}</span>
    const [, head, word, tail] = match
    return (
      <span key={i}>
        {head}
        <span className="text-[var(--accent)]">{word}</span>
        {tail}
      </span>
    )
  })
}

export default function HeroSection({
  wave = null,
  slides = [],
}: {
  wave?: ActivePpdbWave | null
  slides?: HeroSlide[]
}) {
  const pathname = usePathname()
  const sectionRef = useRef<HTMLElement>(null)
  const ppdb = buildSchedule(wave)

  const decorRef1 = useRef<HTMLDivElement>(null)
  const decorRef2 = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)

  // `slides` kosong -> pakai satu slide bawaan (statis, tanpa kontrol geser).
  const items = slides.length > 0 ? slides : [FALLBACK_SLIDE]
  const count = items.length

  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  // Kalau daftar slide menyusut (mis. lewat SSE), indeks lama bisa melewati
  // batas — clamp saat render.
  const current = items[Math.min(active, count - 1)]
  const content = current.content ?? {}

  const goTo = useCallback(
    (next: number) => setActive((next + count) % count),
    [count],
  )

  // Reveal diarahkan ke elemen konten, BUKAN ke sectionRef. Section dipakai sebagai
  // trigger ScrollTrigger parallax di bawah, dan ScrollTrigger mengukur lewat
  // getBoundingClientRect() yang ikut transform — kalau section ikut bergeser karena
  // reveal, start/end parallax ikut bergeser sendiri.
  useScrollReveal(leftRef, { start: 'top 60%' })
  useScrollReveal(hintRef, { start: 'top 92%' })

  useEffect(() => {
    if (prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      if (decorRef1.current) {
        gsap.to(decorRef1.current, {
          y: -80,
          ease: 'none',
          scrollTrigger: { trigger: sectionRef.current, start: 'top bottom', end: 'bottom top', scrub: 1.5, invalidateOnRefresh: true },
        })
      }
      if (decorRef2.current) {
        gsap.to(decorRef2.current, {
          y: 60,
          ease: 'none',
          scrollTrigger: { trigger: sectionRef.current, start: 'top bottom', end: 'bottom top', scrub: 1.5, invalidateOnRefresh: true },
        })
      }
    }, sectionRef)

    // Elemen kanan ini `hidden lg:block`; di bawah lg ScrollTrigger tidak punya
    // ukuran yang bisa diukur, jadi tween-nya hanya dibuat di breakpoint desktop.
    const mm = gsap.matchMedia()
    mm.add('(min-width: 1024px)', () => {
      if (rightRef.current) {
        gsap.fromTo(rightRef.current,
          { opacity: 0, x: 100, scale: 0.95 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: rightRef.current,
              start: 'top 80%',
            },
          }
        )
      }
    })

    const cleanupLayout = onLayoutReady(() => ScrollTrigger.refresh())

    return () => {
      cleanupLayout()
      mm.revert()
      ctx.revert()
    }
  }, [])

  // Auto-geser hanya saat ada lebih dari satu slide. Dijeda ketika kursor berada
  // di atas hero (supaya sempat dibaca) dan saat pengguna memilih "reduce motion".
  useEffect(() => {
    if (count <= 1 || paused || prefersReducedMotion()) return

    const id = window.setInterval(
      () => setActive((i) => (i + 1) % count),
      AUTOPLAY_MS,
    )
    return () => window.clearInterval(id)
  }, [count, paused])

  if (pathname !== '/') return null

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#F7F5F0] via-white to-[#F0EDE4]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.15] pointer-events-none" />
      {/* Corrected decorative wave SVG - colors now match company profile (emerald + gold) */}
      <HeroWaveSVG />
      <Particles count={40} />
      {/* Decorative background with parallax */}
      <div ref={decorRef1} className="absolute top-0 right-0 w-1/2 h-full opacity-[0.04] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, var(--color-emerald) 0%, transparent 70%)' }}
      />
      <div ref={decorRef2} className="absolute bottom-0 left-0 w-1/3 h-1/2 opacity-[0.03] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, var(--color-gold) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full pt-20 sm:pt-28 pb-16 sm:pb-20">
        <div className="grid lg:grid-cols-12 gap-8 md:gap-12 items-center">
          {/* Left Content */}
          <div ref={leftRef} className="lg:col-span-7">
            {/* `key` meremount blok ini tiap ganti slide supaya animasi masuk
                diputar ulang; ref GSAP tetap di elemen luar yang stabil. */}
            <div key={current.id} className="animate-fade-up-in">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
                <span className="w-6 sm:w-8 h-[2px] bg-[var(--accent-gold)]" />
                <span className="text-[10px] sm:text-xs font-[var(--font-heading)] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.15em] text-[var(--accent-gold)]">
                  {content.label || 'DIDIRIKAN 2021'}
                </span>
                <span className="w-1 h-1 rounded-full bg-[var(--accent-gold)] hidden sm:inline-block" />
                <span className="text-[10px] sm:text-xs font-[var(--font-heading)] font-medium uppercase tracking-[0.08em] sm:tracking-[0.1em] text-[var(--text-muted)] hidden sm:inline">
                  {'BEKASI, JAWA BARAT'}
                </span>
              </div>

              {/* Arabic Quote — konten tetap, tidak dikelola CMS */}
              <div className="arabic-quote text-lg sm:text-xl md:text-2xl text-[var(--accent-gold)] mb-2 sm:mb-3 opacity-60">
                «اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ»
              </div>
              <p className="text-xs sm:text-sm italic text-[var(--text-muted)] mb-4 sm:mb-6">
                {'"Bacalah dengan nama Tuhanmu yang menciptakan" — Al-Alaq 96:1'}
              </p>

              <h1 className="font-[var(--font-display)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-[var(--text)] leading-[1.05] sm:leading-[0.92] mb-4 sm:mb-6 tracking-[-0.04em]">
                {renderTitle(content.title || 'Ar-Rahman')}
              </h1>

              {content.subtitle && (
                <p className="text-sm sm:text-base md:text-lg text-[var(--text-secondary)] max-w-xl mb-6 sm:mb-8 leading-relaxed">
                  {content.subtitle}
                </p>
              )}

              <div className="flex flex-wrap gap-3 sm:gap-4 mb-8 sm:mb-10">
                {content.button_label && (
                  <MagneticButton strength={0.3}>
                    <Link
                      href={content.button_href || '#'}
                      className="btn-primary gap-2 shadow-md hover:shadow-lg text-xs sm:text-sm px-5 sm:px-8 py-2.5 sm:py-3.5"
                    >
                      {content.button_label}
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Link>
                  </MagneticButton>
                )}
                <MagneticButton strength={0.3}>
                  <Link
                    href="/about"
                    className="btn-ghost text-xs sm:text-sm px-5 sm:px-8 py-2.5 sm:py-3.5"
                  >
                    {'Tentang Kami'}
                  </Link>
                </MagneticButton>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div ref={rightRef} className="lg:col-span-5 hidden lg:block">
            <div className="relative pl-8">
              {/* Floating image stack */}
              <div key={current.id} className="relative animate-fade-up-in">
                {/* Main image */}
                <div className="rounded-2xl overflow-hidden shadow-xl border border-white/60"
                  style={{ transform: 'perspective(1000px) rotateY(-4deg) rotateX(2deg)' }}
                >
                  <Image
                    src={current.image || FALLBACK_IMAGE}
                    alt={(content.title || 'Hero Ar-Rahman').replace(/\n/g, ' ')}
                    width={500}
                    height={375}
                    className="w-full aspect-[4/3] object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                {/* Badge - Top right */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl px-4 py-3 shadow-lg border border-[var(--color-border)] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
                    <Award className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-[var(--font-heading)] text-[var(--accent)]">
                      {'Sekolah Islam Terbaik'}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">2024 • {'Penghargaan Nasional'}</div>
                  </div>
                </div>

                {/* Card - Bottom right */}
                <div className="absolute -bottom-5 -right-4 bg-white rounded-xl px-4 py-3 shadow-lg border border-[var(--color-border)] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {'Pendaftaran'}
                    </div>
                    <div className="font-[var(--font-heading)] text-sm font-bold text-[var(--accent-gold)]">
                      {ppdb.academicYear ?? 'Segera'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative dots pattern */}
              <div className="absolute -bottom-8 -right-8 grid grid-cols-6 gap-2 opacity-10 pointer-events-none">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Kontrol geser — hanya muncul kalau slide lebih dari satu */}
        {count > 1 && (
          <div className="mt-8 sm:mt-12 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              aria-label="Slide sebelumnya"
              className="w-10 h-10 rounded-full border border-[var(--color-border)] bg-white/70 backdrop-blur flex items-center justify-center text-[var(--text-secondary)] shadow-sm hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              {items.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Ke slide ${i + 1}`}
                  aria-current={i === active}
                  className={`h-2 rounded-full transition-all ${
                    i === active
                      ? 'w-6 bg-[var(--accent)]'
                      : 'w-2 bg-[var(--color-border)] hover:bg-[var(--text-muted)]'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(active + 1)}
              aria-label="Slide berikutnya"
              className="w-10 h-10 rounded-full border border-[var(--color-border)] bg-white/70 backdrop-blur flex items-center justify-center text-[var(--text-secondary)] shadow-sm hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Scroll indicator */}
        <div ref={hintRef} className="flex flex-col items-center mt-10 sm:mt-16 animate-bounce">
          <span className="text-[10px] sm:text-xs font-[var(--font-heading)] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[var(--text-muted)] mb-1 sm:mb-2">
            {'Scroll untuk Eksplorasi'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--text-muted)]" />
        </div>
      </div>
    </section>
  )
}
