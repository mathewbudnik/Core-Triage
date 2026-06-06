import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Pentagon from './Pentagon'

describe('Pentagon', () => {
  const axes = { power: 5, crimpy: 5, dynamic: 5, technical: 5, mobility: 5 }

  it('renders an SVG with the requested size', () => {
    const { container } = render(<Pentagon axes={axes} size={200} />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('200')
    expect(svg.getAttribute('height')).toBe('200')
  })

  it('renders 5 vertex dots when given real values', () => {
    const { container } = render(<Pentagon axes={axes} />)
    const dots = container.querySelectorAll('circle')
    expect(dots.length).toBeGreaterThanOrEqual(5)
  })

  it('renders the stat polygon', () => {
    const { container } = render(<Pentagon axes={axes} />)
    const polygons = container.querySelectorAll('polygon')
    expect(polygons.length).toBeGreaterThan(0)
  })

  it('renders axis labels when showLabels is true', () => {
    const { container } = render(<Pentagon axes={axes} showLabels />)
    const labels = container.querySelectorAll('text')
    expect(labels.length).toBe(5)
  })

  it('applies tier prop to stroke color via CSS variable', () => {
    const { container } = render(<Pentagon axes={axes} tier="amber" />)
    expect(container.firstChild.getAttribute('data-tier')).toBe('amber')
  })
})
