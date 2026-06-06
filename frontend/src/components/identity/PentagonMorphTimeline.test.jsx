import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PentagonMorphTimeline from './PentagonMorphTimeline'

const snapshots = Array.from({ length: 6 }).map((_, i) => ({
  capturedAt: new Date(2026, i, 1).toISOString(),
  axes: { power: 5 + i * 0.3, crimpy: 5 + i * 0.4, dynamic: 5, technical: 5, mobility: 5 },
  archetype: i < 3 ? 'Apprentice' : 'Slabber',
  isNow: i === 5,
}))

describe('PentagonMorphTimeline', () => {
  it('renders 6 cells', () => {
    const { container } = render(<PentagonMorphTimeline snapshots={snapshots} />)
    expect(container.querySelectorAll('[data-morph-cell]').length).toBe(6)
  })

  it('marks the NOW cell', () => {
    const { container } = render(<PentagonMorphTimeline snapshots={snapshots} />)
    expect(container.querySelector('[data-now="true"]')).not.toBeNull()
  })

  it('renders the caption', () => {
    render(<PentagonMorphTimeline snapshots={snapshots} />)
    expect(screen.getByRole('caption')).toBeTruthy()
  })

  it('fires onCellClick when a cell is clicked', () => {
    const onClick = vi.fn()
    render(<PentagonMorphTimeline snapshots={snapshots} onCellClick={onClick} />)
    fireEvent.click(document.querySelector('[data-morph-cell]'))
    expect(onClick).toHaveBeenCalled()
  })
})
