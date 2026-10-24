/**
 * Utilitas rich text untuk berita.
 *
 * Sejak editor berita memakai WYSIWYG (contentEditable), isi artikel disimpan
 * sebagai HTML. Dua hal yang harus dijamin:
 *
 * 1. **Konversi** — artikel lama tersimpan sebagai teks polos (dipisah baris
 *    kosong). Saat dibuka di editor, teks itu diubah menjadi paragraf HTML
 *    supaya tampil rapi, dan saat dibaca publik tetap dirender seperti dulu.
 * 2. **Sanitasi** — HTML yang masuk (dari paste Word/web atau payload API)
 *    dibersihkan dengan daftar putih tag/atribut. Fungsi ini murni string,
 *    jadi aman dipakai di server (SSR) maupun browser. Sanitasi dilakukan dua
 *    kali: saat menyimpan (admin) dan saat merender (halaman publik).
 */

/** Tag yang boleh muncul di artikel. */
const ALLOWED_TAGS = new Set([
  'p', 'div', 'br', 'h2', 'h3', 'h4',
  'strong', 'b', 'em', 'i', 'u', 's', 'del',
  'ul', 'ol', 'li', 'blockquote',
  'a', 'code', 'pre', 'hr',
])

/** Tag void (tidak punya pasangan penutup). */
const VOID_TAGS = new Set(['br', 'hr'])

/**
 * Tag yang isinya dibuang seluruhnya. Kalau hanya tag-nya dibuang, teks di
 * dalam `<script>`/`<style>` akan ikut tampil sebagai paragraf.
 */
const DROP_CONTENT_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'svg', 'math',
  'template', 'noscript', 'title', 'head', 'frameset', 'frame', 'applet',
])

/** Tag yang dibuang tag-nya saja (isi teks tetap dipertahankan). */
const DROP_TAG_ONLY = new Set([
  'img', 'picture', 'source', 'video', 'audio', 'canvas', 'map', 'area',
  'form', 'input', 'textarea', 'select', 'option', 'button', 'label',
  'fieldset', 'legend', 'link', 'meta', 'base', 'col', 'colgroup', 'table',
  'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'span', 'font',
])

/** Tag yang boleh menyimpan perataan teks lewat atribut `style`. */
const ALIGN_TAGS = new Set(['p', 'div', 'h2', 'h3', 'h4', 'li', 'blockquote'])

const TAG_RE =
  /<!--[\s\S]*?-->|<![^>]*>|<\?[\s\S]*?\?>|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g

const ATTR_RE =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

const HTML_TAG_RE =
  /<(?:p|div|br|h[1-6]|ul|ol|li|strong|b|em|i|u|s|del|blockquote|a|code|pre|hr)\b[^>]*>/i

type Attrs = Record<string, string>

/** Apakah `content` sudah berbentuk HTML (bukan teks polos legacy)? */
export function looksLikeHtml(content: string): boolean {
  return HTML_TAG_RE.test(content || '')
}

/** Escape teks polos (semua `&` dianggap literal). */
function escapePlainText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Escape potongan teks di dalam HTML. Entitas yang sudah valid (`&amp;`,
 * `&nbsp;`, `&#39;`, …) dibiarkan supaya tidak menjadi `&amp;amp;`.
 */
