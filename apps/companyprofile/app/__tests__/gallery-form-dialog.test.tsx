import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import { GalleryFormDialog } from '../admin/dashboard/gallery/GalleryFormDialog'
import AdminConfirm from '../components/ui/AdminConfirm'
import AdminToast from '../components/ui/AdminToast'
import type { FormState, RowRecord } from '../admin/dashboard/_types'
import { createItem, updateItem, uploadImage } from '@/app/lib/api'

vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return {
    ...actual,
    uploadImage: vi.fn(async () => 'https://cdn.example.com/foto-uploaded.jpg'),
    createItem: vi.fn(async () => ({})),
    updateItem: vi.fn(async () => ({})),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const EMPTY_GALLERY_FORM: FormState = {
  category: '',
  image: '',
  _c_title: '',
  _c_desc: '',
}

function Harness({
  initial = EMPTY_GALLERY_FORM,
  mode = 'create',
  editingItem = null,
  onClose = vi.fn(),
  onSaved = vi.fn(),
}: {
  initial?: FormState
  mode?: 'create' | 'edit'
  editingItem?: RowRecord | null
  onClose?: () => void
  onSaved?: () => void
}) {
  const [formData, setFormData] = useState<FormState>(initial)
  return (
    <>
      <AdminToast />
      <AdminConfirm />
      <GalleryFormDialog
        mode={mode}
        activeTab="gallery"
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        onClose={onClose}
        onSaved={onSaved}
      />
    </>
  )
}

function pickCategory(name: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: /^kategori$/i }))
  // Anchor di awal supaya tombol footer "Pilih Lainnya" tidak ikut ke-point.
  fireEvent.click(screen.getByRole('button', { name }))
}

describe('GalleryFormDialog — render', () => {
  it('merender modal tambah dengan header tetap dan dua kolom mandiri', () => {
    render(<Harness />)

    expect(screen.getByText('Tambah Foto Galeri')).toBeInTheDocument()
    expect(screen.getByText('Tambahkan dokumentasi kegiatan dan informasi foto.')).toBeInTheDocument()

    // Kolom kiri (informasi)
    expect(screen.getByRole('button', { name: /^kategori$/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Judul Foto/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Deskripsi Foto/i)).toBeInTheDocument()

    // Kolom kanan (gambar)
    expect(screen.getByText(/Tarik & lepas foto di sini/i)).toBeInTheDocument()

    // Footer
    expect(screen.getByRole('button', { name: /Simpan Foto/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Batal/i })).toBeInTheDocument()
  })

  it('merender modal edit dengan data terisi dan tombol Simpan Perubahan', () => {
    const existing: RowRecord = {
      id: 'gal-1',
      category: 'Kegiatan Santri',
      image: 'https://cdn.example.com/foto-lama.jpg',
      content: {
        title: 'Santri Belajar Tahfidz',
        desc: 'Sesi hafalan sore di asrama',
      },
    }
    const editForm: FormState = {
      category: 'Kegiatan Santri',
      image: 'https://cdn.example.com/foto-lama.jpg',
      _c_title: 'Santri Belajar Tahfidz',
      _c_desc: 'Sesi hafalan sore di asrama',
    }

    render(<Harness mode="edit" editingItem={existing} initial={editForm} />)

    expect(screen.getByText('Edit Foto Galeri')).toBeInTheDocument()
    expect(screen.getByText('Perbarui informasi dan gambar dokumentasi.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Judul Foto/i)).toHaveValue('Santri Belajar Tahfidz')
    expect(screen.getByLabelText(/Deskripsi Foto/i)).toHaveValue('Sesi hafalan sore di asrama')
    expect(
      screen.getByRole('button', { name: /Simpan Perubahan/i }),
    ).toBeInTheDocument()
  })
})

describe('GalleryFormDialog — validasi', () => {
  it('mewajibkan kategori dan menghindari submit ganda', async () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: /Simpan Foto/i }))
    fireEvent.click(screen.getByRole('button', { name: /Simpan Foto/i }))

    expect(await screen.findByText('Kategori wajib dipilih.')).toBeTruthy()
    await waitFor(() => expect(createItem).not.toHaveBeenCalled())
  })

  it('memvalidasi URL gambar sebelum menyimpan', async () => {
    render(<Harness initial={{ ...EMPTY_GALLERY_FORM, category: 'Kegiatan Santri' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'URL' }))
    fireEvent.change(screen.getByLabelText('URL gambar'), {
      target: { value: 'bukan-url' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Simpan Foto/i }))

    expect(await screen.findByText('URL gambar tidak valid.')).toBeTruthy()
    expect(createItem).not.toHaveBeenCalled()
  })
})

