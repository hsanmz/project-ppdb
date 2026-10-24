'use client'

import { ExternalLink, Award, Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/Dialog'
import { getScopeBadgeStyle } from './achievement-form'
import { cn } from '@/app/lib/utils'

interface CertificateData {
  imageUrl: string
  title?: string
  year?: number | string
  scope?: string
}

interface Props {
  data: CertificateData | null
  onClose: () => void
}

export function AchievementCertificateModal({ data, onClose }: Props) {
  if (!data || !data.imageUrl) return null

  const badgeStyle = data.scope ? getScopeBadgeStyle(data.scope) : null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-700 bg-slate-950 p-0 text-white shadow-2xl">
        {/* Header Inspeksi */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-5 py-3.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-sm">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-sm font-bold text-white">
                {data.title || 'Dokumentasi / Piagam Sertifikat'}
              </DialogTitle>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {data.year ? (
                  <span className="flex items-center gap-1 text-amber-400 font-semibold font-mono">
                    <Calendar className="h-3 w-3" />
                    {data.year}
                  </span>
                ) : null}
                {data.scope ? (
                  <>
                    <span>•</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                        badgeStyle?.bg || 'bg-slate-800',
                        badgeStyle?.text || 'text-slate-300',
                        badgeStyle?.border || 'border-slate-700',
                      )}
                    >
                      {data.scope}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={data.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              title="Buka gambar di tab baru"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Buka Asli</span>
            </a>
          </div>
        </div>

        {/* Kanvas Gambar Full Contain */}
        <div className="relative flex flex-1 items-center justify-center overflow-auto p-4 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt={data.title || 'Sertifikat'}
            className="max-h-[72dvh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
