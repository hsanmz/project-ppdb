import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProgramsCached } from '@/app/lib/api'
import { fallbackProgram, fallbackPrograms, KNOWN_PROGRAMS, siblingProgramLinks } from '@/app/lib/programs'
import type { Program } from '@/app/lib/types'
import ProgramDetailClient from './_components/ProgramDetailClient'

async function loadPrograms(): Promise<Program[]> {
  try {
    return (await getProgramsCached()) ?? []
  } catch {
    return []
  }
}

function findProgram(slug: string, list: Program[]): Program | null {
  const direct = list.find((p) => p.slug === slug)
  if (direct) return direct
  const known = KNOWN_PROGRAMS.find((k) => k.fallbackSlug === slug)
  if (known) {
    const match = list.find((prog) => {
      const title = prog.content?.title?.toLowerCase() ?? ''
      const s = prog.slug.toLowerCase()
      return known.keywords.some((k) => title.includes(k) || s.includes(k))
    })
    if (match) return match
    return fallbackProgram(slug)
  }
  return null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const program = findProgram(slug, await loadPrograms())
  if (!program) {
    return { title: 'Program Tidak Ditemukan' }
  }
  return {
    title: program.content?.title,
    description: program.content?.desc,
    openGraph: {
      title: `${program.content?.title} | PTDARRAHMAN`,
      description: program.content?.desc,
      ...(program.image
        ? { images: [{ url: program.image, width: 1200, height: 630, alt: program.content?.title }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${program.content?.title} | PTDARRAHMAN`,
      description: program.content?.desc,
      ...(program.image ? { images: [program.image] } : {}),
    },
  }
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const list = await loadPrograms()
  const program = findProgram(slug, list)
  if (!program) notFound()
  // Sidebar "Program Lainnya": pakai isi CMS; saat CMS kosong/gagal gunakan
  // daftar cadangan supaya halaman yang jatuh ke konten bawaan tetap punya
  // navigasi ke program lain.
  const others = siblingProgramLinks(list.length > 0 ? list : fallbackPrograms(), program.slug)
  return <ProgramDetailClient program={program} others={others} />
}
