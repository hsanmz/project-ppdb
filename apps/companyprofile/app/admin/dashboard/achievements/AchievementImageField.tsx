'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  AlertCircle,
  Award,
  FileCheck,
  Link2,
  Loader2,
  Maximize2,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { cn } from '@/app/lib/utils'
import * as api from '@/app/lib/api'
import { errorMessage } from '../_types'
import {
  ACHIEVEMENT_IMAGE_ACCEPT,
  ACHIEVEMENT_IMAGE_MAX_BYTES,
  ACHIEVEMENT_IMAGE_URL_MAX_LENGTH,
  formatFileSize,
  resolveAchievementImageSrc,
  validateAchievementImageFile,
  validateAchievementImageUrl,
} from './achievement-form'

interface Props {
  id: string
  value: string
  onChange: (url: string) => void
  onUploadingChange?: (uploading: boolean) => void
  onInspectImage?: (url: string) => void
  error?: string
}

const MAX_SIZE_LABEL = formatFileSize(ACHIEVEMENT_IMAGE_MAX_BYTES)

/**
 * Komponen Pengunggah & Pratinjau Sertifikat / Dokumentasi Prestasi.
 *
 * Mengutamakan pengalaman Sertifikat (Certificate-First UX):
 * - Menampung orientasi Portrait (sertifikat A4 tegak) maupun Landscape (foto piala/penyerahan).
 * - Menggunakan `object-contain` di atas latar kanvas netral gelap agar sertifikat tidak terpotong (no crop distortion).
 * - Mendukung drag-and-drop, pergantian berkas aman (preserve image on error), dan inspeksi pratinjau penuh.
 */