function escapeHtmlText(text: string): string {
  return text
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Ubah teks polos artikel lama menjadi HTML paragraf. Baris kosong memisahkan
 * paragraf, baris tunggal menjadi `<br>`.
 */
export function plainTextToHtml(text: string): string {
  const normalized = (text || '').replace(/\r\n?/g, '\n').trim()
  if (!normalized) return ''
  return normalized
    .split(/\n{2,}/)
    .map((block) => `<p>${escapePlainText(block.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** Hanya izinkan skema URL yang aman; menolak `javascript:`, `data:`, dst. */
export function isSafeUrl(raw: string): boolean {
  const url = (raw || '').trim().replace(/[\u0000-\u001F\u007F]/g, '')
  if (!url) return false
  if (/^(?:https?:|mailto:|tel:)/i.test(url)) return true
  return url.startsWith('/') || url.startsWith('#') || url.startsWith('?')
}

function sanitizeUrl(raw: string): string | null {
  const url = (raw || '').trim().replace(/[\u0000-\u001F\u007F]/g, '')
  return isSafeUrl(url) ? url : null
}

function parseAttrs(source: string): Attrs {
  const attrs: Attrs = {}
  let match: RegExpExecArray | null
  const re = new RegExp(ATTR_RE.source, 'g')
  while ((match = re.exec(source))) {
    const name = match[1].toLowerCase()
    if (name.startsWith('on')) continue
    const value = match[2] ?? match[3] ?? match[4] ?? ''
    attrs[name] = value
  }
  return attrs
}

function isSelfClosingTag(raw: string): boolean {
  return /\/>\s*$/.test(raw)
}

function renderAttrs(tag: string, attrs: Attrs): string {
  let result = ''

  if (tag === 'a') {
    const href = attrs.href ? sanitizeUrl(attrs.href) : null
    if (href) {
      result += ` href="${escapeAttr(href)}"`
      if (/^https?:/i.test(href)) {
        result += ' target="_blank" rel="noopener noreferrer nofollow"'
      }
    }
    if (attrs.title) result += ` title="${escapeAttr(attrs.title)}"`
  }

  if (tag === 'ol' && attrs.start && /^\d{1,9}$/.test(attrs.start.trim())) {
    result += ` start="${Number(attrs.start)}"`
  }

  if (ALIGN_TAGS.has(tag)) {
    const align = /text-align\s*:\s*(left|center|right|justify)/i.exec(attrs.style || '')?.[1]
    if (align) result += ` style="text-align:${align.toLowerCase()}"`
  }

  return result
}

/**
 * Bersihkan HTML dengan daftar putih. Tag tak dikenal dibuang (isi teks
 * dipertahankan), tag berbahaya dibuang beserta isinya, atribut di luar daftar
 * putih dihapus, dan URL tidak aman dinonaktifkan.
 */
export function sanitizeRichHtml(input: string): string {
  const source = input || ''
  if (!source) return ''

  let out = ''
  let cursor = 0
  let skipTag: string | null = null
  let skipDepth = 0
  const stack: string[] = []

  const closeTag = (name: string) => {
    const index = stack.lastIndexOf(name)
    if (index === -1) return
    for (let i = stack.length - 1; i >= index; i -= 1) out += `</${stack[i]}>`
    stack.length = index
  }

  const re = new RegExp(TAG_RE.source, 'g')
  let match: RegExpExecArray | null

  while ((match = re.exec(source))) {
    const raw = match[0]
    const text = source.slice(cursor, match.index)
    cursor = match.index + raw.length

    const name = (match[1] || '').toLowerCase()
    const isComment = raw.startsWith('<!--')
    const isDeclaration = !name && (raw.startsWith('<!') || raw.startsWith('<?'))
    const isClosing = /^<\//.test(raw)

    // Sedang melewati isi tag berbahaya (mis. <script>…</script>).
    if (skipDepth > 0) {
      if (!isComment && !isDeclaration && name === skipTag) {
        if (isClosing) {
          skipDepth -= 1
          if (skipDepth === 0) skipTag = null
        } else if (!isSelfClosingTag(raw)) {
          skipDepth += 1
        }
      }
      continue
    }

    if (isComment || isDeclaration) {
      out += escapeHtmlText(text)
      continue
    }

    if (DROP_CONTENT_TAGS.has(name)) {
      out += escapeHtmlText(text)
      if (!isClosing && !isSelfClosingTag(raw)) {
        skipTag = name
        skipDepth = 1
      }
      continue
    }

    out += escapeHtmlText(text)

    if (DROP_TAG_ONLY.has(name)) continue

    if (!ALLOWED_TAGS.has(name)) continue

    if (isClosing) {
      closeTag(name)
      continue
    }

    if (VOID_TAGS.has(name)) {
      out += `<${name}>`
      continue
    }

    const attrs = renderAttrs(name, parseAttrs(match[2] || ''))
    out += `<${name}${attrs}>`
    stack.push(name)
  }

  out += escapeHtmlText(source.slice(cursor))

  // Tutup tag yang masih terbuka supaya struktur HTML tetap valid.
  while (stack.length > 0) {
    out += `</${stack.pop()}>`
  }

  return out
}
