import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import { SocialFormDialog } from '../admin/dashboard/social/SocialFormDialog'
import AdminConfirm from '../components/ui/AdminConfirm'
import AdminToast from '../components/ui/AdminToast'
import type { FormState } from '../admin/dashboard/_types'
import { SOCIAL_PRESETS } from '../admin/dashboard/_constants'

const INSTAGRAM_PRESET = SOCIAL_PRESETS.find((p) => p.label === 'Instagram')!
const FACEBOOK_PRESET = SOCIAL_PRESETS.find((p) => p.label === 'Facebook')!

vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return {
    ...actual,
    createItem: vi.fn(async () => ({})),
    updateItem: vi.fn(async () => ({})),
  }
})

import { createItem, updateItem } from '@/app/lib/api'

afterEach(cleanup)

const EMPTY_SOCIAL_FORM: FormState = {
  label: '',
  href: '',
  path: '',
  image: '',
  gallery: [],
}

function SocialHarness({
  initial = EMPTY_SOCIAL_FORM,
  mode = 'create',
  onClose = vi.fn(),
}: {
  initial?: FormState
  mode?: 'create' | 'edit'
  onClose?: () => void
}) {
  // State sungguhan supaya isDirty & semua perubahan analisis preset bekerja.
  const [formData, setFormData] = useState<FormState>(initial)
  return (
    <>
      <AdminToast />
      <AdminConfirm />
      <SocialFormDialog
        mode={mode}
        activeTab="social"
        editingItem={mode === 'edit' ? { id: 'social-1' } : null}
        formData={formData}
        setFormData={setFormData}
        onClose={onClose}
        onSaved={vi.fn()}
      />
    </>
  )
}