export function AchievementImageField({
  id,
  value,
  onChange,
  onUploadingChange,
  onInspectImage,
  error,
}: Props) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const [blobUrl, setBlobUrl] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const urlError = mode === 'url' ? validateAchievementImageUrl(value) : null
  const shownError = error || fileError || urlError || ''

  // Cleanup object URL saat unmount atau diganti
  useEffect(() => {
    if (!blobUrl) return
    return () => URL.revokeObjectURL(blobUrl)
  }, [blobUrl])

  function setUploadingState(next: boolean) {
    setUploading(next)
    onUploadingChange?.(next)
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return
    const validation = validateAchievementImageFile(file)
    if (validation) {
      setFileError(validation)
      return
    }
    setFileError('')

    const preview = URL.createObjectURL(file)
    setBlobUrl(preview)
    setUploadingState(true)

    try {
      const uploadedUrl = await api.uploadImage(file)
      onChange(uploadedUrl)
    } catch (e) {
      setBlobUrl('')
      const message = errorMessage(e, '')
      setFileError(
        message.includes('401') || message.toLowerCase().includes('unauthorized')
          ? 'Sesi login telah berakhir. Silakan muat ulang halaman.'
          : `Gagal mengunggah gambar${message ? ` (${message})` : ''}. Coba lagi.`,
      )
    } finally {
      setUploadingState(false)
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    void handleFile(file)
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    void handleFile(event.dataTransfer.files?.[0])
  }

  function removeImage() {
    setBlobUrl('')
    setFileError('')
    onChange('')
    inputRef.current?.focus()
  }

  function switchMode(next: 'upload' | 'url') {
    setMode(next)
    setFileError('')
    if (next === 'url') setBlobUrl('')
  }

  const previewSrc =
    blobUrl ||
    (validateAchievementImageUrl(value) === null
      ? resolveAchievementImageSrc(value, api.API_BASE)
      : '')

  return (
    <div className="flex h-full flex-col space-y-3">
      {/* Header Baris Kontrol */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Award className="h-4 w-4 text-[var(--accent-gold)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Dokumentasi / Sertifikat
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">(opsional)</span>
        </div>

        {/* Tab switcher: Upload vs URL */}
        <div className="inline-flex items-center rounded-lg bg-black/5 p-0.5">
          <button
            type="button"
            onClick={() => switchMode('upload')}
            className={cn(
              'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
              mode === 'upload'
                ? 'bg-white text-[var(--text)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]',
            )}
          >
            <Upload className="h-3 w-3" />
            Unggah Berkas
          </button>
          <button
            type="button"
            onClick={() => switchMode('url')}
            className={cn(
              'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
              mode === 'url'
                ? 'bg-white text-[var(--text)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]',
            )}
          >
            <Link2 className="h-3 w-3" />
            Tautan URL
          </button>
        </div>
      </div>

      {/* Input File Tersembunyi */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACHIEVEMENT_IMAGE_ACCEPT}
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Area Mode URL */}
      {mode === 'url' ? (
        <div className="space-y-2">
          <div className="relative">
            <Link2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="url"
              value={value}
              maxLength={ACHIEVEMENT_IMAGE_URL_MAX_LENGTH}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://... atau /uploads/..."
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white pr-14 pl-9 text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">
              {value.length}/{ACHIEVEMENT_IMAGE_URL_MAX_LENGTH}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Tempelkan URL langsung ke sertifikat atau gambar bukti prestasi.
          </p>
        </div>
      ) : null}

      {/* Kontainer Utama Pratinjau / Dropzone Sertifikat */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex min-h-[320px] flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border transition-all duration-200',
          previewSrc
            ? 'border-slate-800/80 bg-gradient-to-b from-slate-950 to-slate-900 shadow-inner'
            : dragging
              ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-2 ring-[var(--accent)]/30'
              : 'border-dashed border-[var(--border)] bg-white/70 hover:border-[var(--accent)]/60 hover:bg-white',
          shownError && 'border-destructive/60 bg-red-50/20',
        )}
      >
        {previewSrc ? (
          /* TAMPILAN PRATINJAU SERTIFIKAT (Certificate-First) */
          <div className="group relative flex h-full w-full flex-col items-center justify-center p-3">
            {/* Pola background netral document viewer */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

            {/* Gambar Sertifikat Asli (Fit contain, preserving portrait/landscape proportions) */}
            <div className="relative flex max-h-[380px] w-full flex-1 items-center justify-center overflow-hidden py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt="Sertifikat Prestasi"
                className="max-h-[360px] w-auto max-w-full rounded-md object-contain shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />

              {/* Loading Overlay saat mengunggah */}
              {uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/75 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-gold)]" />
                  <p className="mt-2 text-xs font-semibold text-white">Mengunggah Sertifikat…</p>
                  <p className="text-[10px] text-white/75">Mengompresi & menyimpan ke server aman</p>
                </div>
              )}
            </div>

            {/* Bilah Aksi di Bagian Bawah Pratinjau */}
            <div className="relative z-10 mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-slate-900/90 px-3 py-2 text-xs text-slate-200 backdrop-blur-md border border-slate-700/60 shadow-lg">
              <div className="flex min-w-0 items-center gap-1.5">
                <FileCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="truncate text-[11px] font-medium text-slate-300" title={value || 'Berkas Terpasang'}>
                  {value ? value.split('/').pop() || 'Sertifikat' : 'Berkas Siap'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onInspectImage && (
                  <button
                    type="button"
                    onClick={() => onInspectImage(previewSrc)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                    title="Lihat ukuran penuh"
                  >
                    <Maximize2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Perbesar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
                  title="Ganti dengan berkas lain"
                >
                  <RefreshCw className={cn('h-3 w-3', uploading && 'animate-spin')} />
                  <span>Ganti</span>
                </button>

                <button
                  type="button"
                  onClick={removeImage}
                  disabled={uploading}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-950/60 px-2 py-1 text-[11px] font-medium text-red-300 hover:bg-red-900/80 hover:text-red-100 transition-colors disabled:opacity-50"
                  title="Hapus gambar"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* TAMPILAN KOSONG / DROPZONE UPLOAD */
          <div
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center p-6 text-center outline-none"
          >
            <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-subtle)] via-white to-[var(--accent-gold)]/20 shadow-sm border border-[var(--border)] group-hover:scale-105 transition-transform">
              <Award className="h-8 w-8 text-[var(--accent)]" />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-gold)] text-white shadow-sm">
                <Upload className="h-3.5 w-3.5" />
              </div>
            </div>

            <h4 className="text-sm font-bold text-[var(--text)]">
              Tarik & Lepas Sertifikat di Sini
            </h4>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              atau <span className="font-semibold text-[var(--accent)] underline underline-offset-2">pilih berkas</span> dari komputer
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-0.5 font-medium">
                JPG, PNG, WEBP, GIF
              </span>
              <span>•</span>
              <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-0.5 font-medium">
                Maks. {MAX_SIZE_LABEL}
              </span>
              <span>•</span>
              <span className="rounded-md bg-amber-500/10 text-amber-800 px-2 py-0.5 font-medium border border-amber-500/20">
                Tegak (Portrait) & Mendatar (Landscape)
              </span>
            </div>

            <p className="mt-3 text-[11px] text-[var(--text-muted)] max-w-xs leading-normal">
              Gambar akan ditampilkan utuh tanpa pemotongan agar nomor piagam dan tanda tangan sertifikat tetap terbaca jelas.
            </p>
          </div>
        )}
      </div>

      {/* Umpan Balik Error */}
      {shownError ? (
        <div className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{shownError}</span>
        </div>
      ) : null}
    </div>
  )
}
