import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MovementScoreCard from './MovementScoreCard'

const findings = [
  { ruleId: 'A', kind: 'flag', severity: 'important', bodyRegion: 'shoulders-arms', instanceCount: 4, confidence: 0.8, isFallProximal: false, timestamps: [1000] },
  { ruleId: 'B', kind: 'flag', severity: 'polish', bodyRegion: 'hips-core', instanceCount: 1, confidence: 0.7, isFallProximal: false, timestamps: [2000] },
]

describe('MovementScoreCard', () => {
  it('renders the overall score, a directional label, and a row per present region', () => {
    render(<MovementScoreCard findings={findings} />)
    expect(screen.getByText('Movement read')).toBeTruthy()
    expect(screen.getByText(/directional/i)).toBeTruthy()
    // two regions present -> two region rows (queried by their test ids)
    expect(screen.getAllByTestId('region-row').length).toBe(2)
  })

  it('renders nothing when there are no flags', () => {
    const { container } = render(<MovementScoreCard findings={[{ ruleId: 'W', kind: 'win', bodyRegion: 'hips-core', timestamps: [1] }]} />)
    expect(container.firstChild).toBeNull()
  })
})
