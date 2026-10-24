'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  AlertCircle,
  Image as ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { cn } from '@/app/lib/utils'
import * as api from '@/app/lib/api'
import { toast } from '@/app/components/ui/AdminToast'
import {
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  IMAGE_URL_MAX_LENGTH,
  formatFileSize,
  resolveImageSrc,
  validateImageFile,
  validateImageUrl,
} from '@/app/lib/image-file'
import { errorMessage } from '../_types'

interface Props {
  /** Elemen yang difokuskan saat validasi gagal. */
  id: string
  value: string
  onChange: (url: string) => void
  /** Diberitahu ke dialog supaya tombol Simpan tidak ditekan saat upload berjalan. */
  onUploadingChange?: (uploading: boolean) => void
  error?: string
}

const MAX_SIZE_LABEL = formatFileSize(IMAGE_MAX_BYTES)

/**
 * Pengunggah foto wali santri.
 *
 * Foto bersifat opsional dan tidak pernah mengunci tombol Simpan. Pratinjau
 * memakai rasio potret 4:5 agar mencerminkan kartu testimoni di halaman publik;
 * foto lama tetap dipertahankan sampai unggahan pengganti benar-benar berhasil.
 *
 * `<img>` biasa (bukan `next/image`) dipakai karena URL berasal dari input
 * bebas admin dan `next/image` melempar error untuk host yang belum terdaftar.
 */
