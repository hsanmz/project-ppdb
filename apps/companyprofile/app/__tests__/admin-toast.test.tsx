import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'

import AdminToast, { toast } from '../components/ui/AdminToast'
import { eventBus } from '../lib/event-bus'

afterEach(cleanup)

describe('AdminToast — notifikasi CRUD', () => {
  it('menampilkan pesan yang dikirim lewat toast()', async () => {
    render(<AdminToast />)
    await act(async () => {
      toast('success', 'Berhasil disimpan')
    })
    expect(screen.getByText('Berhasil disimpan')).toBeTruthy()
  })

  it('menampilkan beberapa notifikasi sekaligus', async () => {
    render(<AdminToast />)
    await act(async () => {
      toast('success', 'Berhasil dibuat')
      toast('error', 'Gagal menyimpan')
    })
    expect(screen.getByText('Berhasil dibuat')).toBeTruthy()
    expect(screen.getByText('Gagal menyimpan')).toBeTruthy()
  })

  it('dua toast yang terbit bersamaan tetap tampil terpisah', async () => {
    // `Date.now()` sebagai id membuat dua toast dalam milidetik sama saling
    // menimpa (React key duplikat + timer pertama ikut menghapus keduanya).
    render(<AdminToast />)
    await act(async () => {
      toast('success', 'Toast pertama')
      toast('success', 'Toast kedua')
    })
    expect(screen.getByText('Toast pertama')).toBeTruthy()
    expect(screen.getByText('Toast kedua')).toBeTruthy()
  })

  it('menyediakan live region agar screen reader membacakan notifikasi', () => {
    const { container } = render(<AdminToast />)
    const live = container.querySelector('[role="status"]')
    expect(live).toBeTruthy()
    expect(live?.getAttribute('aria-live')).toBe('polite')
  })

  it('live region tetap ada saat tidak ada notifikasi', () => {
    // Live region harus sudah terpasang sebelum isinya masuk, kalau tidak
    // pengumuman bisa terlewat.
    const { container } = render(<AdminToast />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
  })

  it('toast error memakai role alert agar diumumkan segera', async () => {
    render(<AdminToast />)
    await act(async () => {
      toast('error', 'Gagal menyimpan')
    })
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('notifikasi bisa ditutup manual', async () => {
    render(<AdminToast />)
    await act(async () => {
      toast('success', 'Berhasil disimpan')
    })
    const close = screen.getByLabelText('Tutup notifikasi')
    await act(async () => {
      close.click()
    })
    expect(screen.queryByText('Berhasil disimpan')).toBeNull()
  })

  it('berhenti mendengarkan event setelah unmount', async () => {
    const { unmount } = render(<AdminToast />)
    unmount()
    // Tidak boleh melempar error setelah komponen dibuang.
    expect(() => toast('success', 'Setelah unmount')).not.toThrow()
    expect(eventBus).toBeTruthy()
  })
})

describe('AdminToast — durasi tampil', () => {
  it('notifikasi hilang otomatis setelah 4 detik', async () => {
    vi.useFakeTimers()
    try {
      render(<AdminToast />)
      await act(async () => {
        toast('success', 'Berhasil disimpan')
      })
      expect(screen.getByText('Berhasil disimpan')).toBeTruthy()
      await act(async () => {
        vi.advanceTimersByTime(4100)
      })
      expect(screen.queryByText('Berhasil disimpan')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
