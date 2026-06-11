import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RecoverRecoveringStrip from './RecoverRecoveringStrip'

const serverPhase = { phase: 2, day_in_phase: 5, phase_length: 28, days: 18 }
const last7 = { count: 5, days: [true, true, false, true, true, false, true] }

describe('RecoverRecoveringStrip', () => {
  it('renders the phase caption, streak, and adherence', () => {
    render(<RecoverRecoveringStrip serverPhase={serverPhase} streak={6} last7={last7} />)
    expect(screen.getByText(/Phase 2 of 3/i)).toBeTruthy()
    expect(screen.getByText(/day 5/i)).toBeTruthy()
    expect(screen.getByText('6')).toBeTruthy()        // streak value
    // last7 count: the count node's own text is exactly "5" (the "of 7" lives in
    // a nested span). Match precisely to avoid the phase caption's "day 5".
    expect(
      screen.getByText((_, el) => el?.firstChild?.nodeValue === '5' && el?.tagName === 'SPAN'),
    ).toBeTruthy()
    expect(screen.getByText(/of 7/i)).toBeTruthy()
  })

  it('renders nothing without phase data', () => {
    const { container } = render(<RecoverRecoveringStrip serverPhase={null} streak={0} last7={last7} />)
    expect(container.firstChild).toBeNull()
  })
})
