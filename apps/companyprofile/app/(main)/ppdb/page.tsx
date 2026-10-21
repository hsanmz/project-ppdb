'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  GraduationCap,
  BookOpen,
  Globe,
  Sparkles,
  ArrowRight,
  Phone,
  Rocket,
  ShieldCheck,
  Target,
  Award,
  CheckCircle2,
  Laptop,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { useActivePpdbWave } from '@/app/hooks/usePpdbWave'
import { usePpdbContent } from '@/app/hooks/usePpdbContent'
import { buildSchedule } from '@/app/lib/ppdb'
import {
  pickAccent,
  resolveIconName,
  type AccentKey,
  type PpdbIconName,
} from '@/app/lib/ppdbContent'
import ShapeDividerDiagonal from '@/app/components/ui/ShapeDividerDiagonal'

// Icon dinamis dari CMS (nama lucide di kolom `icon`). Data yang tipenya salah
// jatuh ke Sparkles lewat `resolveIconName`.
const ICON_MAP: Record<PpdbIconName, LucideIcon> = {
  Award,
  GraduationCap,
  BookOpen,
  Laptop,
  Users,
  ShieldCheck,
  Sparkles,
  Target,
  Rocket,
  Globe,
}

// Palet aksen kartu jalur. Dipakai lewat `pickAccent` (nama tak dikenal →
// emerald) supaya warna tidak pernah jadi class Tailwind dinamis.
// Sengaja tanpa varian `dark:` — situs ini tema terang (tidak ada override
// variabel di prefers-color-scheme), jadi `dark:` hanya membuat teks pucat
// bagi pengunjung yang OS-nya mode gelap.
const ACCENT_STYLES: Record<
  AccentKey,
  { chip: string; kicker: string; check: string; link: string }
> = {
  emerald: {
    chip: 'bg-emerald-600/10 text-emerald-700',
    kicker: 'text-emerald-700',
    check: 'text-emerald-600',
    link: 'text-emerald-800 hover:text-emerald-900',
  },
  amber: {
    chip: 'bg-amber-500/10 text-amber-600',
    kicker: 'text-amber-600',
    check: 'text-amber-500',
    link: 'text-amber-700 hover:text-amber-800',
  },
  sky: {
    chip: 'bg-sky-500/10 text-sky-600',
    kicker: 'text-sky-600',
    check: 'text-sky-500',
    link: 'text-sky-700 hover:text-sky-800',
  },
  violet: {
    chip: 'bg-violet-500/10 text-violet-600',
    kicker: 'text-violet-600',
    check: 'text-violet-500',
    link: 'text-violet-700 hover:text-violet-800',
  },
  rose: {
    chip: 'bg-rose-500/10 text-rose-600',
    kicker: 'text-rose-600',
    check: 'text-rose-500',
    link: 'text-rose-700 hover:text-rose-800',
  },
  teal: {
    chip: 'bg-teal-500/10 text-teal-600',
    kicker: 'text-teal-600',
    check: 'text-teal-500',
    link: 'text-teal-700 hover:text-teal-800',
  },
}

// Load Three.js 3D Hero dynamically with SSR disabled to prevent hydration/canvas errors
const PPDBHero = dynamic(
  () => import('@/components/ui/orbit-delivery-hero'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[85vh] flex flex-col items-center justify-center bg-radial-gradient from-white to-[#f0f6ff] text-emerald-900">
        <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium text-sm tracking-widest uppercase text-emerald-800/80 animate-pulse">
          Menyiapkan Dunia 3D Ar-Rahman…
        </p>
      </div>
    ),
  }
)

