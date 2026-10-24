'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { AlertCircle, Image as ImageIcon, Link2, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import * as api from '@/app/lib/api'
import { errorMessage } from '../_types'
import {
  FACILITY_IMAGE_ACCEPT,
  FACILITY_IMAGE_MAX_BYTES,
  FACILITY_IMAGE_URL_MAX_LENGTH,
  formatFileSize,
  resolveFacilityImageSrc,
  validateFacilityImageFile,
  validateFacilityImageUrl,
} from './facility-form'

interface Props {
  /** Elemen yang difokuskan saat validasi gagal. */
  id: string
  value: string
  onChange: (url: string) => void
  /** Diberitahu ke dialog supaya tombol Simpan tidak ditekan saat upload berjalan. */
  onUploadingChange?: (uploading: boolean) => void
  error?: string
}

const MAX_SIZE_LABEL = formatFileSize(FACILITY_IMAGE_MAX_BYTES)

/**
 * Pengunggah gambar utama fasilitas — satu area media ringkas.
 *
 * Area yang sama dipakai untuk dropzone, pratinjau, dan aksi ganti/hapus supaya
 * tidak ada blok pratinjau terpisah yang memakan tinggi modal. Pratinjau memakai
 * `<img>` biasa (bukan `next/image`) karena URL gambar berasal dari input bebas
 * admin dan `next/image` melempar error untuk host yang belum terdaftar.
 */
export function FacilityImageField({ id, value, onChange, onUploadingChange, error }: Props) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const [blobUrl, setBlobUrl] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const urlError = mode === 'url' ? validateFacilityImageUrl(value) : null
  const shownError = error || fileError || urlError || ''

  // Object URL harus dilepas saat diganti/unmount supaya blob tidak bocor.
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
    const validation = validateFacilityImageFile(file)
    if (validation) {
      setFileError(validation)
      return
    }
    setFileError('')
    const preview = URL.createObjectURL(file)
    setBlobUrl(preview)
    setUploadingState(true)
    try {
      const url = await api.uploadImage(file)
      onChange(url)
    } catch (e) {
      setBlobUrl('')
      const message = errorMessage(e, '')
      setFileError(
        message.includes('401') || message.toLowerCase().includes('unauthorized')
          ? 'Sesi berakhir. Muat ulang halaman lalu login kembali.'
          : `Upload gagal${message ? ` (${message})` : ''}. Coba lagi.`,
      )
    } finally {
      setUploadingState(false)
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset supaya file yang sama bisa dipilih ulang setelah gagal.
    event.target.value = ''
    void handleFile(file)
  }

  function handleDragEnter(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
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
    // Saat pindah ke mode URL, pratinjau harus mengikuti URL, bukan blob lama.
    if (next === 'url') setBlobUrl('')
  }

  const previewSrc =
    blobUrl ||
    (validateFacilityImageUrl(value) === null
      ? resolveFacilityImageSrc(value, api.API_BASE)
      : '')
  const describedBy = [shownError ? errorId : null, helpId].filter(Boolean).join(' ')

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-0.5 rounded-lg bg-[var(--bg-secondary)] p-0.5">
          {(['upload', 'url'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
                mode === m
                  ? 'bg-white text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]',
              )}
            >
              {m === 'upload' ? <Upload className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
              {m === 'upload' ? 'Unggah' : 'URL'}
            </button>
          ))}
        </div>
        {mode === 'url' && (
          <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-muted)]">
            {value.trim().length}/{FACILITY_IMAGE_URL_MAX_LENGTH}
          </span>
        )}
      </div>

      {mode === 'upload' ? (
        <div
          className={cn(
            'relative h-40 overflow-hidden rounded-xl border border-dashed transition-colors',
            dragging
              ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
              : 'border-[var(--border)] bg-white/60',
            shownError && 'border-destructive/60',
          )}
        >
          {previewSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL gambar bebas dari admin; lihat komentar komponen. */}
              <img
                src={previewSrc}
                alt="Pratinjau gambar fasilitas"
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
              {!uploading && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2.5 pt-6 pb-1.5">
                  <span className="min-w-0 flex-1 truncate text-[10px] text-white/85" title={value || undefined}>
                    {value || 'Pratinjau file lokal'}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      id={id}
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-white/90 transition-colors hover:bg-white/15 hover:text-white"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-red-200 transition-colors hover:bg-red-500/20 hover:text-red-100"
                    >
                      <Trash2 className="h-3 w-3" />
                      Hapus
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              id={id}
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              aria-describedby={describedBy}
              className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-center focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25 focus-visible:outline-none"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]" aria-hidden="true">
                <Upload className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-[var(--text)]">
                {dragging ? 'Lepas gambar di sini' : 'Tarik gambar atau klik untuk memilih'}
              </span>
            </button>
          )}

          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45 text-white backdrop-blur-[1px]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[11px] font-semibold">Mengunggah…</span>
            </div>
          )}

          {!previewSrc && !uploading && (
            <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] text-[var(--text-muted)]">
              Belum ada gambar
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id={id}
              type="url"
              value={value}
              maxLength={FACILITY_IMAGE_URL_MAX_LENGTH + 50}
              onChange={(event) => {
                setFileError('')
                // Nilai tetap dikirim ke form walau belum valid supaya ketikan
                // admin tidak hilang; validasi final terjadi saat Simpan.
                onChange(event.target.value)
              }}
              placeholder="https://contoh.com/gambar.jpg"
              aria-label="URL gambar"
              aria-describedby={describedBy}
              aria-invalid={Boolean(shownError)}
              className={cn(
                'h-10 w-full rounded-xl border border-[var(--border)] bg-white/90 pr-3 pl-8 text-xs text-[var(--text)] transition-colors',
                'placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none',
                (error || urlError) && 'border-destructive focus:border-destructive focus:ring-destructive/20',
              )}
            />
          </div>
          <div className="relative h-28 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/40">
            {previewSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element -- URL gambar bebas dari admin. */
              <img
                src={previewSrc}
                alt="Pratinjau gambar fasilitas"
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-1 text-[10px] text-[var(--text-muted)]">
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                Pratinjau muncul setelah URL valid
              </span>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={FACILITY_IMAGE_ACCEPT}
        onChange={handleInputChange}
        className="hidden"
        tabIndex={-1}
        aria-label="Pilih file gambar"
        disabled={uploading}
      />

      {shownError ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-[11px] font-medium text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          {shownError}
        </p>
      ) : (
        <p id={helpId} className="text-[10px] leading-relaxed text-[var(--text-muted)]">
          JPG, PNG, WEBP, atau GIF · maksimal {MAX_SIZE_LABEL} · rasio lanskap 4:3 paling pas.
        </p>
      )}
    </div>
  )
}
