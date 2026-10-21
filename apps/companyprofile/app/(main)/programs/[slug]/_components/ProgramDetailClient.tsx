'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { Program } from '@/app/lib/types'
import type { ProgramMenuLink } from '@/app/lib/programs'
import { Clock, Layers, Check, BookOpen, Cpu, Globe, Award, ArrowRight } from 'lucide-react'

const iconMap: Record<string, typeof BookOpen> = {
  'book-quran': BookOpen,
  'laptop-code': Cpu,
  'language': Globe,
  'users': Award,
}

interface Props {
  program: Program
  /** Program lain dari CMS, dipakai sidebar "Program Lainnya". */
  others?: ProgramMenuLink[]
}

export default function ProgramDetailClient({ program, others = [] }: Props) {
  const sectionRef = useRef<HTMLElement>(null)

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.1 })

  useEffect(() => {
    if (program.content) {
      document.title = `${program.content.title || ''} | PTDARRAHMAN`
    }
  }, [program])

  const info = program.content ?? {}
  const Icon = iconMap[program.icon] || BookOpen
  const highlights = info.highlights ?? []
  const curriculum = info.curriculum ?? []
  const outcomes = info.outcomes ?? []

  // Durasi & Tingkat hanya ditampilkan sekali, di hero. Sebelumnya keduanya
  // tampil dua kali (chip di kolom isi + baris di sidebar).
  const meta = [
    info.duration ? { key: 'durasi', icon: Clock, label: 'Durasi', value: info.duration } : null,
    info.level ? { key: 'tingkat', icon: Layers, label: 'Tingkat', value: info.level } : null,
  ].filter((m): m is NonNullable<typeof m> => m !== null)

  return (
    <>
      <section className="relative pt-24 pb-14 md:pt-32 md:pb-20 overflow-hidden">
        {program.image ? (
          <>
            <Image
              src={program.image}
              alt={info.title || ''}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/85 to-white/95" />
          </>
        ) : (
          // Tanpa gambar (kondisi data CMS saat ini) hero tidak boleh jadi pita
          // pucat: pakai gradien bertoken seperti PageHeader halaman lain.
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg) 50%, var(--bg-secondary) 100%)',
            }}
          />
        )}
        {/* Garis aksen tipis di tepi atas hero. */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--accent), var(--accent-gold), var(--accent), transparent)',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl">
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[var(--text-muted)]">
              <Link href="/" className="transition-colors hover:text-[var(--accent)]">
                Beranda
              </Link>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <Link href="/programs" className="transition-colors hover:text-[var(--accent)]">
                Program
              </Link>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span className="text-[var(--text-secondary)]">{info.title}</span>
            </nav>

            <div className="flex items-start gap-4 sm:gap-5">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] sm:h-14 sm:w-14">
                <Icon className="h-6 w-6 text-[var(--accent)] sm:h-7 sm:w-7" />
              </span>
              <div className="min-w-0">
                <h1 className="font-[var(--font-display)] text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text)] break-words sm:text-4xl md:text-5xl lg:text-6xl">
                  {info.title}
                </h1>
                {info.tagline && (
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
                    {info.tagline}
                  </p>
                )}
              </div>
            </div>

            {meta.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {meta.map((m) => (
                  <div
                    key={m.key}
                    className="inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2"
                  >
                    <m.icon className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
                    <span className="text-xs text-[var(--text-muted)]">{m.label}</span>
                    <span className="font-[var(--font-heading)] text-sm font-semibold">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section ref={sectionRef} className="py-14 sm:py-16 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-3 gap-10 lg:gap-12">
            {/* Isi program */}
            <div className="lg:col-span-2 space-y-12">
              {info.desc && (
                <div>
                  <h2 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl">
                    Gambaran Program
                  </h2>
                  {/* max-w-prose menjaga panjang baris tetap nyaman dibaca. */}
                  <p className="mt-4 max-w-prose text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
                    {info.desc}
                  </p>
                </div>
              )}

              {highlights.length > 0 && (
                <div>
                  <h2 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl">
                    Keunggulan Program
                  </h2>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {highlights.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
                      >
                        <Check className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
                        <span className="min-w-0 text-sm">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {curriculum.length > 0 && (
                <div>
                  <h2 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl">Kurikulum</h2>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {curriculum.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
                      >
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-xs font-bold text-[var(--accent)]">
                          {i + 1}
                        </span>
                        <span className="min-w-0 text-sm">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {outcomes.length > 0 && (
                <div>
                  <h2 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl">
                    Hasil Pembelajaran
                  </h2>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {outcomes.map((o, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
                      >
                        <Award className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
                        <span className="min-w-0 text-sm">{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar: aksi pendaftaran + program lain */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-5">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)]">
                      <Icon className="h-5 w-5 text-[var(--accent)]" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs text-[var(--text-muted)]">Program</div>
                      <div className="font-[var(--font-heading)] font-bold leading-tight">
                        {info.title}
                      </div>
                    </div>
                  </div>

                  <div className="my-5 h-px bg-[var(--border)]" />

                  <div className="space-y-3">
                    <Link
                      href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:5174'}
                      className="btn-primary w-full justify-center"
                    >
                      Daftar Sekarang
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/contact" className="btn-ghost w-full justify-center">
                      Ajukan Pertanyaan
                    </Link>
                  </div>
                </div>

                {others.length > 0 && (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
                    <h2 className="font-[var(--font-heading)] text-sm font-bold">Program Lainnya</h2>
                    <ul className="mt-4 space-y-1">
                      {others.map((o) => (
                        <li key={o.href}>
                          <Link
                            href={o.href}
                            className="group -mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
                          >
                            <span className="min-w-0 truncate">{o.label}</span>
                            <ArrowRight className="h-4 w-4 flex-shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/programs"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                    >
                      Lihat semua program
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