export default function PPDBPage() {
  const wave = useActivePpdbWave()
  const ppdb = buildSchedule(wave)
  const content = usePpdbContent()

  return (
    <div className="w-full min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* 3D Interactive Planet & Courier Hero */}
      <section className="relative w-full">
        {/* Karakter wisudawan ugya graduate.glb: biarkan tekstur asli (toga hitam
            trim emas) — jangan tint, warna default kurir akan menimpa toga */}
        <PPDBHero
          theme="auto"
          academicYear={ppdb.academicYear}
          copy={content.copy}
          shirtColor={null}
          pantsColor={null}
          showBag={false}
          showStrap={false}
          showCap={true}
        />
      </section>

      {/* Tear-off tipis memisahkan hero 3D dari section info. Sengaja tanpa
          `overflow-hidden` supaya elemen 0-tinggi ini tidak memotong gelombang. */}
      <div className="relative" aria-hidden>
        <ShapeDividerDiagonal fill="var(--bg-secondary)" />
      </div>

      {/* Info Section: Jalur, Kurikulum, Alur & CTA — seluruh isinya berasal
          dari CMS (`/companyprofile/ppdb-*`) dengan fallback default identik. */}
      <section
        id="info-section"
        className="pt-28 md:pt-32 pb-20 md:pb-28 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto"
      >
        {/* Heading Jalur */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4A853]" aria-hidden />
            {ppdb.academicYear ? `PPDB ${ppdb.academicYear}` : 'PPDB'}
          </span>
          <h2 className="mt-4 font-heading! text-3xl md:text-5xl font-bold tracking-tight text-emerald-950">
            {content.copy.jalur_title}
          </h2>
          <p className="mt-4 text-[var(--text-secondary)] text-base md:text-lg leading-relaxed">
            {content.copy.jalur_desc}
          </p>
        </div>

        {/* Kartu Jalur Pendaftaran */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {content.jalur.map((card) => {
            const Icon = ICON_MAP[resolveIconName(card.icon)]
            const accent = ACCENT_STYLES[pickAccent(card.content?.accent)]
            return (
              <article
                key={card.id}
                className="group flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--bg-elevated)] p-7 md:p-9 transition-colors duration-300 hover:border-emerald-700/30"
              >
                <div className="mb-6 flex items-center gap-3.5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.chip}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {card.content?.kicker && (
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${accent.kicker}`}
                    >
                      {card.content.kicker}
                    </span>
                  )}
                </div>

                <h3 className="font-heading! text-xl md:text-2xl font-bold text-[var(--text)]">
                  {card.content?.title}
                </h3>
                <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-[var(--text-secondary)]">
                  {card.content?.desc}
                </p>

                {(card.content?.items?.length ?? 0) > 0 && (
                  <ul className="mt-6 space-y-3">
                    {card.content?.items?.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm text-[var(--text-secondary)]"
                      >
                        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${accent.check}`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto pt-7">
                  <Link
                    href={card.content?.cta_href || '/contact'}
                    className={`inline-flex items-center gap-2 text-sm font-semibold ${accent.link}`}
                  >
                    {card.content?.cta_label || 'Daftar'}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>

        {/* Pilar Kurikulum */}
        <div className="mt-20 md:mt-28">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="font-heading! text-2xl md:text-3xl font-bold tracking-tight text-[var(--text)]">
              {content.copy.kurikulum_title}
            </h3>
            <p className="mt-3 text-sm md:text-base text-[var(--text-secondary)]">
              {content.copy.kurikulum_desc}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {content.pillars.map((pillar) => {
              const Icon = ICON_MAP[resolveIconName(pillar.icon)]
              return (
                <div
                  key={pillar.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--bg-secondary)] p-6 transition-colors duration-300 hover:border-emerald-700/30"
                >
                  <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h4 className="text-base font-bold text-[var(--text)]">
                    {pillar.content?.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {pillar.content?.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Alur Pendaftaran */}
        <div className="mt-20 md:mt-28">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
              {content.copy.alur_kicker}
            </span>
            <h3 className="mt-3 font-heading! text-2xl md:text-3xl font-bold tracking-tight text-[var(--text)]">
              {content.copy.alur_title}
            </h3>
          </div>

          <ol className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {content.steps.map((step, idx) => (
              <li key={step.id}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold tracking-[0.2em] text-emerald-700">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="h-px flex-1 bg-[var(--color-border)]" aria-hidden />
                </div>
                <h4 className="mt-4 text-base font-bold text-[var(--text)]">
                  {step.content?.title}
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {step.content?.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* Banner CTA */}
        <div className="mt-20 md:mt-28 rounded-2xl border border-emerald-400/15 bg-emerald-950 px-7 py-10 text-white md:px-12 md:py-12">
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            <div className="max-w-xl text-center md:text-left">
              <h3 className="font-heading! text-2xl md:text-3xl font-bold tracking-tight">
                {content.copy.cta_title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-emerald-100/75 md:text-base">
                {content.copy.cta_desc}
              </p>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row md:w-auto">
              <Link
                href={content.copy.cta_primary_href || '/contact'}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-50"
              >
                <Phone className="h-4 w-4 text-emerald-700" />
                {content.copy.cta_primary_label}
              </Link>
              <Link
                href={content.copy.cta_secondary_href || '/programs'}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                {content.copy.cta_secondary_label}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
