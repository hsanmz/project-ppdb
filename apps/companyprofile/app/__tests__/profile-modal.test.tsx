import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import ProfileModal from '../components/ProfileModal'
import AdminConfirm from '../components/ui/AdminConfirm'
import AdminToast from '../components/ui/AdminToast'

vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return {
    ...actual,
    getMe: vi.fn(async () => ({
      id: 'u1',
      username: 'admin',
      email: 'admin@example.com',
      full_name: 'Adminilename',
      avatar_url: '',
      user_type: 'admin',
    })),
    updateProfile: vi.fn(async () => ({})),
    uploadImage: vi.fn(async () => 'https://cdn.example.com/avatar.jpg'),
  }
})

afterEach(cleanup)

function renderModal(onClose = vi.fn()) {
  render(
    <>
      <AdminToast />
      <AdminConfirm />
      <ProfileModal open onClose={onClose} />
    </>,
  )
  return onClose
}

describe('ProfileModal — proteksi perubahan belum disimpan', () => {
  it('menampilkan form profil yang termuat', async () => {
    renderModal()
    await waitFor(() => expect(screen.getByLabelText(/username/i)).toBeTruthy())
    expect((screen.getByLabelText(/username/i) as HTMLInputElement).value).toBe('admin')
  })

  it('form yang belum disentuh bisa ditutup tanpa konfirmasi', async () => {
    const onClose = renderModal()
    await waitFor(() => expect(screen.getByLabelText(/username/i)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /batal/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Buang Perubahan' })).toBeNull()
  })

  it('menanyakan konfirmasi sebelum membuang isian yang belum disimpan', async () => {
    const onClose = renderModal()
    await waitFor(() => expect(screen.getByLabelText(/username/i)).toBeTruthy())

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'admin-baru' },
    })

    expect(await screen.findByText('Perubahan belum disimpan')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /batal/i }))

    expect(await screen.findByRole('button', { name: 'Buang Perubahan' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('password yang diketik tidak hilang diam-diam', async () => {
    const onClose = renderModal()
    await waitFor(() => expect(screen.getByLabelText(/^password baru$/i)).toBeTruthy())

    fireEvent.change(screen.getByLabelText(/^password baru$/i), {
      target: { value: 'rahasia-kuat-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /batal/i }))

    // Konfirmasi muncul, jadi isian tidak hilang tanpa news.
    expect(await screen.findByRole('button', { name: 'Buang Perubahan' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('menandai kolom yang kosong dan memfocus kolom pertama', async () => {
    renderModal()
    await waitFor(() => expect(screen.getByLabelText(/nama lengkap/i)).toBeTruthy())

    fireEvent.change(screen.getByLabelText(/nama lengkap/i), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }))

    expect(await screen.findByText('Nama lengkap wajib diisi')).toBeTruthy()
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(/nama lengkap/i))
    })
  })

  it('menandai konfirmasi password yang tidak cocok', async () => {
    renderModal()
    await waitFor(() => expect(screen.getByLabelText(/^password baru$/i)).toBeTruthy())

    fireEvent.change(screen.getByLabelText(/^password baru$/i), {
      target: { value: 'rahasia-kuat-123' },
    })
    fireEvent.change(screen.getByLabelText(/konfirmasi password baru/i), {
      target: { value: 'beda-sama' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }))

    expect(await screen.findByText('Konfirmasi password tidak cocok')).toBeTruthy()
  })
})
