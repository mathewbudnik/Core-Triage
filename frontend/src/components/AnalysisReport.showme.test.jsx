import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AnalysisReport from './AnalysisReport'

// Two flags so the report renders the FindingCard list (the top flag goes to TopTakeaway).
const findings = [
  { ruleId: 'A', name: 'Straight-arm lock', cue: 'cue a', severity: 'important', bodyRegion: 'shoulders-arms', kind: 'flag', instanceCount: 4, confidence: 0.8, isFallProximal: false, timestamps: [1000] },
  { ruleId: 'B', name: 'Banana sag', cue: 'cue b', severity: 'polish', bodyRegion: 'hips-core', kind: 'flag', instanceCount: 1, confidence: 0.7, isFallProximal: false, timestamps: [2000] },
]

describe('AnalysisReport — score + Show me', () => {
  it('renders the directional score card', () => {
    render(<AnalysisReport findings={findings} thumbnails={{}} onJumpTo={() => {}} onFocusFinding={() => {}} />)
    expect(screen.getByText('Movement read')).toBeTruthy()
  })

  it('a finding card Show me calls onFocusFinding with the finding', () => {
    const onFocusFinding = vi.fn()
    render(<AnalysisReport findings={findings} thumbnails={{}} onJumpTo={() => {}} onFocusFinding={onFocusFinding} />)
    const btns = screen.getAllByRole('button', { name: /show me/i })
    fireEvent.click(btns[0])
    expect(onFocusFinding).toHaveBeenCalled()
    expect(onFocusFinding.mock.calls[0][0]).toHaveProperty('ruleId')
  })
})
