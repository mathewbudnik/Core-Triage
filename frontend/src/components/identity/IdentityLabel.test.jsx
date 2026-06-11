import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import IdentityLabel from './IdentityLabel'

// power 9 strongest, crimpy 7 close second → "Powerful & crimp-strong",
// technical 3 is the gap.
const axes = { power: 9, crimpy: 7, dynamic: 6, technical: 3, mobility: 4 }

describe('IdentityLabel', () => {
  it('renders the plain-language title and gap (no proper-noun archetype)', () => {
    render(<IdentityLabel axes={axes} recentSends={[]} />)
    expect(screen.getByText(/Powerful & crimp-strong/)).toBeTruthy()
    expect(screen.getByText(/Technique is your gap/)).toBeTruthy()
    // The old archetype noun must be gone.
    expect(screen.queryByText(/Crimper/)).toBeNull()
  })

  it('appends the behavior phase when sends warrant it', () => {
    const sends = Array(4).fill({ wallAngle: 'overhang', sentAt: new Date().toISOString() })
    render(<IdentityLabel axes={axes} recentSends={sends} />)
    expect(screen.getByText(/cave phase/)).toBeTruthy()
  })

  it('renders with the inline variant (default)', () => {
    render(<IdentityLabel axes={axes} recentSends={[]} />)
    const root = document.querySelector('[data-variant="inline"]')
    expect(root).not.toBeNull()
  })

  it('exposes the plain identity via aria-label', () => {
    render(<IdentityLabel axes={axes} recentSends={[]} />)
    const root = document.querySelector('[data-variant="inline"]')
    expect(root?.getAttribute('aria-label')).toContain('Powerful & crimp-strong')
    expect(root?.getAttribute('aria-label')).toContain('Technique is your gap')
  })

  it('shows the onboarding nudge with no data', () => {
    render(<IdentityLabel axes={{}} recentSends={[]} />)
    expect(screen.getByText(/New climber, log a few sends/)).toBeTruthy()
  })
})
