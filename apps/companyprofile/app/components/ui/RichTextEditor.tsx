'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic,
  Link2, List, ListOrdered, Minus, Quote, Redo2, RemoveFormatting,
  Strikethrough, Underline, Undo2,
} from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { toast } from '@/app/components/ui/AdminToast'
import {
  isSafeUrl, looksLikeHtml, plainTextToHtml, sanitizeRichHtml,
} from '@/app/lib/rich-text'

interface Props {
  id?: string
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

interface ToolbarState {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  bullets: boolean
  ordered: boolean
  align: 'left' | 'center' | 'right' | 'justify' | null
  block: string
}

const EMPTY_TOOLBAR: ToolbarState = {
  bold: false, italic: false, underline: false, strike: false,
  bullets: false, ordered: false, align: null, block: 'p',
}

const BLOCK_OPTIONS: { value: string; label: string }[] = [
  { value: 'p', label: 'Paragraf' },
  { value: 'h2', label: 'Judul 2' },
  { value: 'h3', label: 'Judul 3' },
  { value: 'h4', label: 'Judul 4' },
  { value: 'blockquote', label: 'Kutipan' },
]

/**
 * Editor teks kaya (WYSIWYG) ringan berbasis `contentEditable`.
 *
 * Sengaja tidak memakai library editor pihak ketiga: kebutuhan artikel
 * (tebal, miring, garis bawah, daftar, judul, kutipan, tautan) sudah dicakup
 * `document.execCommand`, dan tidak ada dependensi baru yang perlu dibangun di
 * server. HTML yang dihasilkan selalu dibersihkan lewat `sanitizeRichHtml`
 * sebelum disimpan maupun dirender.
 */
export function RichTextEditor({
  id, value, onChange, disabled = false, placeholder = 'Tulis isi berita di sini…', className,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  // Nilai terakhir yang kita kirim ke induk. Dipakai untuk membedakan
  // perubahan dari dalam editor (jangan reset DOM) dan dari luar (mis. data
  // selesai dimuat ulang).
  const lastEmitted = useRef<string>(value ?? '')
  const savedRange = useRef<Range | null>(null)
  const [toolbar, setToolbar] = useState<ToolbarState>(EMPTY_TOOLBAR)

  const markEmpty = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const hasText = (el.textContent || '').trim().length > 0 || !!el.querySelector('li, hr')
    el.dataset.empty = hasText ? 'false' : 'true'
  }, [])

