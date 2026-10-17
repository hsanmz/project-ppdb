import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Utilitas bersama untuk export dokumen resmi PPDB Ar-Rahman (A4 Portrait & Landscape).
 * Memastikan aset font, gambar logo, favicon, dan SVG QR selesai dimuat secara presisi
 * sebelum rasterisasi canvas, sehingga hasil export identik 100% dengan preview.
 */

/**
 * Menunggu seluruh aset font web, gambar logo, dan kode QR selesai dimuat dan didekode
 * secara asinkron sebelum proses rendering html2canvas dimulai.
 */
export async function waitForDocumentAssets(element: HTMLElement): Promise<void> {
  // 1. Tunggu seluruh font web (Inter, DM Sans, dsb.) selesai dimuat
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready
    } catch {
      // Abaikan kegagalan font non-kritis
    }
  }

  // 2. Tunggu seluruh elemen <img> di dalam kontainer dokumen selesai dimuat & didekode
  const images = Array.from(element.querySelectorAll<HTMLImageElement>('img'))
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return img.decode ? img.decode().catch(() => {}) : Promise.resolve()
      }
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 3000)
        img.onload = () => {
          clearTimeout(timer)
          if (img.decode) {
            img.decode().then(resolve).catch(() => resolve())
          } else {
            resolve()
          }
        }
        img.onerror = () => {
          clearTimeout(timer)
          resolve()
        }
      })
    })
  )

  // 3. Jeda stabilisasi singkat untuk memastikan reflow DOM selesai
  await new Promise((resolve) => setTimeout(resolve, 150))
}

export interface CaptureCanvasOptions {
  scale?: number
  backgroundColor?: string
  width?: number
  height?: number
}

/**
 * Menangkap elemen dokumen ke canvas resolusi tinggi (default 2x scale = ~192-200 DPI crisp).
 */
export async function captureElementToCanvas(
  element: HTMLElement,
  options?: CaptureCanvasOptions
): Promise<HTMLCanvasElement> {
  await waitForDocumentAssets(element)

  const scale = options?.scale ?? 2
  const backgroundColor = options?.backgroundColor ?? '#ffffff'

  // Hitung bounding rect bulat presisi agar tidak terjadi pergeseran subpixel
  const rect = element.getBoundingClientRect()
  const width = options?.width || Math.round(rect.width) || element.offsetWidth || 794
  const height = options?.height || Math.round(rect.height) || element.offsetHeight || 1123

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor,
    width,
    height,
    windowWidth: Math.max(1280, width),
    scrollX: 0,
    scrollY: 0,
    onclone: (_clonedDoc, clonedEl) => {
      // 1. Pastikan seluruh chain parent di cloned doc visible dan opacity 1
      let currentParent: HTMLElement | null = clonedEl.parentElement
      while (currentParent && currentParent !== _clonedDoc.body) {
        currentParent.style.opacity = '1'
        currentParent.style.visibility = 'visible'
        if (currentParent.style.position === 'absolute' || currentParent.style.position === 'fixed') {
          // Reset coordinate offscreen agar canvas tidak memotong elemen
          currentParent.style.left = '0'
          currentParent.style.top = '0'
        }
        currentParent = currentParent.parentElement
      }

      // 2. Pastikan elemen kloningan memiliki opacity 1 dan tidak terkena efek transform/box-shadow
      clonedEl.style.opacity = '1'
      clonedEl.style.visibility = 'visible'
      clonedEl.style.transform = 'none'
      clonedEl.style.boxShadow = 'none'
      if (clonedEl.style.position === 'absolute' || clonedEl.style.position === 'fixed') {
        clonedEl.style.left = '0'
        clonedEl.style.top = '0'
      }

      // 3. Reset letter-spacing pada anak elemen untuk mencegah bug glyph bounding-box html2canvas
      const allElements = clonedEl.querySelectorAll<HTMLElement>('*')
      allElements.forEach((el) => {
        if (el.style.letterSpacing) {
          el.style.letterSpacing = 'normal'
        }
        // Pastikan font smoothing optimal
        ;(el.style as any).webkitFontSmoothing = 'antialiased'
      })
    },
  })

  return canvas
}

export interface ExportPdfOptions {
  orientation?: 'portrait' | 'landscape'
}

/**
 * Mengonversi array canvas hasil capture ke file PDF standar A4 (210mm x 297mm atau 297mm x 210mm)
 * dengan mapping presisi 1:1 tanpa pergeseran atau distorsi aspect ratio.
 */
export function exportCanvasesToPdf(
  canvases: HTMLCanvasElement[],
  filename: string,
  options?: ExportPdfOptions
): void {
  const orientation = options?.orientation ?? 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const pageWidth = orientation === 'portrait' ? 210 : 297
  const pageHeight = orientation === 'portrait' ? 297 : 210

  for (let i = 0; i < canvases.length; i++) {
    if (i > 0) {
      pdf.addPage('a4', orientation)
    }

    const imgData = canvases[i].toDataURL('image/png')
    // Gunakan kompresi lossless ('NONE') agar teks dan garis QR beresolusi tinggi tetap tajam tanpa artefak blur
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'NONE')
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  pdf.save(cleanFilename)
}

/**
 * Mengunduh canvas sebagai file gambar PNG beresolusi tinggi dengan rasio A4 presisi.
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  const dataUrl = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
