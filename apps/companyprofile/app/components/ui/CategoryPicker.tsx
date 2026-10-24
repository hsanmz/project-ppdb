'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, ChevronDown, Info, Search } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Label } from './Label'

export interface CategoryPickerOption {
  value: string
  label: string
}

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  error?: string
  options: CategoryPickerOption[]
  /** Opsi “isi sendiri” (biasanya "Lainnya") yang membuka input khusus. */
  otherValue?: string
  /** Batas karakter backend untuk kolom kategori. */
  maxLength?: number
  required?: boolean
  label?: string
  /** Teks trigger saat belum ada pilihan. */
  triggerPlaceholder?: string
  listboxAriaLabel?: string
  searchAriaLabel?: string
  searchPlaceholder?: string
  helpText?: string
  customLabel?: string
  customPlaceholder?: string
  customHelpText?: string
  /** Class scrollbar-tipis untuk daftar opsi (mis. `.facility-form-pane`). */
  paneClassName?: string
  /** Panel pencarian tampil bila jumlah opsi >= nilai ini. */
  searchMinOptions?: number
}

/**
 * Pemilih kategori terpusat yang bisa dilabeli ulang (generic).
 *
 * Semua interaksinya diturunkan dari `FacilityCategoryPicker`: panel inline
 * (bukan popover mengambang) supaya tidak terpotong kolom form yang
 * `overflow-y-auto`, dukungan keyboard ↑↓/Enter/Escape, pencarian, badge
 * "Nilai lama" untuk kategori ber-label standar tapi tersimpan berbeda, dan
 * badge "Kustom" untuk nilai tidak dikenal yang TIDAK dibuang diam-diam.
 *
 * Dipakai bersama oleh form Fasilitas dan form Galeri supaya perilaku
 * kategori tidak pernah berbeda antar modul.
 */
