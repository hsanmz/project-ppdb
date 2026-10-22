import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadReceiptPdf } from './exportReceipt'
import { downloadLoaDoc } from './exportLoa'
import { downloadSkdPdf } from './exportSkd'
import {
  parseHealthData,
  formatHealthSummary,
  downloadApplicantFormDoc,
} from './exportApplicantForm'
import { downloadAssessmentDoc } from './exportAssessment'

// Mocks
const mockSave = vi.fn()
const mockAddPage = vi.fn()
const mockAddImage = vi.fn()

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation((config) => ({
      ...config,
      addPage: mockAddPage,
      addImage: mockAddImage,
      save: mockSave,
    })),
  }
})

vi.mock('html2canvas', () => {
  return {
    default: vi.fn().mockImplementation((element, options) => {
      if (options?.onclone) {
        const clonedDoc = document.implementation.createHTMLDocument()
        const clonedEl = element.cloneNode(true)
        clonedDoc.body.appendChild(clonedEl)
        options.onclone(clonedDoc, clonedEl)
      }
      const canvas = document.createElement('canvas')
      canvas.width = (options?.width || 800) * (options?.scale || 2)
      canvas.height = (options?.height || 600) * (options?.scale || 2)
      return Promise.resolve(canvas)
    }),
  }
})

