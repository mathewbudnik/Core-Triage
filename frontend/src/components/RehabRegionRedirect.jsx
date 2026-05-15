import { Navigate, useParams } from 'react-router-dom'

/**
 * Redirects /rehab/:slug → /body?region=<Title Case Region>.
 * Preserves bookmarks to specific regions.
 *
 *   /rehab/finger      → /body?region=Finger
 *   /rehab/lower-back  → /body?region=Lower%20Back
 */
export default function RehabRegionRedirect() {
  const { region } = useParams()
  if (!region) return <Navigate to="/body" replace />
  const titleCase = region
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return <Navigate to={`/body?region=${encodeURIComponent(titleCase)}`} replace />
}