export function CategoryPicker({
  id,
  value,
  onChange,
  error,
  options,
  otherValue = 'Lainnya',
  maxLength,
  required,
  label = 'Kategori',
  triggerPlaceholder = 'Pilih kategori',
  listboxAriaLabel = 'Pilihan kategori',
  searchAriaLabel = 'Cari kategori',
  searchPlaceholder = 'Cari kategori…',
  helpText,
  customLabel = 'Kategori Lainnya',
  customPlaceholder,
  customHelpText,
  paneClassName,
  searchMinOptions = 8,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const panelId = `${id}-panel`
  const listboxId = `${id}-listbox`
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const searchId = `${id}-search`

  const trimmed = String(value ?? '').trim()
  const selected = trimmed
    ? options.find((option) => option.value === trimmed) ??
      options.find((option) => option.label.toLowerCase() === trimmed.toLowerCase()) ??
      null
    : null
  const isLegacy = Boolean(trimmed) && selected !== null && selected.value !== trimmed
  const isOther = Boolean(selected && selected.value === otherValue)
  const isCustom = Boolean(trimmed) && !selected
  const showCustomInput = isOther || isCustom
  const customValue = isCustom ? trimmed : ''

  const enableSearch = options.length >= searchMinOptions

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q),
    )
  }, [query, options])

  const safeActiveIndex =
    filtered.length === 0 ? -1 : Math.min(activeIndex, filtered.length - 1)

  useEffect(() => {
    if (!open || !enableSearch) return
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open, enableSearch])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open || safeActiveIndex < 0) return
    const activeOption = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${safeActiveIndex}"]`,
    )
    activeOption?.scrollIntoView?.({ block: 'nearest' })
  }, [open, safeActiveIndex, query])

  function openPanel() {
    setOpen(true)
    setQuery('')
    setActiveIndex(0)
  }

  function closePanel(returnFocus = true) {
    setOpen(false)
    setQuery('')
    if (returnFocus) triggerRef.current?.focus()
  }

  function selectOption(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
    setQuery('')
    if (nextValue === otherValue) {
      window.setTimeout(() => document.getElementById(`${id}-custom`)?.focus(), 0)
    } else {
      triggerRef.current?.focus()
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(Math.max(filtered.length - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[safeActiveIndex]
      if (option) selectOption(option.value)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closePanel()
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const triggerLabel = selected?.label || trimmed || triggerPlaceholder
  const describedBy = [error ? errorId : null, helpId].filter(Boolean).join(' ')

  return (
    <div ref={wrapperRef} className="space-y-1.5">
      <Label
        htmlFor={id}
        className="block text-[13px] font-medium text-[var(--text-secondary)]"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true"> *</span>}
      </Label>

      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? closePanel(false) : openPanel())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            openPanel()
          }
        }}
        className={cn(
          'flex h-11 w-full items-center gap-2.5 rounded-xl border border-[var(--border)] bg-white/90 px-3 text-left text-sm transition-colors',
          'focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none',
          error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            !trimmed && 'text-[var(--text-muted)]',
            trimmed && 'font-medium text-[var(--text)]',
          )}
        >
          {triggerLabel}
        </span>

        {isLegacy && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            Nilai lama
          </span>
        )}
        {isCustom && (
          <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
            Kustom
          </span>
        )}

        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {isLegacy && !isOther && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-700">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Nilai lama <span className="font-semibold">“{value}”</span> dipertahankan dan
            ditampilkan sebagai “{selected?.label}”. Pilih kategori standar untuk
            menormalkan data.
          </span>
        </p>
      )}

      {open && (
        <div
          id={panelId}
          className="mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[0_14px_34px_-22px_rgba(15,60,40,0.45)]"
        >
          {enableSearch && (
            <div className="flex items-center gap-2 border-b border-[var(--border)]/70 px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <input
                ref={searchRef}
                id={searchId}
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchAriaLabel}
                aria-controls={listboxId}
                aria-activedescendant={
                  safeActiveIndex >= 0 ? `${id}-option-${safeActiveIndex}` : undefined
                }
                autoComplete="off"
                className="h-8 w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
            </div>
          )}

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={listboxAriaLabel}
            className={cn(
              'max-h-64 overflow-y-auto p-1.5',
              paneClassName,
              !enableSearch && 'pt-1.5',
            )}
          >
            {filtered.map((option, index) => {
              const isSelected = selected?.value === option.value
              const isActive = index === safeActiveIndex
              return (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => selectOption(option.value)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      isActive
                        ? 'bg-[var(--accent-subtle)] text-[var(--text)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/70 hover:text-[var(--text)]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                          : 'border-[var(--border-strong)] text-transparent',
                      )}
                      aria-hidden="true"
                    >
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.value === otherValue && (
                      <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                        Isi sendiri
                      </span>
                    )}
                  </button>
                </li>
              )
            })}

            {filtered.length === 0 && (
              <li className="px-3 py-5 text-center text-xs leading-relaxed text-[var(--text-muted)]">
                Tidak ada kategori yang cocok.
                <br />
                Pilih “{otherValue}” untuk menuliskan kategori sendiri.
              </li>
            )}
          </ul>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--border)]/70 bg-[var(--bg-secondary)]/40 px-3 py-2">
            <span className="text-[11px] text-[var(--text-muted)]">
              Gunakan ↑ ↓ lalu Enter.
            </span>
            <button
              type="button"
              onClick={() => selectOption(otherValue)}
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
            >
              Pilih {otherValue}
            </button>
          </div>
        </div>
      )}

      {showCustomInput && (
        <div className="space-y-1.5 pt-1">
          <Label
            htmlFor={`${id}-custom`}
            className="block text-[12px] font-medium text-[var(--text-secondary)]"
          >
            {customLabel}
          </Label>
          <input
            id={`${id}-custom`}
            type="text"
            value={customValue}
            onChange={(event) => {
              const next = event.target.value
              onChange(next.trim() ? next : otherValue)
            }}
            maxLength={maxLength}
            placeholder={customPlaceholder}
            aria-describedby={`${id}-custom-help`}
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white/90 px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none"
          />
          <div className="flex items-start justify-between gap-3">
            <p
              id={`${id}-custom-help`}
              className="text-[11px] leading-relaxed text-[var(--text-muted)]"
            >
              {customHelpText ||
                'Kategori ini disimpan apa adanya dan tetap dapat diedit nanti.'}
            </p>
            {maxLength ? (
              <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-muted)]">
                {customValue.length}/{maxLength}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : (
        helpText && (
          <p id={helpId} className="text-[11px] text-[var(--text-muted)]">
            {helpText}
          </p>
        )
      )}
    </div>
  )
}
