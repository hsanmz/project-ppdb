import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import { TestimonialFormDialog } from '../admin/dashboard/testimonials/TestimonialFormDialog'
import AdminConfirm from '../components/ui/AdminConfirm'
import AdminToast from '../components/ui/AdminToast'
import type { FormState } from '../admin/dashboard/_types'
import { createItem, updateItem, uploadImage } from '@/app/lib/api'

vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return {
    ...actual,
    uploadImage: vi.fn(async () => 'https://cdn.example.com/wali.jpg'),
    createItem: vi.fn(async () => ({})),
    updateItem: vi.fn(async () => ({})),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const EMPTY_FORM: FormState = {
  name: '',
  child: '',
  order: '5',
  _c_quote: '',
  image: '',
}

function Harness({
  initial = EMPTY_FORM,
  onClose = vi.fn(),
  onSaved = vi.fn(),
}: {
  initial?: FormState
  onClose?: () => void
  onSaved?: () => void
}) {
  const [formData, setFormData] = useState<FormState>(initial)
  return (
    <>
      <AdminToast />
      <AdminConfirm />
      <TestimonialFormDialog
        mode="create"
        editingItem={null}
        formData={formData}
        setFormData={setFormData}
        onClose={onClose}
        onSaved={onSaved}
      />
    </>
  )
}

function fillRequired() {
  fireEvent.change(screen.getByLabelText(/nama wali santri/i), {
    target: { value: 'Bapak Ahmad Fauzi' },
  })
  fireEvent.change(screen.getByLabelText(/nama anak \/ santri/i), {
    target: { value: 'Muhammad Rizki' },
  })
}

describe('TestimonialFormDialog — judul & tata letak', () => {
  it('menampilkan judul tambah dan panduan kolom', () => {
    render(<Harness />)

    expect(screen.getByText('Tambah Testimoni')).toBeTruthy()
    expect(screen.getByText('Angka lebih kecil akan ditampilkan lebih dahulu.')).toBeTruthy()
    expect(screen.getByText('Testimoni tetap dapat ditampilkan tanpa foto.')).toBeTruthy()
  })
})

describe('TestimonialFormDialog — validasi', () => {
  it('mewajibkan nama wali dan nama santri lalu memfokuskan field pertama', async () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: /simpan testimoni/i }))

    expect(await screen.findByText('Nama wali santri wajib diisi.')).toBeTruthy()
    expect(screen.getByText('Nama anak / santri wajib diisi.')).toBeTruthy()
    await waitFor(() => {
      expect(document.activeElement).toBe(document.getElementById('testimonial-name'))
    })
    expect(createItem).not.toHaveBeenCalled()
  })

  it('menolak urutan desimal dan tidak menyimpan', async () => {
    render(<Harness />)

    fillRequired()
    fireEvent.change(screen.getByLabelText(/urutan tampilan/i), {
      target: { value: '1.5' },
    })
    fireEvent.click(screen.getByRole('button', { name: /simpan testimoni/i }))

    expect(
      await screen.findByText('Gunakan angka bulat 0 atau lebih, tanpa desimal atau tanda minus.'),
    ).toBeTruthy()
    expect(createItem).not.toHaveBeenCalled()
  })
})

describe('TestimonialFormDialog — penyimpanan', () => {
  it('menyimpan tanpa foto dan mengirim kontrak API yang benar', async () => {
    const onSaved = vi.fn()
    render(<Harness onSaved={onSaved} />)

    fillRequired()
    fireEvent.change(screen.getByLabelText(/kutipan testimoni/i), {
      target: { value: 'Anak saya lebih disiplin.\nTerima kasih.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /simpan testimoni/i }))

    await waitFor(() => expect(createItem).toHaveBeenCalledTimes(1))
    const [endpoint, payload] = vi.mocked(createItem).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(endpoint).toBe('/testimonials')
    expect(payload).toMatchObject({
      name: 'Bapak Ahmad Fauzi',
      child: 'Muhammad Rizki',
      order: 5,
      image: '',
    })
    expect(JSON.parse(String(payload.content))).toEqual({
      quote: 'Anak saya lebih disiplin.\nTerima kasih.',
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })
})

describe('TestimonialFormDialog — mode edit', () => {
  it('memakai endpoint update, kutipan lama, dan mempertahankan key content lain', async () => {
    function EditHarness() {
      const [formData, setFormData] = useState<FormState>({
        name: 'Bapak Ahmad Fauzi',
        child: 'Muhammad Rizki',
        order: '2',
        _c_quote: 'Kutipan lama',
        image: '/uploads/wali.jpg',
      })
      return (
        <>
          <AdminToast />
          <AdminConfirm />
          <TestimonialFormDialog
            mode="edit"
            editingItem={{
              id: 'testi-1',
              content: { text: 'Kutipan lama', badge: 'Alumni' },
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

    expect(screen.getByText('Edit Testimoni')).toBeTruthy()
    expect((screen.getByLabelText(/kutipan testimoni/i) as HTMLTextAreaElement).value).toBe('Kutipan lama')

    fireEvent.click(screen.getByRole('button', { name: /simpan perubahan/i }))

    await waitFor(() => expect(updateItem).toHaveBeenCalledTimes(1))
    const [endpoint, payload] = vi.mocked(updateItem).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(endpoint).toBe('/testimonials/testi-1')
    expect(payload.image).toBe('/uploads/wali.jpg')
    const content = JSON.parse(String(payload.content))
    expect(content).toEqual({ text: 'Kutipan lama', badge: 'Alumni', quote: 'Kutipan lama' })
    // Foto lama dipakai ulang, bukan diunggah ulang.
    expect(uploadImage).not.toHaveBeenCalled()
  })
})

describe('TestimonialFormDialog — perubahan belum disimpan', () => {
  it('meminta konfirmasi sebelum menutup form yang sudah diisi', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)

    fillRequired()
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
