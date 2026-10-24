'use client'

import { useId } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Label } from '@/app/components/ui/Label'
import {
  ACHIEVEMENT_SCOPES,
  ACHIEVEMENT_SCOPE_MAX_LENGTH,
  normalizeAchievementScope,
  getScopeBadgeStyle,
  type AchievementScopePreset,
} from './achievement-form'

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  error?: string
}

export function AchievementScopePicker({ id: propId, value, onChange, error }: Props) {
  const generatedId = useId()
  const id = propId || generatedId

  const normalized = normalizeAchievementScope(value)
  const isCustomPreset = normalized.preset === 'Lainnya'
  const customValue = normalized.customValue || (value !== 'Lainnya' && isCustomPreset ? value : '')

  function handleSelectPreset(preset: AchievementScopePreset) {
    if (preset === 'Lainnya') {
      onChange(customValue.trim() || 'Lainnya')
    } else {
      onChange(preset)
    }
  }

  const badgeStyle = getScopeBadgeStyle(value || normalized.preset)

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Tingkat / Lingkup Prestasi
        </Label>
        {value ? (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors',
              badgeStyle.bg,
              badgeStyle.text,
              badgeStyle.border,
            )}
          >
            {value}
          </span>
        ) : null}
      </div>

      {/* Grid Opsi Pilihan Cepat */}
      <div
        id={id}
        role="radiogroup"
        aria-label="Pilihan Tingkat Prestasi"
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
      >
        {ACHIEVEMENT_SCOPES.map((scope) => {
          const isSelected = normalized.preset === scope
          return (
            <button
              key={scope}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelectPreset(scope)}
              className={cn(
                'group relative flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all duration-150',
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]/30'
                  : 'border-[var(--border)] bg-white/80 text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:bg-white hover:text-[var(--text)]',
              )}
            >
              <span className="truncate pr-1">{scope}</span>
              {isSelected ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-transparent group-hover:bg-[var(--accent)]/30" />
              )}
            </button>
          )
        })}
      </div>

      {/* Input Kustom bila opsi 'Lainnya' aktif atau nilai tidak ada di preset */}
      {isCustomPreset && (
        <div className="mt-2 space-y-1.5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${id}-custom`} className="text-[11px] font-medium text-amber-900">
              Sebutkan Lingkup Khusus
            </Label>
            <span className="text-[10px] text-amber-700/80">
              {customValue.length}/{ACHIEVEMENT_SCOPE_MAX_LENGTH}
            </span>
          </div>
          <input
            id={`${id}-custom`}
            type="text"
            value={customValue}
            maxLength={ACHIEVEMENT_SCOPE_MAX_LENGTH}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Contoh: Se-Jawa & Bali, Antar Pesantren, dll."
            className="h-9 w-full rounded-lg border border-amber-300 bg-white px-3 text-xs text-[var(--text)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
          <p className="text-[10px] text-amber-800/80">
            Nilai kustom ini akan disimpan dan ditampilkan pada profil prestasi publik.
          </p>
        </div>
      )}

      {error ? (
        <p className="text-[11px] font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
