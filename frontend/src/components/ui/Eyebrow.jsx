/**
 * Wide-tracked tiny uppercase label.
 *
 * Props:
 *   divider:   bool — adds bottom hairline border + padding-bottom
 *   className: extra classes
 *   children:  label text
 */
export default function Eyebrow({ divider = false, className = '', children }) {
  const cls = [
    'ct-eyebrow',
    divider ? 'pb-3 border-b border-ct-hairline' : '',
    className,
  ].filter(Boolean).join(' ')
  return <p className={cls}>{children}</p>
}
