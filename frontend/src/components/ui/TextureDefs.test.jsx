import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TextureDefs from './TextureDefs'

describe('TextureDefs', () => {
  it('renders all five pattern defs and the foil gradient', () => {
    const { container } = render(<TextureDefs />)
    const defs = container.querySelector('defs')
    expect(defs).not.toBeNull()
    expect(defs.querySelector('#ct-hatch-diag')).not.toBeNull()
    expect(defs.querySelector('#ct-hatch-cross')).not.toBeNull()
    expect(defs.querySelector('#ct-stipple')).not.toBeNull()
    expect(defs.querySelector('#ct-striate')).not.toBeNull()
    expect(defs.querySelector('#ct-ink-blot')).not.toBeNull()
    expect(defs.querySelector('#ct-foil')).not.toBeNull()
  })

  it('renders the SVG with width=0 height=0 (off-screen defs container)', () => {
    const { container } = render(<TextureDefs />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('0')
    expect(svg.getAttribute('height')).toBe('0')
  })
})