describe('GalleryFormDialog — penyimpanan', () => {
  it('mengirim kategori, gambar, dan konten sesuai kontrak API', async () => {
    const onClose = vi.fn()
    const onSaved = vi.fn()

    render(
      <Harness
        initial={{
          category: '',
          image: '',
          _c_title: '',
          _c_desc: '',
        }}
        onClose={onClose}
        onSaved={onSaved}
      />,
    )

    pickCategory(/^Kegiatan Akademik/i)
    fireEvent.change(screen.getByLabelText(/Judul Foto/i), {
      target: { value: 'Santri Ujian Matematika' },
    })
    fireEvent.change(screen.getByLabelText(/Deskripsi Foto/i), {
      target: { value: 'Kelas pagi di ruang belajar utama.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Simpan Foto/i }))

    await waitFor(() => expect(createItem).toHaveBeenCalledTimes(1))
    const [endpoint, payload] = vi.mocked(createItem).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(endpoint).toBe('/gallery')
    expect(payload.category).toBe('Kegiatan Akademik')
    expect(payload.image).toBe('')
    expect(JSON.parse(payload.content as string)).toEqual({
      title: 'Santri Ujian Matematika',
      desc: 'Kelas pagi di ruang belajar utama.',
    })
    expect(onClose).toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalled()
  })

  it('memakai endpoint edit saat mode edit', async () => {
    const existing: RowRecord = {
      id: 'gal-42',
      category: 'Kegiatan Santri',
      image: '',
      content: { title: 'Lama', desc: '' },
    }
    render(
      <Harness
        mode="edit"
        editingItem={existing}
        initial={{
          category: 'Kegiatan Santri',
          image: '',
          _c_title: 'Baru',
          _c_desc: '',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/i }))

    await waitFor(() => expect(updateItem).toHaveBeenCalledTimes(1))
    const [endpoint, payload] = vi.mocked(updateItem).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(endpoint).toBe('/gallery/gal-42')
    expect(payload.category).toBe('Kegiatan Santri')
    expect(JSON.parse(payload.content as string).title).toBe('Baru')
  })

  it('menyimpan kategori kustom (Lainnya) apa adanya', async () => {
    render(<Harness initial={{ ...EMPTY_GALLERY_FORM }} />)

    pickCategory(/^Lainnya/i)
    const customInput = screen.getByLabelText(/Kategori Lainnya/i)
    fireEvent.change(customInput, { target: { value: 'Pelepasan Santri' } })
    fireEvent.click(screen.getByRole('button', { name: /Simpan Foto/i }))

    await waitFor(() => expect(createItem).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(createItem).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(payload.category).toBe('Pelepasan Santri')
  })
})

describe('GalleryFormDialog — gambar', () => {
  it('mengunggah berkas, mempratinjau, dan menyimpan URL hasil upload', async () => {
    render(<Harness initial={{ ...EMPTY_GALLERY_FORM, category: 'Kegiatan Santri' }} />)

    const file = new File(['data'], 'kegiatan.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.getByTitle('https://cdn.example.com/foto-uploaded.jpg')).toBeTruthy(),
    )

    fireEvent.click(screen.getByRole('button', { name: /Simpan Foto/i }))
    await waitFor(() => expect(createItem).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(createItem).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(payload.image).toBe('https://cdn.example.com/foto-uploaded.jpg')
  })
})

describe('GalleryFormDialog — anti kehilangan data', () => {
  it('meminta konfirmasi ketika tombol Batal ditekan jika ada perubahan yang belum disimpan', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)

    fireEvent.change(screen.getByLabelText(/Judul Foto/i), {
      target: { value: 'Judul Baru' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Batal/i }))

    // Judul dialog konfirmasi memakai <h3>; footer modal juga menampilkan
    // kalimat serupa, jadi selektor harus dispesifikkan.
    await waitFor(() => {
      expect(
        screen.getByText('Perubahan belum disimpan', { selector: 'h3' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Buang Perubahan' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Buang Perubahan' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('menutup langsung tanpa konfirmasi ketika form tidak berubah', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /Batal/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
