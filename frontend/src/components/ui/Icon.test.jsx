import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Icon from './Icon'

describe('Icon', () => {
  it('renders the requested icon by name', () => {
    const { container } = render(<Icon name="flame" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })

  it('applies size prop as width and height', () => {
    const { container } = render(<Icon name="flame" size={32} />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
  })

  it('warns and renders nothing for unknown icons', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<Icon name="does-not-exist" />)
    expect(container.firstChild).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
