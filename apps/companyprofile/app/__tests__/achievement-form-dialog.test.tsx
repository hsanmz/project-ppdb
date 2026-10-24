import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import { AchievementFormDialog } from '../admin/dashboard/achievements/AchievementFormDialog'
import AdminConfirm from '../components/ui/AdminConfirm'
import AdminToast from '../components/ui/AdminToast'
import type { FormState, RowRecord } from '../admin/dashboard/_types'
import { createItem } from '@/app/lib/api'

vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return {
    ...actual,
    uploadImage: vi.fn(async () => 'https://cdn.example.com/sertifikat-uploaded.jpg'),
    createItem: vi.fn(async () => ({})),
    updateItem: vi.fn(async () => ({})),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const EMPTY_ACHIEVEMENT_FORM: FormState = {
  year: 2026,
  image: '',
  _c_title: '',
  _c_desc: '',
  _c_scope: '',
}

function Harness({
  initial = EMPTY_ACHIEVEMENT_FORM,
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
      <AchievementFormDialog
        mode={mode}
        activeTab="achievements"
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        onClose={onClose}
        onSaved={onSaved}
      />
    </>
  )
}

describe('AchievementFormDialog UI & Behavior', () => {
  it('merender modal pembuatan prestasi dengan header dan dua kolom mandiri', () => {
    render(<Harness mode="create" />)

    expect(screen.getByText('Tambah Prestasi')).toBeInTheDocument()
    expect(screen.getByText('Catat pencapaian dan dokumentasi prestasi institusi.')).toBeInTheDocument()

    // Kolom kiri (data)
    expect(screen.getByLabelText(/Tahun Prestasi/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Judul Prestasi/i)).toBeInTheDocument()
    expect(screen.getByText(/Tingkat \/ Lingkup Prestasi/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Deskripsi Prestasi/i)).toBeInTheDocument()

    // Kolom kanan (gambar sertifikat)
    expect(screen.getByText(/Tarik & Lepas Sertifikat di Sini/i)).toBeInTheDocument()
    expect(screen.getByText(/Tegak \(Portrait\) & Mendatar \(Landscape\)/i)).toBeInTheDocument()

    // Footer
    expect(screen.getByRole('button', { name: /Simpan Prestasi/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Batal/i })).toBeInTheDocument()
  })

  it('merender modal edit dengan data terisi dan judul Edit Prestasi', () => {
    const existing: RowRecord = {
      id: 'ach-123',
      year: 2024,
      image: 'https://cdn.example.com/sertifikat-lama.jpg',
      content: {
        title: 'Juara 1 Tahfidz 30 Juz Nasional',
        desc: 'MTQ Nasional ke-30',
        scope: 'Nasional',
      },
    }

    const editForm: FormState = {
      year: 2024,
      image: 'https://cdn.example.com/sertifikat-lama.jpg',
      _c_title: 'Juara 1 Tahfidz 30 Juz Nasional',
      _c_desc: 'MTQ Nasional ke-30',
      _c_scope: 'Nasional',
    }

    render(<Harness mode="edit" editingItem={existing} initial={editForm} />)

    expect(screen.getByText('Edit Prestasi')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Juara 1 Tahfidz 30 Juz Nasional')).toBeInTheDocument()
    expect(screen.getByDisplayValue('MTQ Nasional ke-30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Simpan Perubahan/i })).toBeInTheDocument()
  })

  it('memvalidasi tahun jika dikosongkan dan menampilkan pesan error', async () => {
    render(<Harness initial={{ ...EMPTY_ACHIEVEMENT_FORM, year: '' }} />)

    const saveButton = screen.getByRole('button', { name: /Simpan Prestasi/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getAllByText(/Tahun prestasi wajib diisi/i).length).toBeGreaterThan(0)
    })
    expect(createItem).not.toHaveBeenCalled()
  })

  it('memilih tingkat prestasi dari daftar baku secara instan', async () => {
    render(<Harness />)

    const scopeRadio = screen.getByRole('radio', { name: /Internasional/i })
    fireEvent.click(scopeRadio)

    expect(scopeRadio).toHaveAttribute('aria-checked', 'true')
  })

  it('menampilkan kolom isian kustom ketika opsi Lainnya dipilih', async () => {
    render(<Harness />)

    const otherRadio = screen.getByRole('radio', { name: /Lainnya/i })
    fireEvent.click(otherRadio)

    const customInput = screen.getByPlaceholderText(/Contoh: Se-Jawa & Bali/i)
    expect(customInput).toBeInTheDocument()

    fireEvent.change(customInput, { target: { value: 'Tingkat ASEAN' } })
    expect(customInput).toHaveValue('Tingkat ASEAN')
  })

  it('menyimpan data berhasil saat form valid dikirim', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()

    render(
      <Harness
        initial={{
          year: 2026,
          _c_title: 'Juara 1 Pidato Bahasa Arab',
          _c_desc: 'Pondok Modern Gontor',
          _c_scope: 'Nasional',
          image: '',
        }}
        onSaved={onSaved}
        onClose={onClose}
      />,
    )

    const saveButton = screen.getByRole('button', { name: /Simpan Prestasi/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(createItem).toHaveBeenCalledWith(
        '/achievements',
        expect.objectContaining({
          year: 2026,
          image: '',
        }),
      )
      expect(onClose).toHaveBeenCalled()
      expect(onSaved).toHaveBeenCalled()
    })
  })

  it('meminta konfirmasi ketika tombol Batal ditekan jika ada perubahan yang belum disimpan', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)

    // Ubah nilai input untuk membuat form dirty
    const titleInput = screen.getByLabelText(/Judul Prestasi/i)
    fireEvent.change(titleInput, { target: { value: 'Juara Baru' } })

    const cancelButton = screen.getByRole('button', { name: /Batal/i })
    fireEvent.click(cancelButton)

    // Konfirmasi pembatalan muncul
    await waitFor(() => {
      expect(screen.getAllByText(/Perubahan belum disimpan/i).length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /Buang Perubahan/i })).toBeInTheDocument()
    })

    // Klik buang perubahan
    fireEvent.click(screen.getByRole('button', { name: /Buang Perubahan/i }))
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })
})
