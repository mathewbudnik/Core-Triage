import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StreakFlame from './StreakFlame'

describe('StreakFlame', () => {
  it('renders the day count', () => {
    const { container } = render(<StreakFlame days={11} />)
    expect(container.textContent).toContain('11')
  })

  it('applies "warm" data-tier class for days 0-6', () => {
    const { container } = render(<StreakFlame days={3} />)
    expect(container.querySelector('[data-streak-tier="warm"]')).not.toBeNull()
  })

  it('applies "gradient" data-tier for 7-29 days', () => {
    const { container } = render(<StreakFlame days={14} />)
    expect(container.querySelector('[data-streak-tier="gradient"]')).not.toBeNull()
  })

  it('applies "foil" data-tier for 30+ days', () => {
    const { container } = render(<StreakFlame days={42} />)
    expect(container.querySelector('[data-streak-tier="foil"]')).not.toBeNull()
  })

  it('renders an SVG flame', () => {
    const { container } = render(<StreakFlame days={5} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
