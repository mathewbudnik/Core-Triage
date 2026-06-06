import { ICONS } from './icons'

export default function Icon({ name, size = 16, className = '', ...rest }) {
  const raw = ICONS[name]
  if (!raw) {
    console.warn(`[Icon] Unknown icon: "${name}"`)
    return null
  }
  // Strip outer <svg> tag, keep inner contents; re-render with our props
  const inner = raw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      {...rest}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  )
}
