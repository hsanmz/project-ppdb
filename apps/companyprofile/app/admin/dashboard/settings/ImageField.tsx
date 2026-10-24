'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { AlertCircle, Image as ImageIcon, Link2, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import * as api from '@/app/lib/api'
import { errorMessage } from '../_types'

interface Props {
  id: string
  label: string
  value: string
  onChange: (url: string) => void
  onUploadingChange?: (uploading: boolean) => void
  onDirtyChange?: (dirty: boolean) => void
  error?: string
  disabled?: boolean
  /** Maksimal ukuran file (default 2MB) */
  maxBytes?: number
  /** Placeholder preview context */
  previewAlt?: string
}

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024
const ACCEPT = 'image/*,.ico'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateImageUrl(url: string): string | null {
  if (!url.trim()) return null
  if (!/^https?:\/\//i.test(url)) return 'URL harus absolut (http/https)'
  if (url.startsWith(api.API_BASE)) return 'Gunakan URL gambar langsung, bukan URL API'
  return null
}

function validateImageFile(file: File, maxBytes: number): string | null {
  if (!file.type.startsWith('image/') && file.type !== 'image/x-icon' && file.name.endsWith('.ico')) {
    return 'File harus berupa gambar (JPG, PNG, WebP, GIF, ICO)'
  }
  if (file.size > maxBytes) {
    return `Ukuran file maksimal ${formatFileSize(maxBytes)}`
  }
  return null
}

function resolveImageSrc(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${api.API_BASE}${url}`
  return `${api.API_BASE}/${url}`
}

export function ImageField({
  id,
  label,
  value,
  onChange,
  onUploadingChange,
  onDirtyChange,
  error,
  disabled,
  maxBytes = DEFAULT_MAX_BYTES,
  previewAlt,
}: Props) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const [blobUrl, setBlobUrl] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const wasDirtyRef = useRef(false)

  const urlError = mode === 'url' ? validateImageUrl(value) : null
  const shownError = error || fileError || urlError || ''

  useEffect(() => {
    if (!blobUrl) return
    return () => URL.revokeObjectURL(blobUrl)
  }, [blobUrl])

  function setUploadingState(next: boolean) {
    setUploading(next)
    onUploadingChange?.(next)
  }

  function setDirtyState(next: boolean) {
    if (wasDirtyRef.current !== next) {
      wasDirtyRef.current = next
      onDirtyChange?.(next)
    }
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return
    const validation = validateImageFile(file, maxBytes)
    if (validation) {
      setFileError(validation)
      return
    }
    setFileError('')
    const preview = URL.createObjectURL(file)
    setBlobUrl(preview)
    setDirtyState(true)
    setUploadingState(true)
    try {
      let url = await api.uploadImage(file)
      if (url && !/^https?:\/\//i.test(url)) {
        url = `${api.API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
      }
      onChange(url)
      setDirtyState(false)
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
    event.target.value = ''
    void handleFile(file)
  }

  function handleDragEnter(event: DragEvent<HTMLButtonElement>) {
    if (disabled) return
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    if (disabled) return
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    if (disabled) return
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    void handleFile(event.dataTransfer.files?.[0])
  }

  function removeImage() {
    setBlobUrl('')
    setFileError('')
    setDirtyState(true)
    onChange('')
    inputRef.current?.focus()
  }

  function switchMode(next: 'upload' | 'url') {
    if (disabled) return
    setMode(next)
    setFileError('')
    if (next === 'url') setBlobUrl('')
  }

  const previewSrc = blobUrl || (validateImageUrl(value) === null ? resolveImageSrc(value) : '')
  const describedBy = `${id}-help ${shownError ? `${id}-error` : ''}`.trim()

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-[var(--text)]">
        {label}
      </label>

      {!disabled && (
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-[var(--bg-secondary)] p-0.5">
            {(['upload', 'url'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                aria-pressed={mode === m}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all',
                  mode === m
                    ? 'bg-white text-[var(--text)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text)] disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {m === 'upload' ? <Upload className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                {m === 'upload' ? 'Unggah' : 'URL'}
              </button>
            ))}
          </div>
          {mode === 'url' && (
            <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-muted)]">
              {value.trim().length} karakter
            </span>
          )}
        </div>
      )}

      {mode === 'upload' ? (
        <div
          className={cn(
            'relative h-40 overflow-hidden rounded-xl border border-dashed transition-colors',
            dragging
              ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
              : 'border-[var(--border)] bg-white/60',
            shownError && 'border-destructive/60',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          {previewSrc ? (
            <>
              <img
                src={previewSrc}
                alt={previewAlt || 'Pratinjau gambar'}
                className="h-full w-full object-contain p-2 bg-white"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
              {!uploading && !disabled && (
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
              onClick={() => !disabled && inputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              aria-describedby={describedBy}
              disabled={disabled}
              className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-center focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25 focus-visible:outline-none disabled:cursor-not-allowed"
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
              onChange={(event) => {
                setFileError('')
                onChange(event.target.value)
              }}
              placeholder="https://contoh.com/gambar.png"
              aria-label="URL gambar"
              aria-describedby={describedBy}
              aria-invalid={Boolean(shownError)}
              disabled={disabled}
              className={cn(
                'h-10 w-full rounded-xl border border-[var(--border)] bg-white/90 pr-3 pl-8 text-xs text-[var(--text)] transition-colors',
                'placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none',
                disabled && 'opacity-50 cursor-not-allowed',
                (error || urlError) && 'border-destructive focus:border-destructive focus:ring-destructive/20',
              )}
            />
          </div>
          <div className="relative h-28 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/40">
            {previewSrc ? (
              <img
                src={previewSrc}
                alt={previewAlt || 'Pratinjau gambar'}
                className="h-full w-full object-contain p-2 bg-white"
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
        accept={ACCEPT}
        onChange={handleInputChange}
        className="hidden"
        tabIndex={-1}
        aria-label="Pilih file gambar"
        disabled={uploading || disabled}
      />

      {shownError ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-[11px] font-medium text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          {shownError}
        </p>
      ) : (
        <p id={`${id}-help`} className="text-[10px] leading-relaxed text-[var(--text-muted)]">
          JPG, PNG, WEBP, GIF, ICO · maksimal {formatFileSize(maxBytes)}
        </p>
      )}
    </div>
  )
}
