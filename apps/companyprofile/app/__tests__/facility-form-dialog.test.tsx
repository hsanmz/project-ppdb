import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import { FacilityFormDialog } from '../admin/dashboard/facilities/FacilityFormDialog'
import AdminConfirm from '../components/ui/AdminConfirm'
import AdminToast from '../components/ui/AdminToast'
import type { FormState } from '../admin/dashboard/_types'
import { createItem, updateItem, uploadImage } from '@/app/lib/api'

vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return {
    ...actual,
    uploadImage: vi.fn(async () => 'https://cdn.example.com/gambar.jpg'),
    createItem: vi.fn(async () => ({})),
    updateItem: vi.fn(async () => ({})),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const EMPTY_FORM: FormState = {
  category: '',
  image: '',
  _c_name: '',
  _c_desc: '',
  _c_features: '',
}

function Harness({
  initial = EMPTY_FORM,
  onClose,
}: {
  initial?: FormState
  onClose: () => void
}) {
  const [formData, setFormData] = useState<FormState>(initial)
  return (
    <>
      <AdminToast />
      <AdminConfirm />
      <FacilityFormDialog
        mode="create"
        activeTab="facilities"
        editingItem={null}
        formData={formData}
        setFormData={setFormData}
        onClose={onClose}
        onSaved={vi.fn()}
      />
    </>
  )
}

function chooseCategory(name: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: /^kategori$/i }))
  fireEvent.click(screen.getByRole('button', { name }))
}

describe('FacilityFormDialog — validasi', () => {
  it('mewajibkan kategori dan memfokuskan pemilih kategori', async () => {
    render(<Harness onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /simpan fasilitas/i }))

    expect(await screen.findByText('Kategori wajib dipilih.')).toBeTruthy()
    await waitFor(() => {
      expect(document.activeElement).toBe(document.getElementById('facility-category'))
    })
    expect(createItem).not.toHaveBeenCalled()
  })

  it('menampilkan error URL gambar dan tidak menyimpan data', async () => {
    render(<Harness onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'URL' }))
    fireEvent.change(screen.getByLabelText('URL gambar'), {
      target: { value: 'bukan-url' },
    })

    expect(await screen.findByText('URL gambar tidak valid.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /simpan fasilitas/i }))

    expect(await screen.findByText('Kategori wajib dipilih.')).toBeTruthy()
    expect(createItem).not.toHaveBeenCalled()
  })
})

describe('FacilityFormDialog — penyimpanan', () => {
  it('mengirim kategori, konten, dan fitur sesuai kontrak API', async () => {
    render(<Harness onClose={vi.fn()} />)

    chooseCategory(/perpustakaan & literasi/i)
    fireEvent.change(screen.getByLabelText(/nama fasilitas/i), {
      target: { value: 'Perpustakaan Digital' },
    })
    fireEvent.change(screen.getByLabelText(/^deskripsi$/i), {
      target: { value: 'Lantai satu buku.\nLantai dua diskusi.' },
    })

    const suggestion = await screen.findByRole('button', { name: 'Rak Buku' })
    fireEvent.click(suggestion)
    expect(screen.getByRole('button', { name: 'Hapus fitur Rak Buku' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Rak Buku' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /simpan fasilitas/i }))

    await waitFor(() => expect(createItem).toHaveBeenCalledTimes(1))
    const [endpoint, payload] = vi.mocked(createItem).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(endpoint).toBe('/facilities')
    expect(payload.category).toBe('perpustakaan-literasi')
    expect(payload.image).toBe('')
    expect(Object.keys(payload).sort()).toEqual(['category', 'content', 'image'])

    const content = JSON.parse(String(payload.content))
    expect(content.name).toBe('Perpustakaan Digital')
    expect(content.desc).toBe('Lantai satu buku.\nLantai dua diskusi.')
    expect(content.features).toEqual(['Rak Buku'])
  })

  it('menolak fitur duplikat tanpa membedakan kapitalisasi', async () => {
    render(<Harness onClose={vi.fn()} />)

    const input = screen.getByLabelText(/fitur unggulan/i)
    fireEvent.change(input, { target: { value: 'AC' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('button', { name: 'Hapus fitur AC' })).toBeTruthy()

    fireEvent.change(input, { target: { value: 'ac' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByText('Fitur tersebut sudah ada di daftar.')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /hapus fitur ac/i })).toHaveLength(1)
  })
})

describe('FacilityFormDialog — perubahan belum disimpan', () => {
  it('meminta konfirmasi sebelum menutup form yang sudah diisi', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)

    fireEvent.change(screen.getByLabelText(/nama fasilitas/i), {
      target: { value: 'Aula Serbaguna' },
    })
    expect(await screen.findByText('Perubahan belum disimpan')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(await screen.findByText('Perubahan belum disimpan', { selector: 'h3' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Buang Perubahan' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('menutup langsung bila form belum disentuh', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(screen.queryByText('Perubahan belum disimpan')).toBeNull()
  })
})

describe('FacilityFormDialog — mode edit', () => {
  it('memakai endpoint update dan mempertahankan key content lama', async () => {
    const initial: FormState = {
      category: 'laboratorium',
      image: '/uploads/lab.jpg',
      _c_name: 'Lab Komputer',
      _c_desc: 'Dua belas unit.',
      _c_features: 'Komputer\nAC',
    }

    function EditHarness() {
      const [formData, setFormData] = useState<FormState>(initial)
      return (
        <>
          <AdminToast />
          <AdminConfirm />
          <FacilityFormDialog
            mode="edit"
            activeTab="facilities"
            editingItem={{
              id: 'fac-1',
              content: { nama_lama: 'Lab', kapasitas: 30 },
            }}
            formData={formData}
            setFormData={setFormData}
            onClose={vi.fn()}
            onSaved={vi.fn()}
          />
        </>
      )
    }

    render(<EditHarness />)

    expect(screen.getByText('Ubah Fasilitas')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /simpan perubahan/i }))

    await waitFor(() => expect(updateItem).toHaveBeenCalledTimes(1))
    const [endpoint, payload] = vi.mocked(updateItem).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(endpoint).toBe('/facilities/fac-1')
    const content = JSON.parse(String(payload.content))
    expect(content.kapasitas).toBe(30)
    expect(content.nama_lama).toBe('Lab')
    expect(content.name).toBe('Lab Komputer')
    expect(content.features).toEqual(['Komputer', 'AC'])
    // Upload tidak dipanggil: gambar lama tetap dipakai.
    expect(uploadImage).not.toHaveBeenCalled()
  })
})
