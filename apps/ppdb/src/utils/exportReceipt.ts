import {
  captureElementToCanvas,
  downloadCanvasAsPng,
  waitForDocumentAssets,
} from './exportDocUtils'
import { jsPDF } from 'jspdf'

function getSafeFilename(applicantName: string, receiptNo?: string): string {
  const safeName = (applicantName || 'santri')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
  const safeNo = (receiptNo || 'kuitansi')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
  return `kuitansi-resmi-${safeName}-${safeNo}`
}

export async function downloadReceiptPdf(
  element: HTMLElement,
  applicantName: string,
  receiptNo?: string
): Promise<void> {
  await waitForDocumentAssets(element)
  const baseFilename = getSafeFilename(applicantName, receiptNo)

  const canvas = await captureElementToCanvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')

  // Standar format resmi A4 Portrait (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  // Tempatkan kuitansi secara proporsional dengan margin fisik yang rapi tanpa distorsi aspect ratio
  const maxW = 180 // 210mm - 2 * 15mm
  const maxH = 267 // 297mm - 2 * 15mm

  let targetW = maxW
  let targetH = (canvas.height * targetW) / canvas.width

  // Jika tinggi melebihi area cetak maksimum, turunkan kedua dimensi secara proporsional
  if (targetH > maxH) {
    targetH = maxH
    targetW = (canvas.width * targetH) / canvas.height
  }

  // Posisikan presisi di tengah kertas A4 baik horizontal maupun vertikal
  const marginX = (210 - targetW) / 2
  const marginY = (297 - targetH) / 2

  // Gunakan kompresi lossless ('NONE') agar teks, garis tabel, dan QR code tetap tajam
  pdf.addImage(imgData, 'PNG', marginX, marginY, targetW, targetH, undefined, 'NONE')
  pdf.save(`${baseFilename}.pdf`)
}

export async function downloadReceiptImage(
  element: HTMLElement,
  applicantName: string,
  receiptNo?: string
): Promise<void> {
  const baseFilename = getSafeFilename(applicantName, receiptNo)

  const canvas = await captureElementToCanvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
  })

  downloadCanvasAsPng(canvas, baseFilename)
}
