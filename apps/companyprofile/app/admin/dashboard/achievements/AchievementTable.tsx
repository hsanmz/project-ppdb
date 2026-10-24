'use client'

import { useState } from 'react'
import {
  Calendar,
  Eye,
  Loader2,
  Pencil,
  Trash2,
  Trophy,
} from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/Table'
import type { RowRecord } from '../_types'
import { getScopeBadgeStyle } from './achievement-form'
import { AchievementCertificateModal } from './AchievementCertificateModal'

interface Props {
  items: RowRecord[]
  canCrud: boolean
  detailLoading: string | null
  onEdit: (item: RowRecord) => void
  onDelete: (item: RowRecord) => void
}

/**
 * Tabel Presentasi Prestasi (Achievements Listing) — Enterprise Grade & Restrained Gold Styling.
 *
 * Kolom:
 * 1. Tahun — Badge emas berwibawa (Regal Gold badge).
 * 2. Judul Prestasi — Teks judul utama dengan bobot jelas.
 * 3. Lingkup — Badge tingkat seleksi/kejuaraan yang rapi.
 * 4. Deskripsi — Ringkasan catatan/kategori lomba.
 * 5. Dokumentasi — Pratinjau thumbnail sertifikat dengan aksi klik untuk membuka lightbox resolusi penuh.
 * 6. Aksi — Tombol Edit dan Hapus (dilindungi permission).
 */
export function AchievementTable({
  items,
  canCrud,
  detailLoading,
  onEdit,
  onDelete,
}: Props) {
  const [inspectItem, setInspectItem] = useState<RowRecord | null>(null)

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border-border/70 bg-white/70 shadow-[0_18px_50px_-30px_rgba(26,107,71,0.35)] backdrop-blur-sm">
        <div className="overflow-x-auto no-scrollbar">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/70 bg-[var(--bg-secondary)]/55 hover:bg-[var(--bg-secondary)]/55">
                <TableHead className="h-12 w-[110px] px-5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em]">
                  Tahun
                </TableHead>
                <TableHead className="h-12 min-w-[220px] px-5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em]">
                  Judul Prestasi
                </TableHead>
                <TableHead className="h-12 w-[150px] px-5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em]">
                  Lingkup
                </TableHead>
                <TableHead className="h-12 min-w-[200px] max-w-[320px] px-5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em]">
                  Deskripsi
                </TableHead>
                <TableHead className="h-12 w-[130px] px-5 text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em]">
                  Dokumentasi
                </TableHead>
                {canCrud && (
                  <TableHead className="h-12 w-[1%] px-5 text-right text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em] whitespace-nowrap">
                    Aksi
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.map((item) => {
                const content = (item.content ?? {}) as Record<string, unknown>
                const title = String(content.title || item.title || '').trim() || 'Prestasi Santri'
                const desc = String(content.desc || item.desc || '').trim()
                const scope = String(content.scope || item.scope || '').trim()
                const year = item.year != null ? String(item.year) : '—'
                const imageUrl = typeof item.image === 'string' ? item.image.trim() : ''
                const badgeStyle = scope ? getScopeBadgeStyle(scope) : null

                return (
                  <TableRow
                    key={item.id || item.key}
                    className="group border-b border-border/50 transition-all duration-200 hover:bg-[var(--accent-subtle)] hover:shadow-[inset_3px_0_0_0_var(--accent)]"
                  >
                    {/* 1. Tahun Prestasi (Restrained Gold Badge) */}
                    <TableCell className="px-5 py-4 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 font-mono text-xs font-bold text-[#8A6218] shadow-sm">
                        <Calendar className="h-3 w-3 text-amber-600 shrink-0" />
                        {year}
                      </span>
                    </TableCell>

                    {/* 2. Judul Prestasi */}
                    <TableCell className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                          <Trophy className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-[var(--text)] leading-snug line-clamp-2" title={title}>
                            {title}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* 3. Lingkup Prestasi */}
                    <TableCell className="px-5 py-4 align-middle whitespace-nowrap">
                      {scope ? (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                            badgeStyle?.bg,
                            badgeStyle?.text,
                            badgeStyle?.border,
                          )}
                        >
                          {scope}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </TableCell>

                    {/* 4. Deskripsi Prestasi */}
                    <TableCell className="max-w-[320px] px-5 py-4 align-middle">
                      {desc ? (
                        <p className="line-clamp-2 text-xs text-[var(--text-secondary)] leading-relaxed" title={desc}>
                          {desc}
                        </p>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] italic">Tidak ada catatan</span>
                      )}
                    </TableCell>

                    {/* 5. Dokumentasi / Sertifikat (Certificate-Friendly Thumbnail) */}
                    <TableCell className="px-5 py-4 align-middle text-center whitespace-nowrap">
                      {imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setInspectItem(item)}
                          className="group/thumb relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900 shadow-sm transition-all hover:border-[var(--accent)] hover:shadow-md"
                          title="Klik untuk melihat sertifikat resolusi penuh"
                        >
                          <div className="relative h-12 w-16 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageUrl}
                              alt={title}
                              loading="lazy"
                              className="h-full w-full object-contain p-0.5 transition-transform duration-200 group-hover/thumb:scale-110"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-secondary)] px-2 py-1 text-[10px] text-[var(--text-muted)]">
                          Tanpa Berkas
                        </span>
                      )}
                    </TableCell>

                    {/* 6. Aksi */}
                    {canCrud && (
                      <TableCell className="w-[1%] px-5 py-4 text-right whitespace-nowrap align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={detailLoading === item.id}
                            onClick={() => onEdit(item)}
                            className="gap-1.5 rounded-full px-3 text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
                          >
                            {detailLoading === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5" />
                            )}
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const { confirm } = await import('@/app/components/ui/AdminConfirm')
                              const ok = await confirm({
                                title: 'Hapus Prestasi',
                                message: title
                                  ? `Yakin ingin menghapus prestasi "${title}"? Tindakan ini tidak dapat dibatalkan.`
                                  : 'Yakin ingin menghapus prestasi ini? Tindakan ini tidak dapat dibatalkan.',
                                confirmLabel: 'Ya, Hapus',
                                cancelLabel: 'Batal',
                                variant: 'danger',
                              })
                              if (ok) onDelete(item)
                            }}
                            className="gap-1.5 rounded-full px-3 text-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Lightbox Inspeksi Sertifikat */}
      {inspectItem && (
        <AchievementCertificateModal
          data={{
            imageUrl: String(inspectItem.image || ''),
            title: String((inspectItem.content as Record<string, unknown>)?.title || inspectItem.title || ''),
            year: inspectItem.year,
            scope: String((inspectItem.content as Record<string, unknown>)?.scope || inspectItem.scope || ''),
          }}
          onClose={() => setInspectItem(null)}
        />
      )}
    </>
  )
}