export function TestimonialPhotoField({
  id,
  value,
  onChange,
  onUploadingChange,
  error,
}: Props) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const [justUploaded, setJustUploaded] = useState(false)
  const [blobUrl, setBlobUrl] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const urlError = validateImageUrl(value)
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
    if (!file || uploading) return
    const validation = validateImageFile(file)
    if (validation) {
      setFileError(validation)
      return
    }

    setFileError('')
    setJustUploaded(false)
    const preview = URL.createObjectURL(file)
    setBlobUrl(preview)
    setUploadingState(true)
    try {
      // Nilai lama sengaja BELUM diganti. Bila unggahan gagal, foto yang sudah
      // ada tetap utuh dan tetap bisa disimpan.
      const url = await api.uploadImage(file)
      onChange(url)
      setJustUploaded(true)
      toast('success', 'Foto berhasil diunggah — tekan Simpan Testimoni untuk menerapkan')
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

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    void handleFile(event.dataTransfer.files?.[0])
  }

  function removeImage() {
    setBlobUrl('')
    setFileError('')
    setJustUploaded(false)
    onChange('')
    inputRef.current?.focus()
  }

  function switchMode(next: 'upload' | 'url') {
    if (uploading) return
    setMode(next)
    setFileError('')
    // Saat pindah ke mode URL, pratinjau harus mengikuti URL, bukan blob lama.
    if (next === 'url') setBlobUrl('')
  }

  const previewSrc = blobUrl || resolveImageSrc(value, api.API_BASE)
  const describedBy = [shownError ? errorId : null, helpId].filter(Boolean).join(' ')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-0.5 rounded-lg bg-[var(--bg-secondary)] p-0.5">
          {(['upload', 'url'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              disabled={uploading}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60',
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
        <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
          Opsional
        </span>
      </div>

      {mode === 'upload' ? (
        <div
          className={cn(
            'relative aspect-4/5 overflow-hidden rounded-2xl border border-dashed transition-colors',
            dragging
              ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
              : 'border-[var(--border)] bg-white/60',
            shownError && 'border-destructive/60',
          )}
          onDragEnter={previewSrc ? handleDragEnter : undefined}
          onDragOver={previewSrc ? (event) => event.preventDefault() : undefined}
          onDragLeave={previewSrc ? handleDragLeave : undefined}
          onDrop={previewSrc ? handleDrop : undefined}
        >
          {previewSrc ? (
            <>
              <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--color-deep-navy)] text-white/80">
                <UserRound className="h-12 w-12" aria-hidden="true" />
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL gambar bebas dari admin; lihat komentar komponen. */}
              <img
                src={previewSrc}
                alt="Pratinjau foto wali santri"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />

              {!uploading && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pt-10 pb-2.5">
                  <span className="min-w-0 flex-1 truncate text-[10px] text-white/85" title={value || undefined}>
                    {blobUrl ? 'Pratinjau file lokal' : value || 'Foto wali santri'}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      id={id}
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-white/90 transition-colors hover:bg-white/15 hover:text-white"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-red-200 transition-colors hover:bg-red-500/20 hover:text-red-100"
                    >
                      <Trash2 className="h-3 w-3" />
                      Hapus
                    </button>
                  </div>
                </div>
              )}

              {dragging && !uploading && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--accent)]/85 text-white">
                  <Upload className="h-7 w-7" aria-hidden="true" />
                  <span className="text-xs font-semibold">Lepas untuk mengganti foto</span>
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
              className="flex h-full w-full flex-col items-center justify-center gap-2 px-5 py-8 text-center focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25 focus-visible:outline-none"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]"
                aria-hidden="true"
              >
                <UserRound className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-[var(--text)]">
                {dragging ? 'Lepas foto di sini' : 'Foto wali santri (opsional)'}
              </span>
              <span className="text-xs leading-relaxed text-[var(--text-secondary)]">
                Tarik foto ke sini atau klik untuk memilih.
              </span>
              <span className="mt-1 max-w-[15rem] text-[11px] leading-relaxed text-[var(--text-muted)]">
                Testimoni tetap dapat ditampilkan tanpa foto.
              </span>
            </button>
          )}

          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 px-6 text-white backdrop-blur-[1px]">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs font-semibold">Mengunggah foto…</span>
              <span
                role="progressbar"
                aria-label="Progres unggah foto"
                aria-valuetext="Sedang mengunggah"
                className="h-1 w-32 overflow-hidden rounded-full bg-white/30"
              >
                <span className="block h-full w-1/2 animate-pulse rounded-full bg-white" />
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id={id}
              type="url"
              value={value}
              maxLength={IMAGE_URL_MAX_LENGTH + 50}
              onChange={(event) => {
                setFileError('')
                setJustUploaded(false)
                // Nilai tetap dikirim ke form walau belum valid supaya ketikan
                // admin tidak hilang; validasi final terjadi saat Simpan.
                onChange(event.target.value)
              }}
              placeholder="https://contoh.com/foto-wali.jpg"
              aria-label="URL foto wali santri"
              aria-describedby={describedBy}
              aria-invalid={Boolean(shownError)}
              className={cn(
                'h-10 w-full rounded-xl border border-[var(--border)] bg-white/90 pr-3 pl-8 text-xs text-[var(--text)] transition-colors',
                'placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none',
                (error || urlError) && 'border-destructive focus:border-destructive focus:ring-destructive/20',
              )}
            />
          </div>

          <div className="relative aspect-4/5 max-h-[19rem] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/40">
            {previewSrc ? (
              <>
                <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--color-deep-navy)] text-white/80">
                  <UserRound className="h-12 w-12" aria-hidden="true" />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL gambar bebas dari admin. */}
                <img
                  src={previewSrc}
                  alt="Pratinjau foto wali santri"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              </>
            ) : (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
                <ImageIcon className="h-5 w-5" aria-hidden="true" />
                Pratinjau muncul setelah URL valid diisi.
              </span>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={handleInputChange}
        className="hidden"
        tabIndex={-1}
        aria-label="Pilih file foto wali santri"
        disabled={uploading}
      />

      {shownError ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-[11px] font-medium text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          {shownError}
        </p>
      ) : uploading ? (
        <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
          Foto sedang diunggah. Tombol Simpan dinonaktifkan sampai selesai.
        </p>
      ) : justUploaded ? (
        <p className="text-[10px] leading-relaxed font-medium text-[var(--accent)]">
          Foto berhasil diunggah. Tekan Simpan Testimoni untuk menerapkannya.
        </p>
      ) : (
        <p id={helpId} className="text-[10px] leading-relaxed text-[var(--text-muted)]">
          JPG, PNG, WEBP, atau GIF · maksimal {MAX_SIZE_LABEL} · rasio potret 4:5 paling pas.
          Foto boleh dikosongkan.
        </p>
      )}
    </div>
  )
}
