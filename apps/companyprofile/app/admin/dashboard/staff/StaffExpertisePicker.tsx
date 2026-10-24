'use client'

import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Label } from '@/app/components/ui/Label'
import { dedupeFacilityFeatures } from '../facilities/facility-form'

interface Props {
  id: string
  value: string[]
  onChange: (value: string[]) => void
}

const MAX_LENGTH = 60

function dedupe(items: string[]): string[] {
  const map = new Map<string, string>()
  for (const item of items) {
    const trimmed = item.trim().replace(/\s+/g, ' ')
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (!map.has(key)) map.set(key, trimmed)
  }
  return Array.from(map.values())
}

export function StaffExpertisePicker({ id, value, onChange }: Props) {
  const [draft, setDraft] = useState('')
  const [duplicateHint, setDuplicateHint] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const helperId = `${id}-help`
  const errorId = `${id}-duplicate`

  const selected = useMemo(() => dedupe(value), [value])

  function commit(items: string[]) {
    const next = dedupe(items)
    onChange(next)
    if (next.length === selected.length) {
      setDuplicateHint('Keahlian tersebut sudah ada di daftar.')
      return false
    }
    setDuplicateHint('')
    return true
  }

  function addFeature(raw: string) {
    const feature = raw.trim()
    if (!feature) return
    const added = commit([...selected, feature])
    if (added) setDraft('')
  }

  function removeFeature(feature: string) {
    onChange(selected.filter((f) => f !== feature))
    setDuplicateHint('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addFeature(draft)
      return
    }
    if (event.key === 'Backspace' && !draft && selected.length > 0) {
      event.preventDefault()
      removeFeature(selected[selected.length - 1])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={`${id}-input`} className="block text-[13px] font-medium text-[var(--text-secondary)]">
          Keahlian
          <span className="ml-1 text-[11px] font-normal text-[var(--text-muted)]">(opsional)</span>
        </Label>
        {selected.length > 0 && (
          <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{selected.length} ditambahkan</span>
        )}
      </div>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Keahlian terpilih">
          {selected.map((feature) => (
            <li key={feature}>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/25 bg-[var(--accent-subtle)] py-0.5 pr-1 pl-2.5 text-xs font-medium text-[var(--accent)]">
                <span className="max-w-[14rem] truncate">{feature}</span>
                <button
                  type="button"
                  onClick={() => removeFeature(feature)}
                  className="rounded-full p-0.5 text-[var(--accent)]/70 transition-colors hover:bg-[var(--accent)]/15 hover:text-[var(--accent)]"
                  aria-label={`Hapus keahlian ${feature}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          id={`${id}-input`}
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={MAX_LENGTH}
          onChange={(event) => {
            setDraft(event.target.value)
            if (duplicateHint) setDuplicateHint('')
          }}
          onKeyDown={handleKeyDown}
          placeholder="Contoh: Tahfidz, Bahasa Arab…"
          autoComplete="off"
          aria-describedby={duplicateHint ? errorId : helperId}
          aria-invalid={Boolean(duplicateHint)}
          className={cn(
            'h-10 w-full rounded-xl border border-[var(--border)] bg-white/90 px-3 text-sm text-[var(--text)] transition-colors',
            'placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none',
            duplicateHint && 'border-destructive',
          )}
        />
        <button
          type="button"
          onClick={() => addFeature(draft)}
          disabled={!draft.trim()}
          className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-[var(--accent)] px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah
        </button>
      </div>

      {duplicateHint ? (
        <p id={errorId} role="alert" className="text-[11px] font-medium text-destructive">
          {duplicateHint}
        </p>
      ) : (
        <p id={helperId} className="text-[10px] text-[var(--text-muted)]">
          Enter menambah · Backspace menghapus chip terakhir
        </p>
      )}
    </div>
  )
}

export { dedupeFacilityFeatures as dedupeStaffExpertise }
