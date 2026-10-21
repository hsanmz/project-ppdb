import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as api from './client'
import { ApiError, isApiError, getErrorMessage } from './client'

// ── Helper ────────────────────────────────────────────────

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit]

const fetchMock = vi.fn<(...args: FetchArgs) => Promise<Response>>()

/** Response JSON tiruan (content-type application/json). */
function jsonResponse(body: unknown, status = 200, statusText = ''): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Response non-JSON tiruan (mis. HTML dari dev server / proxy salah). */
function htmlResponse(status: number, html = '<!doctype html><html></html>'): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html' },
  })
}

/** Jumlah pemanggilan endpoint refresh (untuk uji single-flight). */
function refreshCallCount(): number {
  return fetchMock.mock.calls.filter(([url]) =>
    String(url).includes('/companyprofile/auth/refresh')
  ).length
}

/**
 * Tangkap `window.location.href = ...` tanpa memicu navigasi jsdom.
 * `window.location` adalah own accessor pada `window` (configurable), sedangkan
 * instance `location` sendiri tidak bisa diubah — jadi kita ganti dengan proxy
 * yang hanya menimpa `href`, sisanya diteruskan ke location asli.
 */
function captureLocationHref(): { href: string | null; pathname: string } {
  const real = window.location
  const captured: { href: string | null; pathname: string } = {
    href: null,
    pathname: real.pathname,
  }
  const proxy = new Proxy(real, {
    get(target, prop, receiver) {
      if (prop === 'href') return captured.href ?? ''
      return Reflect.get(target, prop, receiver)
    },
    set(_target, prop, value) {
      if (prop === 'href') {
        captured.href = value as string
        return true
      }
      captured[prop as keyof typeof captured] = value
      return true
    },
  })
  Object.defineProperty(window, 'location', { configurable: true, get: () => proxy })
  return captured
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ── Jalur sukses ──────────────────────────────────────────

describe('apiFetch — jalur sukses', () => {
  it('mengembalikan JSON hasil parse dan selalu mengirim cookie (credentials: include)', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 'u1', username: 'admin' }]))

    const users = await api.getUsers()

    expect(users).toEqual([{ id: 'u1', username: 'admin' }])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/users')
    expect(init?.credentials).toBe('include')
  })

  it('status 204 mengembalikan undefined tanpa membaca body JSON', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    const result = await api.revokeSession('sess-1')

    expect(result).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('body JSON disertai header Content-Type application/json', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'u9' }))

    await api.createUser({ username: 'baru', password: 'rahasia' })

    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(init?.credentials).toBe('include')
  })

  it('body FormData tidak diberi Content-Type manual (biar browser mengisi boundary)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ url: '/uploads/a.png' }))

    await api.uploadAvatar(new File(['x'], 'a.png', { type: 'image/png' }))

    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(init?.body).toBeInstanceOf(FormData)
    expect(new Headers(init?.headers).get('Content-Type')).toBeNull()
  })
})

// ── Parsing 422 (validasi FastAPI) ────────────────────────

