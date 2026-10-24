import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import { CrudFormDialog } from '../admin/dashboard/CrudFormDialog'
import AdminConfirm from '../components/ui/AdminConfirm'
import AdminToast from '../components/ui/AdminToast'
import type { FormState } from '../admin/dashboard/_types'

// API tidak dipakai oleh test ini; semua interaksi berhenti di sisi klien.
// `importOriginal` dipakai supaya export lain (mis. fetch per tab) tetap ada.
vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return {
    ...actual,
    getStaff: vi.fn(async () => []),
    uploadImage: vi.fn(async () => 'https://cdn.example.com/gambar.jpg'),
    createItem: vi.fn(async () => ({})),
    updateItem: vi.fn(async () => ({})),
  }
})

afterEach(cleanup)

/** Form kosong untuk tab `hero`: field `order` kosong → wajib diisi. */
const EMPTY_FORM: FormState = {
  order: '',
  _c_label: '',
  _c_title: '',
  _c_subtitle: '',
  _c_button_label: '',
  _c_button_href: '',
  image: '',
  gallery: [],
}

/**
 * Harness dengan state sungguhan supaya `isDirty` di dalam dialog bereaksi
 * terhadap ketikan admin (dengan `setFormData` yang dimock, form tidak akan
 * pernah berubah).
 */
function Harness({ initial, onClose }: { initial: FormState; onClose: () => void }) {
  const [formData, setFormData] = useState<FormState>(initial)
  return (
    <>
      <AdminToast />
      <AdminConfirm />
      <CrudFormDialog
        mode="create"
        activeTab="hero"
        editingItem={null}
        formData={formData}
        setFormData={setFormData}
        onClose={onClose}
        onSaved={vi.fn()}
      />
    </>
  )
}

describe('CrudFormDialog — validasi per kolom', () => {
  it('menandai kolom kosong dan memfocus kolom pertama yang bermasalah', async () => {
    render(<Harness initial={EMPTY_FORM} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }))

    const message = await screen.findByText('Urutan Tampilan wajib diisi')
    expect(message).toBeTruthy()
    // Kolom yang bermasalah harus jadi fokus supaya admin langsung tahu di
    // mana harus men_cursor — bukan hanya membaca toast di pojok layar.
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(/Urutan Tampilan/i))
    })
  })

  it('menampilkan ringkasan lewat toast error', async () => {
    render(<Harness initial={EMPTY_FORM} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }))
    expect(await screen.findByText('Periksa lagi kolom yang ditandai merah.')).toBeTruthy()
  })

  it('label kolom terhubung dengan inputnya', () => {
    render(<Harness initial={EMPTY_FORM} onClose={vi.fn()} />)
    // Label tanpa `htmlFor` tidak bisa dicari lewat getByLabelText.
    expect(screen.getByLabelText(/Urutan Tampilan/i)).toBeTruthy()
  })
})

