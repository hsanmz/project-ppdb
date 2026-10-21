import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'

import HeroWaveSVG from '../components/sections/HeroWaveSVG'

afterEach(cleanup)

/**
 * HeroWaveSVG memakai warna hex literal, jadi gradien dipasang lewat prop
 * `stopColor` (React memetakannya ke atribut `stop-color`). Menuliskan
 * `stop-color` langsung sebagai atribut JSX memicu peringatan React
 * "Invalid DOM property `stop-color`. Did you mean `stopColor`?" dan membuat
 * atribut tersebut tidak dikelola React. Test ini mengunci bentuk yang benar.
 */
describe('HeroWaveSVG — gradien', () => {
  it('tidak memicu peringatan React "Invalid DOM property"', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<HeroWaveSVG />)
    const messages = err.mock.calls.map((c) => String(c[0]))
    err.mockRestore()

    expect(messages.filter((m) => /Invalid DOM property/i.test(m))).toEqual([])
  })

  it('stop memakai atribut stop-color dengan warna literal yang benar', () => {
    const { container } = render(<HeroWaveSVG />)

    const stops = [...container.querySelectorAll('#lg-hero-wave stop')]
    expect(stops).toHaveLength(2)
    expect(stops[0].getAttribute('stop-color')).toBe('#1A6B47')
    expect(stops[1].getAttribute('stop-color')).toBe('#D4A853')
  })

  it('path gelombang mereferensikan gradien tersebut', () => {
    const { container } = render(<HeroWaveSVG />)

    const fills = [...container.querySelectorAll('path')].map((p) =>
      p.getAttribute('fill'),
    )
    expect(fills).toContain('url(#lg-hero-wave)')
  })
})
