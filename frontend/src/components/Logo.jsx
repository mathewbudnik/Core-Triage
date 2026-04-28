import { memo } from 'react'

function Logo({ size = 40, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="CoreTriage logo"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: '22%', display: 'block', flexShrink: 0 }}
    />
  )
}

export default memo(Logo)
