import { describe, it, expect, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

import { SocialLinkList } from '../admin/dashboard/social/SocialLinkList'
import AdminConfirm from '../components/ui/AdminConfirm'
import AdminToast from '../components/ui/AdminToast'
import type { RowRecord } from '../admin/dashboard/_types'
import { SOCIAL_PRESETS } from '../admin/dashboard/_constants'

// API tidak dipakai list ini; delete berhenti di callback `onDelete`.
vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return { ...actual, deleteItem: vi.fn(async () => ({ message: 'Deleted' })) }
})

afterEach(cleanup)

const INSTAGRAM_PRESET = SOCIAL_PRESETS.find((p) => p.label === 'Instagram')!
const YOUTUBE_PRESET = SOCIAL_PRESETS.find((p) => p.label === 'YouTube')!

const ROWS: RowRecord[] = [
  {
    id: 'ig-row',
    label: 'Instagram Resmi',
    href: 'https://instagram.com/ptdarrahman',
    path: INSTAGRAM_PRESET.path,
  },
  // Entri dengan ikon kustom (bukan preset) dan URL kosong.
  {
    id: 'kw-row',
    label: 'Kanal Sekolah',
    href: '',
    path: 'M2 2L20 20',
  },
]

function Harness({ items = ROWS, canCrud = true, onDelete = vi.fn() }: {
  items?: RowRecord[]
  canCrud?: boolean
  onDelete?: (item: RowRecord) => void
}) {
  return (
    <>
      <AdminToast />
      <AdminConfirm />
      <SocialLinkList
        items={items}
        canCrud={canCrud}
        detailLoading={null}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    </>
  )
}

describe('SocialLinkList — tampilan baris', () => {
  it('menampilkan label, platform, URL, dan peringatan URL kosong', () => {
    render(<Harness />)

    // Label baris (bukan badge — badge memakai nama preset).
    expect(screen.getByText('Instagram Resmi')).toBeTruthy()
    expect(screen.getByText('Kanal Sekolah')).toBeTruthy()
    // Indikator platform: preset dikenali dari path, path kustom diberi label lain.
    expect(screen.getByText('Instagram')).toBeTruthy()
    expect(screen.getByText('Ikon Kustom')).toBeTruthy()
    // URL ditampilkan apa adanya (keseluruhan, lalu CSS yang memotong visual).
    expect(screen.getByText('https://instagram.com/ptdarrahman')).toBeTruthy()
    // Peringatan untuk entri tanpa URL (tidak akan tampil di situs publik).
    expect(screen.getByText(/URL kosong/)).toBeTruthy()
  })

  it('path yang tidak valid memakai ikon fallback — tidak crash', () => {
    render(
      <Harness items={[{ id: 'x', label: 'Rusak', href: '', path: '<script>' }]} />,
    )
    expect(screen.getByText('Rusak')).toBeTruthy()
    expect(screen.getByText('Ikon Kustom')).toBeTruthy()
  })

  it('canCrud=false menyembunyikan Edit/Hapus (hanya lihat/salin/buka)', () => {
    render(<Harness canCrud={false} />)
    expect(screen.queryByRole('button', { name: 'Edit Instagram Resmi' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Hapus Instagram Resmi' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Salin tautan Instagram Resmi' })).toBeTruthy()
  })
})

describe('SocialLinkList — salin & buka URL', () => {
  const writeText = vi.fn(async () => {})
  beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  })
  afterAll(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  })

  it('klik tulisan URL menyalin nilai aslinya & toast sukses', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByTitle('https://instagram.com/ptdarrahman — klik untuk menyalin'))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://instagram.com/ptdarrahman'))
    expect(await screen.findByText('URL disalin ke clipboard')).toBeTruthy()
  })

  it('tombol Buka membuka URL di tab baru dengan noopener', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Buka tautan Instagram Resmi di tab baru' }))
    expect(openSpy).toHaveBeenCalledWith(
      'https://instagram.com/ptdarrahman',
      '_blank',
      'noopener,noreferrer',
    )
    openSpy.mockRestore()
  })
})

describe('SocialLinkList — hapus dengan konfirmasi', () => {
  it('menghapus setelah admin menyetujui dialog konfirmasi', async () => {
    const onDelete = vi.fn()
    render(<Harness onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hapus Instagram Resmi' }))
    // Dialog menyebut tautan yang akan dihapus agar tidak salah baris.
    expect(await screen.findByText('Hapus Tautan Sosial')).toBeTruthy()
    expect(screen.getByText(/Yakin ingin menghapus/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ya, Hapus' }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(ROWS[0]))
  })

  it('batal konfirmasi tidak menghapus apa pun', async () => {
    const onDelete = vi.fn()
    render(<Harness onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hapus Instagram Resmi' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Batal' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Ya, Hapus' })).toBeNull()
    })
    expect(onDelete).not.toHaveBeenCalled()
  })
})

describe('SocialLinkList — identifikasi platform', () => {
  it('badge platform mengikuti data path aktual, bukan nama label', () => {
    render(
      <Harness
        items={[{ id: 'yt', label: 'Nama Kustom', href: 'https://youtube.com/@x', path: YOUTUBE_PRESET.path }]}
      />,
    )
    // Label kustom, tapi platform tetap dikenali dari path ikonnya.
    expect(screen.getByText('Nama Kustom')).toBeTruthy()
    expect(screen.getByText('YouTube')).toBeTruthy()
  })
})
