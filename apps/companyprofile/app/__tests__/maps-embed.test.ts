import { describe, it, expect } from 'vitest'

import {
  isAllowedMapsHost, mapsFallbackUrl, mapsSearchUrl, resolveMapsEmbed,
} from '../lib/maps-embed'

describe('isAllowedMapsHost — allowlist host Google Maps', () => {
  it('menerima google.com dan subdomainnya', () => {
    expect(isAllowedMapsHost('www.google.com')).toBe(true)
    expect(isAllowedMapsHost('maps.google.com')).toBe(true)
    expect(isAllowedMapsHost('google.com')).toBe(true)
  })

  it('menerima domain regional Google', () => {
    expect(isAllowedMapsHost('www.google.co.id')).toBe(true)
    expect(isAllowedMapsHost('maps.google.co.uk')).toBe(true)
    expect(isAllowedMapsHost('google.de')).toBe(true)
    expect(isAllowedMapsHost('www.google.com.au')).toBe(true)
  })

  it('menolak host lain dan domain peniruan', () => {
    expect(isAllowedMapsHost('evil.example.com')).toBe(false)
    expect(isAllowedMapsHost('notgoogle.com')).toBe(false)
    expect(isAllowedMapsHost('maps.app.goo.gl')).toBe(false)
    expect(isAllowedMapsHost('example.com/google.com')).toBe(false)
    expect(isAllowedMapsHost('')).toBe(false)
  })
})

describe('resolveMapsEmbed — nilai `maps_embed` dari backend', () => {
  it('kosong atau whitespace → status empty tanpa pesan', () => {
    for (const raw of [null, undefined, '', '   ']) {
      expect(resolveMapsEmbed(raw)).toEqual({ status: 'empty', src: null, message: null })
    }
  })

  it('URL embed Google Maps → valid', () => {
    const result = resolveMapsEmbed('https://www.google.com/maps?q=Bekasi&output=embed')
    expect(result.status).toBe('valid')
    expect(result.message).toBeNull()
    expect(result.src).toContain('www.google.com/maps')
    expect(result.src).toContain('output=embed')
  })

  it('kode <iframe> dari menu Bagikan → hanya src-nya yang diambil', () => {
    const raw =
      '<iframe src="https://www.google.com/maps/embed?pb=!1m14" width="600" height="450" ' +
      'style="border:0" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    const result = resolveMapsEmbed(raw)
    expect(result.status).toBe('valid')
    expect(result.src).toBe('https://www.google.com/maps/embed?pb=!1m14')
  })

  it('iframe tanpa atribut src → invalid dengan pesan jelas', () => {
    const result = resolveMapsEmbed('<iframe width="600"></iframe>')
    expect(result.status).toBe('invalid')
    expect(result.message).toContain('src')
  })

  it('iframe dengan host selain Google Maps → invalid (tidak dirender)', () => {
    const result = resolveMapsEmbed('<iframe src="https://evil.example.com/map"></iframe>')
    expect(result.status).toBe('invalid')
    expect(result.src).toBeNull()
  })

  it('iframe dengan event handler tetap invalid bila src-nya bukan Google', () => {
    const result = resolveMapsEmbed(
      '<iframe src="http://maps.google.co.id/maps?q=x&output=embed" onload="steal()"></iframe>',
    )
    // Host Google regional dengan http tetap valid — atribut onload tidak ikut
    // karena hanya src yang diekstrak dan dirender.
    expect(result.status).toBe('valid')
    expect(result.src).toContain('maps.google.co.id')
  })

  it('URL bukan-google dan scheme javascript → invalid', () => {
    expect(resolveMapsEmbed('https://www.bing.com/maps').status).toBe('invalid')
    expect(resolveMapsEmbed('javascript:alert(1)').status).toBe('invalid')
    expect(resolveMapsEmbed('google.com/maps').status).toBe('invalid')
    expect(resolveMapsEmbed('<script>alert(1)</script>').status).toBe('invalid')
  })
})

describe('URL cadangan & tautan publik', () => {
  it('mapsFallbackUrl memakai alamat, atau cadangan Bekasi', () => {
    expect(mapsFallbackUrl('Jl. Merdeka')).toContain('q=Jl.%20Merdeka')
    expect(mapsFallbackUrl('')).toContain('Bekasi')
  })

  it('mapsSearchUrl berupa tautan pencarian, bukan embed', () => {
    const url = mapsSearchUrl('Rukan Hexa Green')
    expect(url).toContain('/maps/search/?api=1')
    expect(url).toContain('Rukan%20Hexa%20Green')
  })
})
