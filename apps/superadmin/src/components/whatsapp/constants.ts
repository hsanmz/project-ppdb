export type LoginMethod = 'qr' | 'phone'

export const LOG_STATUSES = ['', 'sent', 'queued', 'failed', 'invalid_number'] as const

export function formatWhatsAppStatus(status: string): string {
  switch ((status || '').toLowerCase()) {
    case 'sent':
      return 'Terkirim'
    case 'queued':
      return 'Antrean'
    case 'failed':
      return 'Gagal'
    case 'invalid_number':
      return 'Nomor Tidak Valid'
    default:
      return status ? status.replaceAll('_', ' ').toUpperCase() : 'Semua Status'
  }
}
