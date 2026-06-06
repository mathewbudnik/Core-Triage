import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import IdentityLabel from './IdentityLabel'

const axes = { power: 6, crimpy: 8.5, dynamic: 6, technical: 7, mobility: 5 }

describe('IdentityLabel', () => {
  it('composes style + archetype + phase', () => {
    const sends = Array(4).fill({ wallAngle: 'overhang', sentAt: new Date().toISOString() })
    render(<IdentityLabel axes={axes} recentSends={sends} />)
    // "Crimpy Crimper, in the cave phase"
    expect(screen.getByText(/Crimpy/)).toBeTruthy()
    expect(screen.getByText(/Crimper/)).toBeTruthy()
    expect(screen.getByText(/cave phase/)).toBeTruthy()
  })

  it('renders with the inline variant (default)', () => {
    render(<IdentityLabel axes={axes} recentSends={[]} />)
    const root = document.querySelector('[data-variant="inline"]')
    expect(root).not.toBeNull()
  })

  it('exposes composed text via aria-label', () => {
    const sends = Array(4).fill({ wallAngle: 'slab', sentAt: new Date().toISOString() })
    render(<IdentityLabel axes={axes} recentSends={sends} />)
    const root = document.querySelector('[aria-label*="Crimper"]')
    expect(root).not.toBeNull()
  })
})
