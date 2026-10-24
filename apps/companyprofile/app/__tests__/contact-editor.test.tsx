import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'

import { ContactEditor } from '../admin/dashboard/ContactEditor'
import AdminConfirm from '../components/ui/AdminConfirm'
import AdminToast from '../components/ui/AdminToast'
import { updateContactInfo } from '@/app/lib/api'
import type { RowRecord } from '../admin/dashboard/_types'

vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return {
    ...actual,
    updateContactInfo: vi.fn(async () => ({ id: 'row-1' })),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

const CONTACT: RowRecord = {
  id: 'row-1',
  phone_primary: '(021) 812-8361-2352',
  phone_secondary: '',
  whatsapp: '+62 812-8361-2352',
  email_primary: 'info@ptdarrahman.sch.id',
  email_admission: 'ppdb@ptdarrahman.sch.id',
  address: 'Rukan Hexa Green Kalimalang\nBekasi, Jawa Barat',
  office_hours: 'Senin–Jumat 08:00–15:00',
  maps_embed: '<iframe src="https://www.google.com/maps/embed?pb=ABC123" allowfullscreen></iframe>',
}

function Harness({ info, canCrud = true, onSave = vi.fn() }: {
  info?: RowRecord
  canCrud?: boolean
  onSave?: () => void
}) {
  return (
    <>
      <AdminToast />
      <AdminConfirm />
      <ContactEditor contactInfo={info} canCrud={canCrud} onSave={onSave} />
    </>
  )
}

describe('ContactEditor — data lama & akses', () => {
  it('menampilkan data tersimpan pada field yang tepat', () => {
    render(<Harness info={CONTACT} />)

    expect((screen.getByLabelText('Telepon Utama') as HTMLInputElement).value)
      .toBe('(021) 812-8361-2352')
    expect((screen.getByLabelText('WhatsApp') as HTMLInputElement).value)
      .toBe('+62 812-8361-2352')
    expect((screen.getByLabelText('Email Penerimaan (PPDB)') as HTMLInputElement).value)
      .toBe('ppdb@ptdarrahman.sch.id')
    expect((screen.getByLabelText('Jam Operasional Kantor') as HTMLInputElement).value)
      .toBe('Senin–Jumat 08:00–15:00')
    expect((screen.getByLabelText('Google Maps Embed') as HTMLInputElement).value)
      .toContain('pb=ABC123')
    expect((screen.getByLabelText(/alamat lengkap/i) as HTMLTextAreaElement).value)
      .toBe('Rukan Hexa Green Kalimalang\nBekasi, Jawa Barat')
  })

  it('mode lihat saja: form dinonaktifkan, tombol simpan TIDAK dirender', () => {
    render(<Harness info={CONTACT} canCrud={false} />)

    expect((screen.getByLabelText('Telepon Utama') as HTMLInputElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: /simpan sekarang/i })).not.toBeInTheDocument()
    expect(screen.getByText(/mode lihat saja/i)).toBeTruthy()
  })

  it('tanpa data (DB baru) tetap menyediakan form kosong', () => {
    render(<Harness info={undefined} />)

    expect(screen.getByText(/Belum ada email penerimaan/)).toBeTruthy()
    expect(screen.getByText('Lokasi belum dikonfigurasi')).toBeTruthy()
    expect(screen.getByText('Tersimpan')).toBeTruthy()
  })
})

