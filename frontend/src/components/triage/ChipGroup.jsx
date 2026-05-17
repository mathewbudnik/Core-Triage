import Chip from './Chip'

/**
 * Generic chip group used by every section. Single-pick collapses on
 * selection (parent autoscrolls); multi-pick stays open.
 *
 * Props:
 *   options:  Array<{ value, label, Icon? }>
 *   value:    string | string[]    — selected value(s)
 *   multi:    boolean              — true = multi-pick
 *   onChange: (value | value[]) => void
 */
export default function ChipGroup({ options, value, multi = false, onChange }) {
  const selected = multi ? new Set(value || []) : value

  function handleClick(v) {
    if (multi) {
      const next = new Set(selected)
      if (next.has(v)) next.delete(v); else next.add(v)
      onChange([...next])
    } else {
      onChange(v)
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = multi ? selected.has(opt.value) : selected === opt.value
        return (
          <Chip
            key={opt.value}
            active={isActive}
            onClick={() => handleClick(opt.value)}
            ariaLabel={opt.label}
          >
            {opt.label}
          </Chip>
        )
      })}
    </div>
  )
}