describe('Export Pipeline Comprehensive Audit & Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue('data:image/png;base64,mockPngData')
  })

  describe('1. Kuitansi Resmi (exportReceipt)', () => {
    it('memastikan downloadReceiptPdf menjaga rasio proporsional dan kompresi lossless NONE', async () => {
      const container = document.createElement('div')
      Object.defineProperty(container, 'offsetWidth', { value: 672 })
      Object.defineProperty(container, 'offsetHeight', { value: 800 })
      container.getBoundingClientRect = vi.fn().mockReturnValue({ width: 672, height: 800 })

      await downloadReceiptPdf(container, 'Muhammad Abdullah', 'KUI-2026-001')

      // Cek bahwa addImage dipanggil dengan kompresi NONE (lossless)
      expect(mockAddImage).toHaveBeenCalledTimes(1)
      const callArgs = mockAddImage.mock.calls[0]
      expect(callArgs[1]).toBe('PNG')
      expect(callArgs[7]).toBe('NONE')

      // Cek bahwa targetW dan targetH proporsional: targetH = (800 * 180) / 672 = 214.28mm (muat dalam 267mm)
      const targetW = callArgs[4]
      const targetH = callArgs[5]
      expect(targetW).toBe(180)
      expect(targetH).toBeCloseTo((800 * 180) / 672, 1)

      // Margin harus terpusat
      const marginX = callArgs[2]
      const marginY = callArgs[3]
      expect(marginX).toBeCloseTo((210 - targetW) / 2, 1)
      expect(marginY).toBeCloseTo((297 - targetH) / 2, 1)

      expect(mockSave).toHaveBeenCalledWith('kuitansi-resmi-muhammad-abdullah-kui-2026-001.pdf')
    })

    it('menangani kartu kuitansi dengan konten sangat panjang tanpa distorsi gepeng', async () => {
      const container = document.createElement('div')
      // Rasio tinggi ekstrem (misal mobile snapshot 360 x 1200)
      Object.defineProperty(container, 'offsetWidth', { value: 360 })
      Object.defineProperty(container, 'offsetHeight', { value: 1200 })
      container.getBoundingClientRect = vi.fn().mockReturnValue({ width: 360, height: 1200 })

      await downloadReceiptPdf(container, 'Santri Baru', 'KUI-LONG')

      const callArgs = mockAddImage.mock.calls[0]
      const targetW = callArgs[4]
      const targetH = callArgs[5]

      // targetH tidak boleh melebihi maxH 267mm, dan targetW harus mengecil proporsional
      expect(targetH).toBe(267)
      expect(targetW).toBeCloseTo((360 * 267) / 1200, 1) // ~80.1mm
      // Rasio aspek targetW / targetH harus sama dengan 360 / 1200 = 0.3
      expect(targetW / targetH).toBeCloseTo(360 / 1200, 2)
    })
  })

  describe('2. Letter of Acceptance (exportLoa)', () => {
    it('mendukung pageMode filtering untuk PDF dan Image secara konsisten', async () => {
      const container = document.createElement('div')
      const page1 = document.createElement('div')
      page1.className = 'loa-page'
      page1.setAttribute('data-page', '1')
      const page2 = document.createElement('div')
      page2.className = 'loa-page'
      page2.setAttribute('data-page', '2')
      container.appendChild(page1)
      container.appendChild(page2)

      // Test downloadLoaDoc dengan pageMode: 1 pada format PDF
      await downloadLoaDoc({
        containerElement: container,
        format: 'pdf',
        applicantName: 'Ahmad Dahlan',
        registrationNo: 'REG-001',
        pageMode: 1,
      })

      // Hanya hal 1 yang diekspor (tanpa addPage)
      expect(mockAddPage).not.toHaveBeenCalled()
      expect(mockAddImage).toHaveBeenCalledTimes(1)
      expect(mockSave).toHaveBeenCalledWith('letter-of-acceptance-ahmad-dahlan-reg-001.pdf')
    })

    it('mengekspor kedua halaman saat pageMode "both"', async () => {
      const container = document.createElement('div')
      const page1 = document.createElement('div')
      page1.className = 'loa-page'
      page1.setAttribute('data-page', '1')
      const page2 = document.createElement('div')
      page2.className = 'loa-page'
      page2.setAttribute('data-page', '2')
      container.appendChild(page1)
      container.appendChild(page2)

      await downloadLoaDoc({
        containerElement: container,
        format: 'pdf',
        applicantName: 'Fatimah Az-Zahra',
        registrationNo: 'REG-002',
        pageMode: 'both',
      })

      expect(mockAddPage).toHaveBeenCalledTimes(1)
      expect(mockAddImage).toHaveBeenCalledTimes(2)
      expect(mockSave).toHaveBeenCalledWith('letter-of-acceptance-fatimah-az-zahra-reg-002.pdf')
    })
  })

  describe('3. Surat Keterangan Diterima (exportSkd)', () => {
    it('mengekspor sertifikat SKD ke A4 Landscape dengan background gelap #022c22', async () => {
      const el = document.createElement('div')
      Object.defineProperty(el, 'offsetWidth', { value: 1123 })
      Object.defineProperty(el, 'offsetHeight', { value: 794 })
      el.getBoundingClientRect = vi.fn().mockReturnValue({ width: 1123, height: 794 })

      await downloadSkdPdf(el, 'Zaid bin Tsabit', 'REG-SKD-01')

      expect(mockAddImage).toHaveBeenCalledWith(
        'data:image/png;base64,mockPngData',
        'PNG',
        0,
        0,
        297,
        210,
        undefined,
        'NONE'
      )
      expect(mockSave).toHaveBeenCalledWith('skd-kelulusan-zaid-bin-tsabit-reg-skd-01.pdf')
    })
  })

  describe('4. Formulir Biodata Santri & Parser Kesehatan (exportApplicantForm)', () => {
    it('memvalidasi parseHealthData dari format JSON baku 10 butir', () => {
      const validJson = JSON.stringify({
        chronic_disease: true,
        chronic_disease_description: 'Asma bronkial',
        allergies: true,
        allergy_types: ['Dingin', 'Debu'],
        emergency_contact_name: 'Bapak Rudi',
        emergency_contact_phone: '08123456789',
      })

      const parsed = parseHealthData(validJson)
      expect(parsed).not.toBeNull()
      expect(parsed?.chronic_disease).toBe(true)
      expect(parsed?.chronic_disease_description).toBe('Asma bronkial')

      const summary = formatHealthSummary(validJson)
      expect(summary).toContain('Kronis: Asma bronkial')
      expect(summary).toContain('Alergi: Dingin, Debu')
    })

    it('formatHealthSummary menangani data null, kosong, atau string biasa secara aman', () => {
      expect(formatHealthSummary(null)).toBe('Tidak ada catatan kesehatan')
      expect(formatHealthSummary('')).toBe('Tidak ada catatan kesehatan')
      expect(formatHealthSummary('Riwayat sakit lambung ringan')).toBe('Riwayat sakit lambung ringan')
    })

    it('downloadApplicantFormDoc mengekspor kedua halaman PDF saat pageMode "both"', async () => {
      const container = document.createElement('div')
      const p1 = document.createElement('div')
      p1.className = 'applicant-form-page'
      p1.setAttribute('data-page', '1')
      const p2 = document.createElement('div')
      p2.className = 'applicant-form-page'
      p2.setAttribute('data-page', '2')
      container.appendChild(p1)
      container.appendChild(p2)

      await downloadApplicantFormDoc({
        containerElement: container,
        format: 'pdf',
        applicantName: 'Bilal bin Rabah',
        registrationNo: 'REG-FORM-01',
        pageMode: 'both',
      })

      expect(mockAddPage).toHaveBeenCalledTimes(1)
      expect(mockAddImage).toHaveBeenCalledTimes(2)
      expect(mockSave).toHaveBeenCalledWith('formulir-pendaftaran-bilal-bin-rabah-reg-form-01.pdf')
    })
  })

  describe('5. Lembar Penilaian Evaluator (exportAssessment)', () => {
    it('mengekspor lembar penilaian ke A4 Portrait secara presisi', async () => {
      const el = document.createElement('div')
      Object.defineProperty(el, 'offsetWidth', { value: 794 })
      Object.defineProperty(el, 'offsetHeight', { value: 1123 })
      el.getBoundingClientRect = vi.fn().mockReturnValue({ width: 794, height: 1123 })

      await downloadAssessmentDoc(el, 'pdf', 'Usamah bin Zaid', 'REG-NILAI-01')

      expect(mockAddImage).toHaveBeenCalledWith(
        'data:image/png;base64,mockPngData',
        'PNG',
        0,
        0,
        210,
        297,
        undefined,
        'NONE'
      )
      expect(mockSave).toHaveBeenCalledWith('lembar-penilaian-usamah-bin-zaid-reg-nilai-01.pdf')
    })
  })
})