describe('ContactEditor — pratinjau halaman publik', () => {
  it('pratinjau memakai nilai form secara live (tel:/wa.me/mailto:)', () => {
    render(<Harness info={CONTACT} />)

    expect(screen.getByRole('link', { name: '(021) 812-8361-2352' }).getAttribute('href'))
      .toBe('tel:02181283612352')
    expect(screen.getByRole('link', { name: '+62 812-8361-2352' }).getAttribute('href'))
      .toBe('https://wa.me/6281283612352')
    expect(screen.getByRole('link', { name: 'info@ptdarrahman.sch.id' }).getAttribute('href'))
      .toBe('mailto:info@ptdarrahman.sch.id')
  })

  it('field kosong ditampilkan "Belum diisi"', () => {
    render(<Harness info={{ id: 'row-1', phone_primary: '0211234' }} />)

    expect(screen.getAllByText('Belum diisi').length).toBeGreaterThan(0)
  })

  it('embed valid menampilkan status valid di Section E', () => {
    render(<Harness info={{
      id: 'row-1',
      address: 'Jl. Contoh 1',
      maps_embed: 'https://www.google.com/maps?q=Bekasi&output=embed',
    }} />)

    expect(screen.getByText(/Embed valid — peta muncul di pratinjau/i)).toBeTruthy()
  })
})

