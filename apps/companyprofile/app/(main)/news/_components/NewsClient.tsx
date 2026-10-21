'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { NewsArticle } from '@/app/lib/types'
import { ArrowRight, Calendar, SearchX } from 'lucide-react'
import EmptyState from '@/app/components/ui/EmptyState'
import ShapeDivider from '@/app/components/ui/ShapeDivider'

export default function NewsClient({ news }: { news: NewsArticle[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    document.title = 'Berita & Acara | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.08 })

  // Urutkan dari yang terbaru. `date` boleh kosong (tidak wajib di backend),
  // jadi tanggal tidak valid diperlakukan sebagai 0 agar tidak menghasilkan NaN
  // yang membuat urutan acak.
  const sortTime = (dateStr: string) => {
    const t = new Date(dateStr).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  const sorted = [...news].sort((a, b) => sortTime(b.date) - sortTime(a.date))

  const filtered = searchQuery
    ? sorted.filter((a) => {
        const info = a.content || {}
        const q = searchQuery.toLowerCase()
        return (
          (info.title || '').toLowerCase().includes(q) ||
          (info.excerpt || '').toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q)
        )
      })
    : sorted

  // Mengembalikan '' untuk tanggal kosong/tidak valid supaya UI tidak
  // menampilkan teks "Invalid Date".
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  return (
    <>
          <PageHeader
        title="Berita & Acara"
        subtitle="Ikuti berita terbaru, prestasi, dan acara di Ar-Rahman"
        badge="BERITA TERBARU"
      />

      <section ref={sectionRef} className="relative overflow-hidden pt-40 sm:pt-44 pb-16 sm:pb-20 bg-[var(--bg)]">
        {/* Wave meneruskan gradien PageHeader (yang berakhir di ivory-dark) ke
            section berita yang berlatar ivory. */}
        <ShapeDivider fill="var(--bg-secondary)" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
           {/* Search Bar */}
           <div className="max-w-md mb-10">
             <input
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari artikel..."
                className="input-field"
                aria-label="Cari artikel"
             />
           </div>

          {/* Article Grid — semua artikel tampil sebagai kartu seragam & kompak,
              tanpa blok "featured" besar yang dulu memakan separuh layar. */}
          {filtered.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((article) => {
              const info = article.content ?? {}
              const dateText = formatDate(article.date)
              return (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="group glass-card rounded-2xl overflow-hidden !no-underline flex flex-col"
                >
                  <div className="aspect-[16/10] overflow-hidden relative">
                    {article.image ? (
                      <Image src={article.image} alt={info?.title || 'Gambar berita'} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-[var(--bg-secondary)]" />
                    )}
                    {article.category && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-[var(--accent)] text-white shadow-sm">
                        {article.category}
                      </span>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    {dateText && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
                        <Calendar className="w-3 h-3" />
                        {dateText}
                      </div>
                    )}
                    <h3 className="font-[var(--font-heading)] text-base font-bold text-[var(--text)] mb-2 leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                      {info.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-4">
                      {info.excerpt}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] group-hover:gap-2 transition-all">
                      Baca Selengkapnya
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
          )}

          {/* Empty state: hanya saat benar-benar tidak ada artikel (atau hasil
              pencarian kosong). */}
          {filtered.length === 0 && (
            <EmptyState
              icon={SearchX}
              title={searchQuery ? 'Artikel Tidak Ditemukan' : 'Belum Ada Berita'}
              description={searchQuery
                ? 'Tidak ada artikel yang cocok dengan pencarian Anda. Coba gunakan kata kunci lain.'
                : 'Berita yang dipublikasikan akan tampil di sini.'}
              action={searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent)]/90 shadow-md transition-all"
                >
                  <SearchX className="w-4 h-4" />
                  Reset Pencarian
                </button>
              ) : undefined}
            />
          )}
        </div>
      </section>
    </>
  )
}
