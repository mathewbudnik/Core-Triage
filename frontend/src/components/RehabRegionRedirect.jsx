import { Navigate, useParams } from 'react-router-dom'

/**
 * Redirects /rehab/:slug → /recover?region=<Title Case Region>.
 * Preserves bookmarks to specific regions.
 *
 *   /rehab/finger      → /recover?region=Finger
 *   /rehab/lower-back  → /recover?region=Lower%20Back
 */
export default function RehabRegionRedirect() {
  const { region } = useParams()
  if (!region) return <Navigate to="/recover" replace />
  const titleCase = region
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return <Navigate to={`/recover?region=${encodeURIComponent(titleCase)}`} replace />
}