describe('ContactEditor — status pill & manual save', () => {
  it('status awal "Tersimpan" saat form clean', () => {
    render(<Harness info={CONTACT} />)
    expect(screen.getByText('Tersimpan')).toBeTruthy()
  })

  it('mengubah field → status "Perubahan belum disimpan"', () => {
    render(<Harness info={CONTACT} />)

    fireEvent.change(screen.getByLabelText('Telepon Utama'), {
      target: { value: '(021) 555-9090' },
    })

    expect(screen.getByText('Perubahan belum disimpan')).toBeTruthy()
  })

  it('manual save (klik tombol) → status berubah ke "Tersimpan"', async () => {
    render(<Harness info={CONTACT} />)

    fireEvent.change(screen.getByLabelText('Telepon Utama'), {
      target: { value: '(021) 555-9090' },
    })

    fireEvent.click(screen.getByRole('button', { name: /simpan sekarang/i }))

    await waitFor(() => expect(updateContactInfo).toHaveBeenCalledTimes(1), { timeout: 3000 })

    expect(screen.getByText(/Tersimpan/)).toBeTruthy()
    expect(screen.queryByText(/Tersimpan otomatis/)).not.toBeInTheDocument()
  }, 5000)

  it('validasi email invalid mencegah save (auto maupun manual)', async () => {
    render(<Harness info={CONTACT} />)

    fireEvent.change(screen.getByLabelText('Email Penerimaan (PPDB)'), {
      target: { value: 'bukan-email' },
    })

    // Coba manual save → harus ditolak
    fireEvent.click(screen.getByRole('button', { name: /simpan sekarang/i }))
    await waitFor(() => expect(screen.findByText(/format email tidak valid/i)).toBeTruthy(), { timeout: 2000 })
    expect(updateContactInfo).not.toHaveBeenCalled()

    // Perbaiki email → manual save harus berhasil
    fireEvent.change(screen.getByLabelText('Email Penerimaan (PPDB)'), {
      target: { value: 'valid@domain.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /simpan sekarang/i }))
    await waitFor(() => expect(updateContactInfo).toHaveBeenCalledTimes(1), { timeout: 3000 })
  }, 5000)
})

describe('ContactEditor — manual save validasi', () => {
  it('manual save menolak email invalid & memfokuskan field', async () => {
    render(<Harness info={CONTACT} />)

    fireEvent.change(screen.getByLabelText('Email Penerimaan (PPDB)'), {
      target: { value: 'bukan-email' },
    })
    fireEvent.click(screen.getByRole('button', { name: /simpan sekarang/i }))

    expect(await screen.findByText(/format email tidak valid/i)).toBeTruthy()
    await waitFor(() => {
      expect(document.activeElement).toBe(document.getElementById('contact-email_admission'))
    }, { timeout: 2000 })
    expect(updateContactInfo).not.toHaveBeenCalled()
  }, 5000)

  it('manual save menolak embed invalid (error muncul di field & pratinjau peta), nilai lain tetap', async () => {
    render(<Harness info={CONTACT} />)

    fireEvent.change(screen.getByLabelText('Google Maps Embed'), {
      target: { value: '<iframe src="https://evil.example.com/x"></iframe>' },
    })
    fireEvent.click(screen.getByRole('button', { name: /simpan sekarang/i }))

    const errors = await screen.findAllByText(/bukan URL Google Maps yang valid/i)
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(updateContactInfo).not.toHaveBeenCalled()
    expect((screen.getByLabelText('Telepon Utama') as HTMLInputElement).value)
      .toBe('(021) 812-8361-2352')
  }, 5000)
})

describe('ContactEditor — beforeunload guard', () => {
  it('memunculkan beforeunload saat ada perubahan belum di-save', () => {
    const handler = vi.fn()
    window.addEventListener('beforeunload', handler)
    render(<Harness info={CONTACT} />)

    fireEvent.change(screen.getByLabelText('Telepon Utama'), {
      target: { value: '(021) 555-9090' },
    })

    const event = new Event('beforeunload')
    Object.defineProperty(event, 'returnValue', { value: '', writable: true })
    window.dispatchEvent(event)

    expect(event.returnValue).toBe('Perubahan belum tersimpan ke server. Yakin ingin keluar?')
    expect(handler).toHaveBeenCalled()

    window.removeEventListener('beforeunload', handler)
  })

  it('TIDAK memunculkan beforeunload saat form tidak berubah', () => {
    const handler = vi.fn()
    window.addEventListener('beforeunload', handler)
    render(<Harness info={CONTACT} />)

    const event = new Event('beforeunload')
    Object.defineProperty(event, 'returnValue', { value: '', writable: true })
    window.dispatchEvent(event)

    expect(event.returnValue).toBe('')

    window.removeEventListener('beforeunload', handler)
  })
})

describe('ContactEditor — error handling', () => {
  it('manual save gagal (API error) → status "Gagal menyimpan", nilai form dipertahankan, tombol retry aktif', async () => {
    vi.mocked(updateContactInfo).mockImplementationOnce(async () => {
      throw new Error('API 500: Internal Server Error')
    })
    render(<Harness info={CONTACT} />)

    fireEvent.change(screen.getByLabelText('Telepon Kedua'), {
      target: { value: '+62 21 555 777' },
    })
    fireEvent.click(screen.getByRole('button', { name: /simpan sekarang/i }))

    await waitFor(() => expect(screen.getByText('Gagal menyimpan')).toBeTruthy(), { timeout: 3000 })
    // Error muncul di toast DAN status bar — pakai getAllByText
    expect(screen.getAllByText('API 500: Internal Server Error').length).toBeGreaterThanOrEqual(1)
    expect((screen.getByLabelText('Telepon Kedua') as HTMLInputElement).value)
      .toBe('+62 21 555 777')

    // Retry
    fireEvent.click(screen.getByRole('button', { name: /simpan sekarang/i }))
    expect(updateContactInfo).toHaveBeenCalledTimes(2)
  }, 5000)

  it('auto-save gagal (network error) → status "Gagal menyimpan", manual save retry berhasil', async () => {
    vi.mocked(updateContactInfo)
      .mockImplementationOnce(async () => { throw new Error('Network Error') })
      .mockImplementationOnce(async () => ({ id: 'row-1' }))
    render(<Harness info={CONTACT} />)

    fireEvent.change(screen.getByLabelText('Telepon Utama'), {
      target: { value: '(021) 555-9090' },
    })

    // Tunggu auto-save gagal (debounce + network)
    await waitFor(() => expect(screen.getByText('Gagal menyimpan')).toBeTruthy(), { timeout: 3000 })

    // Manual save retry → berhasil
    fireEvent.click(screen.getByRole('button', { name: /simpan sekarang/i }))
    await waitFor(() => expect(screen.getByText(/Tersimpan/)).toBeTruthy(), { timeout: 3000 })
  }, 5000)
})
