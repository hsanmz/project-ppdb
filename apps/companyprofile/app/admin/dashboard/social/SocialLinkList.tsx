'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, ExternalLink, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { cn } from '@/app/lib/utils'
import { SocialIcon } from './SocialIcon'
import { matchSocialPreset, socialDomainLabel } from './social-utils'
import type { RowRecord } from '../_types'

interface Props {
  items: RowRecord[]
  canCrud: boolean
  /** Id baris yang sedang dimuat detailnya utk form edit (tombol Edit roda). */
  detailLoading: string | null
  onEdit: (item: RowRecord) => void
  /** Sudah melewati dialog konfirmasi di pemanggil. */
  onDelete: (item: RowRecord) => void
}

/**
 * Salin teks ke clipboard dengan fallback lama (execCommand) bila API async
 * tidak tersedia — halaman admin harus tetap berfungsi di WebView lama.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

/**
 * Daftar Tautan Sosial berbentuk kartu baris — bukan tabel besar, karena
 * datanya tipis (ikon + label + url + 2 aksi) dan lebih nyaman dipindai.
 * Tampilan admin memakai renderer ikon yang sama dengan situs publik
 * (`SocialIcon`), jadi apa yang dilihat panitia = apa yang tampil pengunjung.
 */
export function SocialLinkList({ items, canCrud, detailLoading, onEdit, onDelete }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  useEffect(() => {
    if (!copiedId) return
    const id = window.setTimeout(() => setCopiedId(null), 1600)
    return () => window.clearTimeout(id)
  }, [copiedId])

  async function handleCopy(item: RowRecord) {
    const href = String(item.href ?? '').trim()
    if (!href) {
      toast('warning', 'Tautan kosong — isi URL terlebih dahulu.')
      return
    }
    const ok = await copyText(href)
    if (ok) {
      setCopiedId(String(item.id ?? href))
      toast('success', 'URL disalin ke clipboard')
    } else {
      toast('error', 'Browser menolak akses clipboard. Salin manual dari baris teks URL.')
    }
  }

  function openUrl(item: RowRecord) {
    const href = String(item.href ?? '').trim()
    if (!href) return
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  async function requestDelete(item: RowRecord) {
    const label = String(item.label ?? '').trim()
    // Sebut tautan yang dihapus supaya admin tidak salah baris.
    const ok = await confirm({
      title: 'Hapus Tautan Sosial',
      message: label
        ? `Yakin ingin menghapus "${label}"? Tindakan ini tidak bisa dibatalkan.`
        : 'Yakin ingin menghapus tautan ini? Tindakan ini tidak bisa dibatalkan.',
      confirmLabel: 'Ya, Hapus',
      cancelLabel: 'Batal',
      variant: 'danger',
    })
    if (ok) onDelete(item)
  }

  return (
    <div className="mb-6 space-y-3">
      {items.map((item) => {
        const id = String(item.id ?? '')
        const label = String(item.label ?? '').trim()
        const href = String(item.href ?? '').trim()
        const path = String(item.path ?? '')
        const preset = matchSocialPreset(path)
        const domain = socialDomainLabel(href)
        const editing = detailLoading === id

        return (
          <div
            key={id || href || label}
            data-testid="social-link-row"
            className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)]/80 bg-white/80 p-4 shadow-[0_1px_3px_rgba(15,60,40,0.05)] backdrop-blur-sm transition-all duration-200 hover:border-[var(--accent)]/45 hover:bg-white hover:shadow-[0_10px_28px_-18px_rgba(26,107,71,0.45)] sm:flex-row sm:items-center sm:gap-4 sm:px-5"
          >
            {/* Ikon platform — chip + preview ikon sesuai render publik */}
            <span className="flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] sm:self-auto">
              <SocialIcon
                path={path}
                className="h-6 w-6"
                fallbackClassName="h-6 w-6 opacity-70"
              />
            </span>

            {/* Label + metadata */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className="max-w-full truncate font-heading text-sm font-bold text-[var(--text)]"
                  title={label || undefined}
                >
                  {label || <span className="font-normal text-[var(--text-muted)]">— tanpa label —</span>}
                </p>
                {/* Indikator platform: nama preset untuk ikon bawaan,
                    "Ikon Kustom" bila path bukan bawaan. */}
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
                    preset
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                      : 'bg-[var(--accent-gold)]/15 text-[#9A7429]',
                  )}
                >
                  {preset ? preset.label : 'Ikon Kustom'}
                </span>
              </div>

              {/* URL — dipotong visual dengan ellipsis, nilai asli utuh
                  (title + salin mengembalikannya tanpa kehilangan data). */}
              {href ? (
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleCopy(item)}
                    className="min-w-0 max-w-full truncate text-left text-xs text-[var(--text-secondary)] underline-offset-2 transition-colors hover:text-[var(--accent)] hover:underline"
                    title={`${href} — klik untuk menyalin`}
                    aria-label={`Salin URL ${label || domain}`}
                  >
                    {href}
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-xs font-medium text-red-500" role="status">
                  URL kosong — tautan tidak akan tampil di situs publik.
                </p>
              )}
              {href && domain && domain !== href && (
                <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]" title={domain}>
                  {domain}
                </p>
              )}
            </div>

            {/* Aksi */}
            <div className="flex shrink-0 items-center gap-1.5 self-stretch justify-end sm:self-auto">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full px-3 text-[var(--text-secondary)] hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                onClick={() => void handleCopy(item)}
                aria-label={`Salin tautan ${label || 'sosial'}`}
                title="Salin URL"
              >
                {copiedId === id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden lg:inline">{copiedId === id ? 'Tersalin' : 'Salin'}</span>
              </Button>
              {href && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-full px-3 text-[var(--text-secondary)] hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  onClick={() => openUrl(item)}
                  aria-label={`Buka tautan ${label || 'sosial'} di tab baru`}
                  title="Buka di tab baru"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Buka</span>
                </Button>
              )}
              {canCrud && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={editing}
                    onClick={() => onEdit(item)}
                    aria-label={`Edit ${label || 'tautan sosial'}`}
                    className="gap-1.5 rounded-full px-3 text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
                  >
                    {editing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={editing}
                    onClick={() => void requestDelete(item)}
                    aria-label={`Hapus ${label || 'tautan sosial'}`}
                    className="gap-1.5 rounded-full px-3 text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