describe('apiFetch — parsing error 422', () => {
  it('memetakan detail array ke fields per kolom + pesan gabungan', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          detail: [
            { loc: ['body', 'username'], msg: 'Field required', type: 'missing' },
            { loc: ['body', 'email'], msg: 'bukan alamat email valid', type: 'value_error.email' },
          ],
        },
        422
      )
    )

    const err: unknown = await api.createUser({ username: '', password: '' }).catch((e) => e)

    expect(isApiError(err)).toBe(true)
    const apiErr = err as ApiError
    expect(apiErr.status).toBe(422)
    expect(apiErr.message).toBe('Field required; bukan alamat email valid')
    expect(apiErr.fields).toEqual({
      username: 'Field required',
      email: 'bukan alamat email valid',
    })
    // 422 bukan 401 → tidak boleh memicu refresh
    expect(refreshCallCount()).toBe(0)
  })

  it('menggabungkan beberapa pesan untuk kolom yang sama dengan pemisah "; "', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          detail: [
            { loc: ['body', 'password'], msg: 'Field required', type: 'missing' },
            { loc: ['body', 'password'], msg: 'terlalu pendek', type: 'value_error.any_str.min_length' },
          ],
        },
        422
      )
    )

    const err = (await api.createUser({ username: 'x', password: '' }).catch((e) => e)) as ApiError

    expect(err.fields).toEqual({ password: 'Field required; terlalu pendek' })
    expect(err.message).toBe('Field required; terlalu pendek')
  })

  it('loc berupa ["body"] tetap dipetakan ke field "body"', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: [{ loc: ['body'], msg: 'Body tidak valid', type: 'value_error' }] }, 422)
    )

    const err = (await api.createUser({ username: 'x', password: 'y' }).catch((e) => e)) as ApiError

    expect(err.message).toBe('Body tidak valid')
    expect(err.fields).toEqual({ body: 'Body tidak valid' })
  })

  it('loc tanpa segmen string sama sekali tidak menghasilkan fields', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: [{ loc: [0, 1], msg: 'Elemen tidak valid', type: 'value_error' }] }, 422)
    )

    const err = (await api.createUser({ username: 'x', password: 'y' }).catch((e) => e)) as ApiError

    expect(err.message).toBe('Elemen tidak valid')
    expect(err.fields).toBeUndefined()
  })

  it('detail berupa string (422 non-validasi) dipakai apa adanya', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Kuota sudah penuh' }, 422))

    const err = (await api.createUser({ username: 'x', password: 'y' }).catch((e) => e)) as ApiError

    expect(err.status).toBe(422)
    expect(err.message).toBe('Kuota sudah penuh')
    expect(err.fields).toBeUndefined()
  })

  it('elemen rusak atau msg kosong dilewati tanpa membuat crash', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          detail: [
            null,
            { loc: ['body', 'username'], msg: '   ' },
            { loc: ['body', 'username'], msg: 'sudah dipakai', type: 'value_error' },
          ],
        },
        422
      )
    )

    const err = (await api.createUser({ username: 'x', password: 'y' }).catch((e) => e)) as ApiError

    expect(err.message).toBe('sudah dipakai')
    expect(err.fields).toEqual({ username: 'sudah dipakai' })
  })
})

// ── Error non-401 ─────────────────────────────────────────

describe('apiFetch — error non-401', () => {
  it('500 dengan detail string memakai pesan backend', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Terjadi kesalahan internal' }, 500))

    const err = (await api.getUsers().catch((e) => e)) as ApiError

    expect(err.status).toBe(500)
    expect(err.message).toBe('Terjadi kesalahan internal')
    expect(refreshCallCount()).toBe(0)
  })

  it('respons error non-JSON jatuh ke fallback "API <status>"', async () => {
    fetchMock.mockResolvedValue(htmlResponse(500))

    const err = (await api.getUsers().catch((e) => e)) as ApiError

    expect(err.status).toBe(500)
    expect(err.message).toBe('API 500')
  })

  it('kegagalan jaringan (fetch reject TypeError) diteruskan sebagai TypeError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const err: unknown = await api.getUsers().catch((e) => e)

    expect(err).toBeInstanceOf(TypeError)
    expect(getErrorMessage(err)).toContain('Tidak dapat terhubung ke server')
  })
})

// ── 401 + refresh single-flight ───────────────────────────