describe('CrudFormDialog — proteksi perubahan belum disimpan', () => {
  it('form yang belum disentuh bisa ditutup tanpa konfirmasi', async () => {
    const onClose = vi.fn()
    render(<Harness initial={EMPTY_FORM} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /batal/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(screen.queryByText('Perubahan belum disimpan')).toBeNull()
  })

  it('menanyakan konfirmasi sebelum membuang perubahan', async () => {
    const onClose = vi.fn()
    render(<Harness initial={EMPTY_FORM} onClose={onClose} />)

    // Admin mengetik → form jadi "berubah".
    fireEvent.change(screen.getByLabelText(/Urutan Tampilan/i), {
      target: { value: '2' },
    })

    // Indikator di footer memberi tahu status form.
    expect(await screen.findByText('Perubahan belum disimpan')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /batal/i }))

    // Dialog konfirmasi harus muncul, dan form belum boleh tertutup.
    expect(await screen.findByText('Perubahan belum disimpan', { selector: 'h3' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('menutup form setelah admin menyetujui membuang perubahan', async () => {
    const onClose = vi.fn()
    render(<Harness initial={EMPTY_FORM} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText(/Urutan Tampilan/i), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /batal/i }))

    const confirmButton = await screen.findByRole('button', { name: 'Buang Perubahan' })
    fireEvent.click(confirmButton)

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('form tetap terbuka bila admin membatalkan konfirmasi', async () => {
    const onClose = vi.fn()
    render(<Harness initial={EMPTY_FORM} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText(/Urutan Tampilan/i), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /batal/i }))

    const cancelButton = await screen.findByRole('button', { name: 'Kembali ke Form' })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Buang Perubahan' })).toBeNull()
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})

const EMPTY_NEWS_FORM: FormState = {
  category: '',
  date: '',
  status: 'published',
  _c_title: '',
  _c_slug: '',
  _c_author: '',
  _c_excerpt: '',
  _c_content: '',
  image: '',
  gallery: [],
}

function NewsHarness({ initial = EMPTY_NEWS_FORM, onClose = vi.fn() }: { initial?: FormState; onClose?: () => void }) {
  const [formData, setFormData] = useState<FormState>(initial)
  return (
    <>
      <AdminToast />
      <AdminConfirm />
      <CrudFormDialog
        mode="create"
        activeTab="news"
        editingItem={null}
        formData={formData}
        setFormData={setFormData}
        onClose={onClose}
        onSaved={vi.fn()}
      />
    </>
  )
}

describe('CrudFormDialog — modal berita & scroll independen', () => {
  it('merender modal berita dengan scroll independen kolom kiri dan kolom kanan', () => {
    const { container } = render(<NewsHarness />)

    // Kolom kiri: data pendukung + gambar + galeri
    const leftPane = container.querySelector('.news-scroll-pane')
    expect(leftPane).toBeTruthy()
    expect(leftPane?.className).toContain('overflow-y-auto')
    expect(leftPane?.className).toContain('overscroll-contain')

    // Komponen di dalam kolom kiri harus lengkap, termasuk Galeri Foto Berita
    expect(screen.getByText('Informasi Berita')).toBeTruthy()
    expect(screen.getByText('Publikasi')).toBeTruthy()
    expect(screen.getByText('Gambar Utama')).toBeTruthy()
    expect(screen.getByText('Galeri Foto Berita')).toBeTruthy()

    // Kolom kanan: editor berita
    expect(screen.getByText('Isi Berita')).toBeTruthy()

    // Toolbar editor harus tidak ikut scroll (shrink-0)
    const toolbar = container.querySelector('[aria-label="Format blok"]')?.closest('div')
    expect(toolbar).toBeTruthy()
    expect(toolbar?.className).toContain('shrink-0')

    // Area tulis editor berita memiliki scroll independen saat konten meluap
    const editorContent = container.querySelector('.news-editor-content')
    expect(editorContent).toBeTruthy()
    expect(editorContent?.className).toContain('overflow-y-auto')
    expect(editorContent?.className).toContain('overscroll-contain')
    expect(editorContent?.className).toContain('flex-1')

    // Footer editor harus tetap diam di bawah (shrink-0)
    const shortcutsHint = screen.getByText(/Pintasan: Ctrl\/⌘ \+ B tebal/i).closest('div')
    expect(shortcutsHint).toBeTruthy()
    expect(shortcutsHint?.className).toContain('shrink-0')
  })

  it('input galeri foto berita tersedia dan dapat menambah gambar via file/URL', async () => {
    render(<NewsHarness />)

    // Bagian galeri harus terlihat di DOM
    const galleryHeading = screen.getByText('Galeri Foto Berita')
    expect(galleryHeading).toBeTruthy()

    // Tersedia tombol file upload dan tombol URL
    expect(screen.getAllByRole('button', { name: /Upload/i }).length).toBeGreaterThan(0)
    const urlButtons = screen.getAllByRole('button', { name: /URL/i })
    expect(urlButtons.length).toBeGreaterThan(0)

    // Toggle ke mode URL pada input galeri (tombol URL terakhir)
    fireEvent.click(urlButtons[urlButtons.length - 1])
    expect(screen.getByPlaceholderText('https://example.com/image.jpg')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Tambah galeri/i })).toBeTruthy()
  })
})
