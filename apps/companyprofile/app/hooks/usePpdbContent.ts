'use client'

import { useEffect, useState } from 'react'

import {
  DEFAULT_PPDB_CONTENT,
  fetchPpdbContent,
  type PpdbContent,
} from '@/app/lib/ppdbContent'

/**
 * Konten landing PPDB (jalur, pilar, alur, teks & CTA) untuk halaman `/ppdb`.
 *
 * Mulai dari konten default yang identik dengan seed migrasi, lalu diganti
 * hasil API begitu termuat — tidak ada kedipan kosong dan halaman tetap utuh
 * bila API sedang tidak terjangkau.
 */
export function usePpdbContent(): PpdbContent {
  const [content, setContent] = useState<PpdbContent>(DEFAULT_PPDB_CONTENT)

  useEffect(() => {
    let alive = true
    fetchPpdbContent().then((data) => {
      if (alive) setContent(data)
    })
    return () => {
      alive = false
    }
  }, [])

  return content
}