describe('SocialFormDialog — pemilihan preset ikon', () => {
  it('memilih preset mengisi path + label otomatis', () => {
    render(<SocialHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'Gunakan ikon Instagram' }))

    // Label otomatis terisi (nilainya, bukan penimpaan tersembunyi).
    const labelInput = screen.getByLabelText(/Label Platform/i) as HTMLInputElement
    expect(labelInput.value).toBe('Instagram')

    const hrefInput = screen.getByLabelText(/URL Profil/i) as HTMLInputElement
    expect(hrefInput.placeholder).toContain('instagram.com')

    // Selected state pada tombol preset.
    expect(screen.getByRole('button', { name: 'Gunakan ikon Instagram' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('label kustom tidak ditimpa preset — tersedia aksi eksplisit utk memakai nama preset', () => {
    render(<SocialHarness initial={{ ...EMPTY_SOCIAL_FORM, label: 'Kanal Video Kajian' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Gunakan ikon YouTube' }))

    const labelInput = screen.getByLabelText(/Label Platform/i) as HTMLInputElement
    expect(labelInput.value).toBe('Kanal Video Kajian')
    // Tawaran eksplisit, bukan penimpaan diam-diam.
    expect(screen.getByText('Label kustom dipertahankan.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Gunakan “YouTube”' }))
    expect(labelInput.value).toBe('YouTube')
  })

  it('teks helper URL mengikuti platform yang dipilih', () => {
    render(<SocialHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Gunakan ikon TikTok' }))
    const hrefInput = screen.getByLabelText(/URL Profil/i) as HTMLInputElement
    // Placeholder + helper mengikuti preset aktif.
    expect(hrefInput.placeholder).toBe('https://tiktok.com/@username')
    expect(screen.getByText(/Contoh TikTok: https:\/\/tiktok\.com\/@username/)).toBeTruthy()
  })
})

describe('SocialFormDialog — SVG Path kustom', () => {
  it('membuka panel path kustom saat edit entri ber-path custom, dan format markup ditandai', () => {
    render(
      <SocialHarness
        mode="edit"
        initial={{ ...EMPTY_SOCIAL_FORM, label: 'Custom', href: 'https://x.co', path: 'M2 2L20 20' }}
      />,
    )

    // Badge "Kustom" + panel terbuka otomatis.
    expect(screen.getAllByText('Kustom').length).toBeGreaterThan(0)
    const pathInput = screen.getByLabelText(/SVG Path ikon kustom/i) as HTMLTextAreaElement
    expect(pathInput.value).toBe('M2 2L20 20')

    // Nilai markup lengkap langsung diberi pesan yang membimbing.
    fireEvent.change(screen.getByLabelText(/SVG Path ikon kustom/i), {
      target: { value: '<svg><path d="M2 2"/></svg>' },
    })
    expect(screen.getByText(/Hapus rangka/)).toBeTruthy()
  })

  it('path kustom yang tertimpa preset bisa dipulihkan lewat notice', () => {
    render(
      <SocialHarness
        mode="edit"
        initial={{ ...EMPTY_SOCIAL_FORM, label: 'Custom', href: 'https://x.co', path: 'M2 2L20 20' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Gunakan ikon Instagram' }))
    expect(
      screen.getByText(/Path kustom tadi diganti dengan preset Instagram/),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Pulihkan' }))
    expect((screen.getByLabelText(/SVG Path ikon kustom/i) as HTMLTextAreaElement).value).toBe('M2 2L20 20')
  })
})

describe('SocialFormDialog — pratinjau live', () => {
  it('pratinjau menampilkan label, URL, dan ikon aktual', () => {
    render(
      <SocialHarness
        initial={{
          ...EMPTY_SOCIAL_FORM,
          label: 'Instagram Resmi',
          href: 'https://instagram.com/ptdarrahman',
          path: INSTAGRAM_PRESET.path,
        }}
      />,
    )

    expect(screen.getByText('Instagram Resmi')).toBeTruthy()
    expect(screen.getByText('https://instagram.com/ptdarrahman')).toBeTruthy()
    // Ringkasan ikon memakai nama preset (muncul di picker + ringkasan).
    expect(screen.getAllByText('Instagram').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Siap tampil di footer dan halaman Kontak.')).toBeTruthy()
  })

  it('entri tanpa URL menampilkan kesiapan yang belum tercapai', () => {
    render(
      <SocialHarness initial={{ ...EMPTY_SOCIAL_FORM, path: INSTAGRAM_PRESET.path }} />,
    )
    expect(screen.getByText(/URL kosong/)).toBeTruthy()
  })
})

describe('SocialFormDialog — validasi & simpan sesuai kontrak backend', () => {
  it('blok simpan ketika field wajib kosong, membimbing error kolomnya', async () => {
    render(<SocialHarness initial={{ ...EMPTY_SOCIAL_FORM, label: 'Instagram' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Tautan Sosial' }))

    expect(screen.getByText('URL wajib diisi — kolom ini menentukan tujuan ikon saat diklik.')).toBeTruthy()
    // Validasi path kosong juga di-trigger (toast ringkasan pasti muncul).
    expect(createItem).not.toHaveBeenCalled()
    expect(await screen.findByText('Periksa lagi kolom yang ditandai merah.')).toBeTruthy()
  })

  it('URL baru yang tidak valid ditolak sebelum menyentuh backend', async () => {
    render(<SocialHarness initial={{ ...EMPTY_SOCIAL_FORM, path: INSTAGRAM_PRESET.path, label: 'Instagram' }} />)

    fireEvent.change(screen.getByLabelText(/URL Profil/i), { target: { value: 'instagram.com/tanpa-skema' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Tautan Sosial' }))

    // Error URL muncul di field error DAN di pratinjau status — kedua-duanya
    // mengandung frasa kunci. Cukup ada minimal 1 kemunculan.
    const matches = screen.getAllByText((_content, el) =>
      el?.textContent?.includes('URL belum lengkap') ?? false,
    )
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(createItem).not.toHaveBeenCalled()
  })

  it('simpan payload HANYA {label, href, path} ke endpoint tab', async () => {
    render(
      <SocialHarness
        initial={{ ...EMPTY_SOCIAL_FORM, label: 'Facebook', path: FACEBOOK_PRESET.path }}
      />,
    )

    fireEvent.change(screen.getByLabelText(/URL Profil/i), {
      target: { value: 'https://facebook.com/ptdarrahman' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Tautan Sosial' }))

    await waitFor(() => {
      expect(createItem).toHaveBeenCalledWith('/social-links', {
        label: 'Facebook',
        href: 'https://facebook.com/ptdarrahman',
        path: FACEBOOK_PRESET.path,
      })
    })
  })

  it('mode edit memanggil updateItem dengan id entri', async () => {
    render(
      <SocialHarness
        mode="edit"
        initial={{ ...EMPTY_SOCIAL_FORM, label: 'GitHub', path: SOCIAL_PRESETS.find((p) => p.label === 'GitHub')!.path }}
      />,
    )

    fireEvent.change(screen.getByLabelText(/URL Profil/i), { target: { value: 'https://github.com/ptdarrahman' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }))

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith('/social-links/social-1', {
        label: 'GitHub',
        href: 'https://github.com/ptdarrahman',
        path: SOCIAL_PRESETS.find((p) => p.label === 'GitHub')!.path,
      })
    })
  })
})

describe('SocialFormDialog — proteksi perubahan belum disimpan', () => {
  it('menanyakan konfirmasi dulu sebelum membuang perubahan', async () => {
    const onClose = vi.fn()
    render(<SocialHarness onClose={onClose} />)

    fireEvent.change(screen.getByLabelText(/Label Platform/i), { target: { value: 'Instagram' } })
    expect(await screen.findByText('Perubahan belum disimpan')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(await screen.findByText('Perubahan belum disimpan', { selector: 'h3' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('form kosong yang belum disentuh langsung tertutup', async () => {
    const onClose = vi.fn()
    render(<SocialHarness onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})

describe('SocialFormDialog — layout dua kolom scroll independen', () => {
  it('header/footer fixed + kedua kolom punya area scroll masing-masing (md+)', () => {
    const { container } = render(<SocialHarness />)

    // Radix Portal merender ke document.body — query pakai body, bukan container.
    const panes = document.body.querySelectorAll('.social-form-pane')
    // Body wrapper + kolom kiri + kolom kanan (aside pratinjau).
    expect(panes.length).toBe(3)

    // Wrapper body: scrollable di mobile, dikunci (overflow-hidden) di md+.
    const bodyWrap = document.body.querySelector('.min-h-0.flex-1') as HTMLElement
    expect(bodyWrap?.className).toContain('overflow-y-auto')
    expect(bodyWrap?.className).toContain('md:overflow-hidden')

    const formPane = document.body.querySelector('.space-y-5') as HTMLElement
    expect(formPane?.className).toContain('md:overflow-y-auto')
    expect(formPane?.className).toContain('min-w-0')

    const previewPane = document.body.querySelector('aside') as HTMLElement
    expect(previewPane.className).toContain('md:overflow-y-auto')

    // DialogContent tidak boleh menggulir sendiri: header/footer tetap di tempat.
    const content = document.body.querySelector('[role="dialog"]') as HTMLElement
    expect(content.className).toContain('overflow-hidden')
    expect(content.className).toContain('flex-col')

    expect(screen.getByText('Platform & Tautan')).toBeTruthy()
    expect(screen.getByText('Ikon Sosial')).toBeTruthy()
  })
})
