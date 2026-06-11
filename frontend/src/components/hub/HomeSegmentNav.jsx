import SegmentNav from '../shell/SegmentNav'

const SEGMENTS = [
  { id: 'you', label: 'You' },
  { id: 'today', label: 'Today' },
  { id: 'tools', label: 'Tools' },
]

/**
 * HomeSegmentNav — the floating frosted segment switcher for the mobile Home.
 *
 * Thin wrapper around the generic <SegmentNav> primitive with the Home
 * sections wired in. Mobile-only — desktop lays the sections out in a grid.
 */
export default function HomeSegmentNav({ value, onChange }) {
  return (
    <SegmentNav
      segments={SEGMENTS}
      value={value}
      onChange={onChange}
      layoutId="home-seg-pill"
    />
  )
}
