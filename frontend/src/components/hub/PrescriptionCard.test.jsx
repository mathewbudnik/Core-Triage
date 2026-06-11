import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PrescriptionCard from './PrescriptionCard'

const activePresc = {
  id: 7,
  axis: 'technique',
  status: 'active',
  drills: [
    { key: 'silent_feet', name: 'Silent feet', detail: 'Quiet placements', sets: 3, reps: '5 problems', target: 3, done: 3 },
    { key: 'edging_precision', name: 'Edging precision', detail: 'One-touch', sets: 3, reps: '5 problems', target: 3, done: 1 },
    { key: 'slab_smearing', name: 'Slab smearing', detail: 'Hips in', sets: 2, reps: '10 min', target: 3, done: 0 },
  ],
  progress: { current: 4, total: 9, pct: 44 },
}

describe('PrescriptionCard', () => {
  it('renders the active block: axis eyebrow, 3 drills, progress', () => {
    render(<PrescriptionCard prescription={activePresc} gapAxis="technique" hasSends onCheck={() => {}} />)
    expect(screen.getByText(/PRESCRIBED/i)).toBeTruthy()
    expect(screen.getByText(/Technique is your gap/i)).toBeTruthy()
    expect(screen.getByText('Silent feet')).toBeTruthy()
    expect(screen.getByText('Slab smearing')).toBeTruthy()
    expect(screen.getByText(/4 \/ 9|4 of 9/)).toBeTruthy()
  })

  it('calls onCheck with the drill key when an incomplete drill is tapped', () => {
    const onCheck = vi.fn()
    render(<PrescriptionCard prescription={activePresc} gapAxis="technique" hasSends onCheck={onCheck} />)
    fireEvent.click(screen.getByText('Slab smearing'))
    expect(onCheck).toHaveBeenCalledWith('slab_smearing')
  })

  it('renders the balanced rest state when there is a gap-less pentagon', () => {
    render(<PrescriptionCard prescription={null} gapAxis={null} hasSends onCheck={() => {}} />)
    expect(screen.getByText(/Well-rounded/i)).toBeTruthy()
    expect(screen.queryByText('Silent feet')).toBeNull()
  })

  it('renders the empty state for a climber with no sends', () => {
    render(<PrescriptionCard prescription={null} gapAxis={null} hasSends={false} onCheck={() => {}} />)
    expect(screen.getByText(/log a few sends/i)).toBeTruthy()
  })
})