  const emit = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    markEmpty()
    const html = el.innerHTML
    lastEmitted.current = html
    onChange(html)
  }, [markEmpty, onChange])

  const refreshToolbar = useCallback(() => {
    if (typeof document.queryCommandState !== 'function') return
    let block = ''
    try {
      block = String(document.queryCommandValue('formatBlock') || '').toLowerCase()
    } catch {
      block = ''
    }
    block = block.replace(/[<>]/g, '')
    if (!BLOCK_OPTIONS.some((opt) => opt.value === block)) block = 'p'

    const align =
      document.queryCommandState('justifyCenter') ? 'center'
      : document.queryCommandState('justifyRight') ? 'right'
      : document.queryCommandState('justifyFull') ? 'justify'
      : document.queryCommandState('justifyLeft') ? 'left'
      : null

    setToolbar({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
      bullets: document.queryCommandState('insertUnorderedList'),
      ordered: document.queryCommandState('insertOrderedList'),
      align,
      block,
    })
  }, [])

  // Isi awal: konversi artikel teks polos lama menjadi paragraf, dan bersihkan
  // HTML yang sudah ada. Hanya sekali saat mount (dialog baru = mount baru).
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const incoming = value ?? ''
    el.innerHTML = looksLikeHtml(incoming)
      ? sanitizeRichHtml(incoming)
      : plainTextToHtml(incoming)
    lastEmitted.current = incoming
    markEmpty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Perubahan dari luar (mis. detail baris selesai dimuat). Jangan sentuh DOM
  // saat nilainya berasal dari ketikan kita sendiri agar kursor tidak melompat.
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const incoming = value ?? ''
    if (incoming === lastEmitted.current) return
    const html = looksLikeHtml(incoming)
      ? sanitizeRichHtml(incoming)
      : plainTextToHtml(incoming)
    if (el.innerHTML !== html) el.innerHTML = html
    lastEmitted.current = incoming
    markEmpty()
  }, [markEmpty, value])

  // Simpan selection terakhir di dalam editor, supaya perintah dari toolbar
  // (terutama <select> format blok) tetap bekerja walau fokus sempat pindah.
  useEffect(() => {
    const handler = () => {
      const el = editorRef.current
      const selection = window.getSelection()
      if (!el || !selection || selection.rangeCount === 0) return
      const range = selection.getRangeAt(0)
      if (!el.contains(range.commonAncestorContainer)) return
      savedRange.current = range.cloneRange()
      refreshToolbar()
    }
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [refreshToolbar])

  function restoreSelection() {
    const el = editorRef.current
    const selection = window.getSelection()
    if (!el || !selection) return
    el.focus()
    if (savedRange.current && el.contains(savedRange.current.commonAncestorContainer)) {
      selection.removeAllRanges()
      selection.addRange(savedRange.current)
    }
  }

  function run(command: string, arg?: string) {
    if (disabled) return
    restoreSelection()
    document.execCommand(command, false, arg)
    refreshToolbar()
    emit()
  }

  function addLink() {
    if (disabled) return
    restoreSelection()
    const url = window.prompt('Masukkan URL tautan', 'https://')
    if (!url) return
    if (!isSafeUrl(url)) {
      toast('error', 'URL tidak valid. Gunakan https://, http://, mailto:, atau tautan internal (/...).')
      return
    }
    const selection = window.getSelection()
    if (selection && selection.isCollapsed) {
      const escapedUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
      document.execCommand('insertHTML', false, `<a href="${escapedUrl}">${escapedUrl}</a>`)
    } else {
      document.execCommand('createLink', false, url)
    }
    refreshToolbar()
    emit()
  }

  // Paste dari Word/web: ambil versi HTML lalu bersihkan. Teks polos diubah
  // menjadi paragraf agar baris baru tidak hilang.
  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    if (disabled) return
    const html = event.clipboardData.getData('text/html')
    const text = event.clipboardData.getData('text/plain')
    if (!html && !text) return
    event.preventDefault()
    const clean = html ? sanitizeRichHtml(html) : plainTextToHtml(text)
    document.execCommand('insertHTML', false, clean)
    emit()
  }

  /**
   * Delegasi klik toolbar: semua tombol membawa `data-command`/`data-action`,
   * jadi tidak ada closure per tombol yang menangkap ref editor.
   */
  function handleToolbarClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (disabled) return
    const button = (event.target as HTMLElement).closest<HTMLElement>(
      'button[data-command], button[data-action]',
    )
    if (!button || button.hasAttribute('disabled')) return
    if (button.dataset.action === 'link') {
      addLink()
      return
    }
    const command = button.dataset.command
    if (command) run(command, button.dataset.commandArg || undefined)
  }

  function handleBlockChange(event: ChangeEvent<HTMLSelectElement>) {
    run('formatBlock', `<${event.target.value}>`)
  }

  return (
    <div
      className={cn(
        'flex flex-col min-h-0 overflow-hidden rounded-2xl border border-[var(--border)]/80 bg-white shadow-[0_1px_3px_rgba(15,60,40,0.05)]',
        disabled && 'opacity-70',
        className,
      )}
    >
      {/* ── Toolbar ── */}
      <div
        onClick={handleToolbarClick}
        className="shrink-0 flex flex-wrap items-center gap-1 border-b border-[var(--border)]/70 bg-[var(--bg-secondary)]/60 px-2.5 py-2"
      >
        <ToolbarButton label="Urungkan" icon={Undo2} command="undo" disabled={disabled} />
        <ToolbarButton label="Ulangi" icon={Redo2} command="redo" disabled={disabled} />

        <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />

        <select
          aria-label="Format blok"
          value={toolbar.block}
          disabled={disabled}
          onChange={handleBlockChange}
          className="h-8 rounded-lg border border-[var(--border)] bg-white px-2 text-xs font-medium text-[var(--text)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none disabled:opacity-50"
        >
          {BLOCK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />

        <ToolbarButton label="Tebal (Ctrl+B)" icon={Bold} command="bold" active={toolbar.bold} disabled={disabled} />
        <ToolbarButton label="Miring (Ctrl+I)" icon={Italic} command="italic" active={toolbar.italic} disabled={disabled} />
        <ToolbarButton label="Garis bawah (Ctrl+U)" icon={Underline} command="underline" active={toolbar.underline} disabled={disabled} />
        <ToolbarButton label="Coret" icon={Strikethrough} command="strikeThrough" active={toolbar.strike} disabled={disabled} />

        <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />

        <ToolbarButton label="Daftar poin" icon={List} command="insertUnorderedList" active={toolbar.bullets} disabled={disabled} />
        <ToolbarButton label="Daftar bernomor" icon={ListOrdered} command="insertOrderedList" active={toolbar.ordered} disabled={disabled} />
        <ToolbarButton label="Kutipan" icon={Quote} command="formatBlock" commandArg="<blockquote>" active={toolbar.block === 'blockquote'} disabled={disabled} />

        <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />

        <ToolbarButton label="Rata kiri" icon={AlignLeft} command="justifyLeft" active={toolbar.align === 'left'} disabled={disabled} />
        <ToolbarButton label="Rata tengah" icon={AlignCenter} command="justifyCenter" active={toolbar.align === 'center'} disabled={disabled} />
        <ToolbarButton label="Rata kanan" icon={AlignRight} command="justifyRight" active={toolbar.align === 'right'} disabled={disabled} />
        <ToolbarButton label="Rata kanan-kiri" icon={AlignJustify} command="justifyFull" active={toolbar.align === 'justify'} disabled={disabled} />

        <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />

        <ToolbarButton label="Sisipkan tautan" icon={Link2} action="link" disabled={disabled} />
        <ToolbarButton label="Garis pemisah" icon={Minus} command="insertHorizontalRule" disabled={disabled} />
        <ToolbarButton label="Hapus format" icon={RemoveFormatting} command="removeFormat" disabled={disabled} />
      </div>

      {/* ── Area tulis ── */}
      <div
        ref={editorRef}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-label="Isi berita"
        aria-disabled={disabled}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onPaste={handlePaste}
        onBlur={emit}
        className="rte-content rich-content news-editor-content flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 text-sm outline-none"
      />

      <div className="shrink-0 flex items-center justify-between gap-3 border-t border-[var(--border)]/70 bg-[var(--bg-secondary)]/40 px-4 py-2">
        <p className="text-[11px] text-[var(--text-muted)]">
          Pintasan: Ctrl/⌘ + B tebal · I miring · U garis bawah · Z urungkan
        </p>
        <p className="hidden text-[11px] text-[var(--text-muted)] sm:block">HTML aman · otomatis dibersihkan</p>
      </div>
    </div>
  )
}

/**
 * Tombol toolbar. Perintah dikirim lewat `data-command` dan ditangani satu
 * listener di kontainer toolbar (lihat `handleToolbarClick`), sehingga tidak
 * perlu closure per tombol.
 */
function ToolbarButton({
  label, icon: Icon, command, commandArg, action, active = false, disabled = false,
}: {
  label: string
  icon: typeof Bold
  command?: string
  commandArg?: string
  action?: string
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      data-command={command}
      data-command-arg={commandArg}
      data-action={action}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors',
        'hover:bg-white hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40',
        active && 'bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent)] hover:text-white',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
