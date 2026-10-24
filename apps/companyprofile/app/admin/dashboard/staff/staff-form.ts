import type { FormState } from '../_types'

export interface StaffFormValues {
  role: string
  name: string
  position: string
  bio: string
  expertise: string[]
  parentId: string
  order: string
  image: string
}

function splitLines(value: unknown): string[] {
  if (typeof value !== 'string') return []
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeExpertise(items: unknown): string[] {
  if (Array.isArray(items)) {
    return Array.from(
      new Set(
        items
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
          .map((item) => item.replace(/\s+/g, ' ')),
      ),
    )
  }
  if (typeof items === 'string') {
    return Array.from(
      new Set(
        splitLines(items)
          .map((item) => item.replace(/\s+/g, ' '))
          .filter(Boolean),
      ),
    )
  }
  return []
}

export function readStaffForm(formData: FormState): StaffFormValues {
  const content =
    typeof formData._content === 'object' && formData._content !== null
      ? (formData._content as Record<string, unknown>)
      : null

  const name = typeof formData._c_name === 'string' ? formData._c_name : typeof content?.name === 'string' ? content.name : ''
  const position =
    typeof formData._c_position === 'string'
      ? formData._c_position
      : typeof formData._c_jabatan === 'string'
        ? formData._c_jabatan
        : typeof content?.position === 'string'
          ? content.position
          : typeof content?.jabatan === 'string'
            ? content.jabatan
            : ''
  const bio =
    typeof formData._c_bio === 'string'
      ? formData._c_bio
      : typeof formData._c_biografi === 'string'
        ? formData._c_biografi
        : typeof content?.bio === 'string'
          ? content.bio
          : typeof content?.biografi === 'string'
            ? content.biografi
            : ''
  const expertise = normalizeExpertise(formData._c_expertise ?? content?.expertise ?? content?.keahlian)
  const parentId =
    typeof formData._c_parentId === 'string'
      ? formData._c_parentId
      : typeof formData._c_parent_id === 'string'
        ? formData._c_parent_id
        : typeof content?.parentId === 'string'
          ? content.parentId
          : typeof content?.parent_id === 'string'
            ? content.parent_id
            : ''
  const order =
    typeof formData._c_order === 'string'
      ? formData._c_order
      : formData._c_order != null
        ? String(formData._c_order)
        : content?.order != null
          ? String(content.order)
          : ''

  return {
    role: typeof formData.role === 'string' ? formData.role : '',
    name,
    position,
    bio,
    expertise,
    parentId,
    order,
    image: typeof formData.image === 'string' ? formData.image : '',
  }
}

export function serializeStaffExpertise(items: string[]): string {
  return normalizeExpertise(items).join('\n')
}

export function validateStaffForm(values: StaffFormValues): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!values.role.trim()) {
    errors.role = 'Peran wajib dipilih.'
  } else if (!['leader', 'teacher'].includes(values.role.trim())) {
    errors.role = 'Peran hanya boleh leader atau teacher.'
  }

  if (!values.name.trim()) {
    errors.name = 'Nama staff wajib diisi.'
  }

  if (!values.position.trim()) {
    errors.position = 'Jabatan wajib diisi.'
  }

  if (values.image.trim()) {
    if (values.image.trim().length > 255) {
      errors.image = 'URL gambar terlalu panjang (maks. 255 karakter).'
      return errors
    }
    if (values.image.trim().includes(' ') || values.image.trim().startsWith('//')) {
      errors.image = 'URL gambar tidak valid.'
      return errors
    }
    try {
      const url = new URL(values.image.trim())
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.image = 'URL gambar tidak valid.'
      }
    } catch {
      if (!values.image.trim().startsWith('/')) {
        errors.image = 'URL gambar tidak valid.'
      }
    }
  }

  if (values.order.trim()) {
    if (!/^-?\d+$/.test(values.order.trim())) {
      errors.order = 'Urutan tampilan harus berupa angka.'
    }
  }

  return errors
}

export function buildStaffPayload({
  formData,
  existingContent,
}: {
  formData: FormState
  existingContent: Record<string, unknown> | null
}): Record<string, unknown> {
  const values = readStaffForm(formData)

  const mergedContent: Record<string, unknown> = {
    ...(existingContent || {}),
  }

  const name = values.name.trim()
  const position = values.position.trim()
  const bio = values.bio.trim()

  if (name) mergedContent.name = name
  else delete mergedContent.name

  if (position) mergedContent.position = position
  else delete mergedContent.position

  if (bio) mergedContent.bio = bio
  else delete mergedContent.bio

  const expertise = normalizeExpertise(values.expertise)
  if (expertise.length > 0) mergedContent.expertise = expertise
  else delete mergedContent.expertise

  if (values.parentId.trim()) mergedContent.parentId = values.parentId.trim()
  else delete mergedContent.parentId

  if (values.order.trim()) {
    const parsed = Number(values.order.trim())
    if (Number.isFinite(parsed)) mergedContent.order = parsed
    else delete mergedContent.order
  } else {
    delete mergedContent.order
  }

  // Jaga key lama agar kompatibel
  if (name) mergedContent.nama = name
  else delete mergedContent.nama
  if (position) mergedContent.jabatan = position
  else delete mergedContent.jabatan
  if (bio) mergedContent.biografi = bio
  else delete mergedContent.biografi
  if (expertise.length > 0) mergedContent.keahlian = expertise
  else delete mergedContent.keahlian

  return {
    role: values.role.trim(),
    image: values.image.trim(),
    content: mergedContent,
  }
}

export function staffFieldFromServerError(message: string): string | null {
  const lower = message.toLowerCase()
  if (lower.includes('peran') || lower.includes('role')) return 'role'
  if (lower.includes('nama')) return 'name'
  if (lower.includes('jabatan') || lower.includes('position')) return 'position'
  if (lower.includes('gambar') || lower.includes('image') || lower.includes('foto')) return 'image'
  if (lower.includes('urutan') || lower.includes('order')) return 'order'
  if (lower.includes('atasan') || lower.includes('parent')) return 'parentId'
  return null
}