describe('apiFetch — 401 dan refresh single-flight', () => {
  it('dua request paralel yang kena 401 hanya memicu SATU refresh, lalu keduanya sukses', async () => {
    let meCalls = 0
    fetchMock.mockImplementation(async (url) => {
      const target = String(url)
      if (target.includes('/companyprofile/auth/refresh')) {
        return jsonResponse({ ok: true })
      }
      if (target.includes('/companyprofile/auth/me')) {
        meCalls += 1
        // Dua panggilan pertama (sebelum refresh) → 401; sisanya sukses.
        if (meCalls <= 2) return jsonResponse({ detail: 'Token kedaluwarsa' }, 401)
        return jsonResponse({ id: 'u1', username: 'admin', user_type: 'superadmin' })
      }
      throw new Error(`endpoint tak terduga: ${target}`)
    })

    const [a, b] = await Promise.all([api.getMe(), api.getMe()])

    expect(a.id).toBe('u1')
    expect(b.id).toBe('u1')
    expect(refreshCallCount()).toBe(1)
    // 2 request awal + 1 refresh + 2 retry = 5
    expect(fetchMock).toHaveBeenCalledTimes(5)
    // Refresh sukses → sesi TIDAK dibersihkan dan tidak ada flag sesi berakhir.
    expect(sessionStorage.getItem('sa_session_expired')).toBeNull()
  })

  it('refresh gagal: hanya satu refresh, kedua request lempar 401 + bersihkan sesi & pasang flag', async () => {
    localStorage.setItem('sa_user', JSON.stringify({ id: 'u1', username: 'admin' }))
    const location = captureLocationHref()

    fetchMock.mockImplementation(async (url) => {
      const target = String(url)
      if (target.includes('/companyprofile/auth/refresh')) {
        return jsonResponse({ detail: 'refresh ditolak' }, 500)
      }
      return jsonResponse({ detail: 'Token kedaluwarsa' }, 401)
    })

    const errs: unknown[] = await Promise.all([
      api.getMe().then(
        () => null,
        (e: unknown) => e
      ),
      api.getMe().then(
        () => null,
        (e: unknown) => e
      ),
    ])

    for (const err of errs) {
      expect(isApiError(err)).toBe(true)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(401)
      expect(apiErr.message).toBe('Token kedaluwarsa')
    }
    expect(refreshCallCount()).toBe(1)
    expect(localStorage.getItem('sa_user')).toBeNull()
    expect(sessionStorage.getItem('sa_session_expired')).toBe('1')
    expect(location.href).toBe('/auth/login')
  })

  it('refreshPromise di-reset setelah selesai: gelombang 401 berikutnya boleh refresh lagi', async () => {
    captureLocationHref()
    fetchMock.mockImplementation(async (url) => {
      const target = String(url)
      if (target.includes('/companyprofile/auth/refresh')) {
        return jsonResponse({ detail: 'refresh ditolak' }, 500)
      }
      return jsonResponse({ detail: 'Token kedaluwarsa' }, 401)
    })

    await api.getMe().then(
      () => undefined,
      () => undefined
    )
    expect(refreshCallCount()).toBe(1)

    await api.getMe().then(
      () => undefined,
      () => undefined
    )
    expect(refreshCallCount()).toBe(2)
  })

  it('401 kredensial login: pesan backend dipertahankan, bukan "Unauthorized"', async () => {
    captureLocationHref()
    fetchMock.mockImplementation(async (url) => {
      const target = String(url)
      if (target.includes('/companyprofile/auth/refresh')) {
        return jsonResponse({ detail: 'refresh ditolak' }, 500)
      }
      return jsonResponse({ detail: 'Incorrect username or password' }, 401)
    })

    const err = (await api.login('admin', 'salah').catch((e) => e)) as ApiError

    expect(err.status).toBe(401)
    expect(err.message).toBe('Incorrect username or password')
    // Login gagal tidak menyimpan sesi
    expect(localStorage.getItem('sa_user')).toBeNull()
  })

  it('bila refresh sukses, request diulang dan hasil retry dikembalikan', async () => {
    let attempt = 0
    fetchMock.mockImplementation(async (url) => {
      const target = String(url)
      if (target.includes('/companyprofile/auth/refresh')) {
        return jsonResponse({ ok: true })
      }
      attempt += 1
      if (attempt === 1) return jsonResponse({ detail: 'Token kedaluwarsa' }, 401)
      return jsonResponse([{ id: 'r1', name: 'Admin' }])
    })

    const roles = await api.getRoles()

    expect(roles).toEqual([{ id: 'r1', name: 'Admin' }])
    expect(refreshCallCount()).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

// ── getErrorMessage & isApiError ──────────────────────────

describe('getErrorMessage', () => {
  it('ApiError → pesan dari backend', () => {
    expect(getErrorMessage(new ApiError('Username sudah dipakai', 409))).toBe('Username sudah dipakai')
  })

  it('TypeError → pesan jaringan yang manusiawi', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toContain('Tidak dapat terhubung ke server')
  })

  it('Error biasa dengan pesan → pesan aslinya', () => {
    expect(getErrorMessage(new Error('Sesuatu rusak'))).toBe('Sesuatu rusak')
  })

  it('Error tanpa pesan / nilai non-Error → fallback', () => {
    expect(getErrorMessage(new Error('   '))).toBe('Terjadi kesalahan. Silakan coba lagi.')
    expect(getErrorMessage(undefined)).toBe('Terjadi kesalahan. Silakan coba lagi.')
    expect(getErrorMessage({ message: 'bukan error' })).toBe('Terjadi kesalahan. Silakan coba lagi.')
  })

  it('fallback kustom dipakai saat tidak ada pesan', () => {
    expect(getErrorMessage(null, 'Gagal memuat data')).toBe('Gagal memuat data')
  })
})

describe('isApiError', () => {
  it('true hanya untuk ApiError', () => {
    expect(isApiError(new ApiError('x', 400))).toBe(true)
    expect(isApiError(new Error('x'))).toBe(false)
    expect(isApiError('x')).toBe(false)
    expect(isApiError(null)).toBe(false)
  })
})
